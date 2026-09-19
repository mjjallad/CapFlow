import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { readFirstSheet } from "@/lib/imports/excel";
import { parseCaptainRows } from "./parse";

const ROW_INSERT_CHUNK = 500;

export type StageResult = { batchId: string };

/**
 * Stores the uploaded file, parses it and stages every row (valid or not) in
 * import_rows. Nothing touches captains until applyCaptainsBatch runs.
 */
export async function stageCaptainsImport(input: {
  tenantId: string;
  userId: string;
  file: File;
}): Promise<StageResult> {
  const admin = createAdminClient();
  const buffer = await input.file.arrayBuffer();
  const checksum = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  const batchId = crypto.randomUUID();
  const safeName = input.file.name.replace(/[^\w.\-؀-ۿ]+/g, "_");
  const storagePath = `${input.tenantId}/captains/${batchId}-${safeName}`;

  const upload = await admin.storage.from("imports").upload(storagePath, buffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (upload.error) throw new Error(`فشل حفظ الملف: ${upload.error.message}`);

  const batchInsert = await admin.from("import_batches").insert({
    id: batchId,
    tenant_id: input.tenantId,
    kind: "captains",
    status: "validating",
    original_filename: input.file.name,
    storage_path: storagePath,
    checksum,
    uploaded_by: input.userId,
  });
  if (batchInsert.error) throw new Error(`فشل إنشاء الدفعة: ${batchInsert.error.message}`);

  try {
    const sheet = await readFirstSheet(buffer);
    const { rows, missingRequired } = parseCaptainRows(sheet.headers, sheet.rows);

    if (missingRequired.length > 0) {
      const summary = `أعمدة إلزامية مفقودة: ${missingRequired.join(", ")}`;
      await admin
        .from("import_batches")
        .update({ status: "failed", error_summary: summary, source_rows: rows.length })
        .eq("id", batchId);
      return { batchId };
    }

    for (let i = 0; i < rows.length; i += ROW_INSERT_CHUNK) {
      const chunk = rows.slice(i, i + ROW_INSERT_CHUNK).map((r) => ({
        batch_id: batchId,
        row_number: r.rowNumber,
        raw_data: r.raw as Record<string, never>,
        normalized_data: r.normalized,
        is_valid: r.normalized !== null,
        error_messages: r.errors,
      }));
      const rowsInsert = await admin.from("import_rows").insert(chunk);
      if (rowsInsert.error) throw new Error(`فشل حفظ الصفوف: ${rowsInsert.error.message}`);
    }

    const accepted = rows.filter((r) => r.normalized).length;
    await admin
      .from("import_batches")
      .update({
        status: "needs_review",
        source_rows: rows.length,
        accepted_rows: accepted,
        rejected_rows: rows.length - accepted,
      })
      .eq("id", batchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    await admin.from("import_batches").update({ status: "failed", error_summary: message }).eq("id", batchId);
  }

  return { batchId };
}

export async function applyCaptainsBatch(input: {
  tenantId: string;
  userId: string;
  batchId: string;
}): Promise<{ applied: number; skipped: number }> {
  const admin = createAdminClient();

  // Tenant ownership is checked here, not inside the RPC, so a batch id from
  // another tenant can never be applied through this code path.
  const { data: batch, error } = await admin
    .from("import_batches")
    .select("id, tenant_id, kind, status")
    .eq("id", input.batchId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!batch) throw new Error("الدفعة غير موجودة");
  if (batch.status !== "needs_review") throw new Error("هذه الدفعة لا يمكن تطبيقها في حالتها الحالية");

  const rpc = await admin.rpc("apply_captains_batch", { p_batch_id: input.batchId, p_actor: input.userId });
  if (rpc.error) throw new Error(`فشل التطبيق: ${rpc.error.message}`);

  return rpc.data as { applied: number; skipped: number };
}
