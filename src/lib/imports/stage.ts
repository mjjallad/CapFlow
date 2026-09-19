import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { readFirstSheet, type SheetTable } from "./excel";

type ImportKind = Database["public"]["Enums"]["import_kind"];

const ROW_INSERT_CHUNK = 500;

export type StagedRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: Record<string, Json | undefined> | null;
  errors: string[];
};

export type ParseOutcome = {
  rows: StagedRow[];
  /** Human-readable reason the whole file is unusable (missing columns, etc.). */
  fatalError?: string;
};

/**
 * Stores the uploaded file, parses it with `parse` and stages every row in
 * import_rows. Nothing touches business tables until the batch is applied.
 */
export async function stageImport(input: {
  kind: ImportKind;
  tenantId: string;
  userId: string;
  file: File;
  operatingDayId?: string;
  parse: (sheet: SheetTable) => ParseOutcome;
}): Promise<{ batchId: string }> {
  const admin = createAdminClient();
  const buffer = await input.file.arrayBuffer();
  const checksum = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  const batchId = crypto.randomUUID();
  const safeName = input.file.name.replace(/[^\w.\-؀-ۿ]+/g, "_");
  const storagePath = `${input.tenantId}/${input.kind}/${batchId}-${safeName}`;

  const upload = await admin.storage.from("imports").upload(storagePath, buffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (upload.error) throw new Error(`فشل حفظ الملف: ${upload.error.message}`);

  const batchInsert = await admin.from("import_batches").insert({
    id: batchId,
    tenant_id: input.tenantId,
    kind: input.kind,
    status: "validating",
    original_filename: input.file.name,
    storage_path: storagePath,
    checksum,
    uploaded_by: input.userId,
    operating_day_id: input.operatingDayId ?? null,
  });
  if (batchInsert.error) throw new Error(`فشل إنشاء الدفعة: ${batchInsert.error.message}`);

  try {
    const sheet = await readFirstSheet(buffer);
    const { rows, fatalError } = input.parse(sheet);

    if (fatalError) {
      await admin
        .from("import_batches")
        .update({ status: "failed", error_summary: fatalError, source_rows: rows.length })
        .eq("id", batchId);
      return { batchId };
    }

    for (let i = 0; i < rows.length; i += ROW_INSERT_CHUNK) {
      const chunk = rows.slice(i, i + ROW_INSERT_CHUNK).map((r) => ({
        batch_id: batchId,
        row_number: r.rowNumber,
        raw_data: r.raw as Json,
        normalized_data: r.normalized as Json,
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

/** Loads a batch the caller's tenant owns and checks it is ready to apply. */
export async function loadApplicableBatch(input: { tenantId: string; batchId: string; kind: ImportKind }) {
  const admin = createAdminClient();
  const { data: batch, error } = await admin
    .from("import_batches")
    .select("id, tenant_id, kind, status, operating_day_id")
    .eq("id", input.batchId)
    .eq("tenant_id", input.tenantId)
    .eq("kind", input.kind)
    .maybeSingle();
  if (error) throw error;
  if (!batch) throw new Error("الدفعة غير موجودة");
  if (batch.status !== "needs_review") throw new Error("هذه الدفعة لا يمكن تطبيقها في حالتها الحالية");
  return batch;
}
