import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { loadApplicableBatch, stageImport } from "@/lib/imports/stage";
import { readFirstSheet } from "@/lib/imports/excel";
import { parseCodRows } from "@/lib/imports/cod/parse";
import { parseRiderRows } from "@/lib/imports/rider/parse";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns the operating day for a business date, creating it (open) if needed. */
export async function ensureOperatingDay(input: { tenantId: string; businessDate: string }) {
  if (!ISO_DATE.test(input.businessDate)) throw new Error("تاريخ غير صالح");
  const admin = createAdminClient();

  const existing = await admin
    .from("operating_days")
    .select("id, status, business_date")
    .eq("tenant_id", input.tenantId)
    .eq("business_date", input.businessDate)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const created = await admin
    .from("operating_days")
    .insert({ tenant_id: input.tenantId, business_date: input.businessDate })
    .select("id, status, business_date")
    .single();
  if (created.error) throw new Error(`تعذّر إنشاء يوم التشغيل: ${created.error.message}`);
  return created.data;
}

/** Reads only the date printed in a COD file so the form can confirm the business date. */
export async function suggestCodBusinessDate(file: File): Promise<string | null> {
  const sheet = await readFirstSheet(await file.arrayBuffer());
  return parseCodRows(sheet.headers, sheet.rows.slice(0, 5)).suggestedBusinessDate;
}

export async function stageCodImport(input: { tenantId: string; userId: string; file: File; businessDate: string }) {
  const day = await ensureOperatingDay({ tenantId: input.tenantId, businessDate: input.businessDate });
  if (day.status === "closed") throw new Error("يوم التشغيل مُغلق ولا يقبل استيرادًا");

  return stageImport({
    kind: "cod",
    tenantId: input.tenantId,
    userId: input.userId,
    file: input.file,
    operatingDayId: day.id,
    parse: (sheet) => {
      const { rows, missingRequired } = parseCodRows(sheet.headers, sheet.rows);
      if (missingRequired.length) return { rows, fatalError: `أعمدة إلزامية مفقودة: ${missingRequired.join(", ")}` };
      return { rows };
    },
  });
}

export async function stageRiderImport(input: { tenantId: string; userId: string; file: File; businessDate: string }) {
  const day = await ensureOperatingDay({ tenantId: input.tenantId, businessDate: input.businessDate });
  if (day.status === "closed") throw new Error("يوم التشغيل مُغلق ولا يقبل استيرادًا");

  return stageImport({
    kind: "rider",
    tenantId: input.tenantId,
    userId: input.userId,
    file: input.file,
    operatingDayId: day.id,
    parse: (sheet) => {
      const { rows, missingRequired } = parseRiderRows(sheet.headers, sheet.rows);
      if (missingRequired.length) return { rows, fatalError: `أعمدة إلزامية مفقودة: ${missingRequired.join(", ")}` };
      return { rows };
    },
  });
}

export async function applyCodBatch(input: { tenantId: string; userId: string; batchId: string }) {
  await loadApplicableBatch({ tenantId: input.tenantId, batchId: input.batchId, kind: "cod" });
  const admin = createAdminClient();
  const rpc = await admin.rpc("apply_cod_batch", { p_batch_id: input.batchId, p_actor: input.userId });
  if (rpc.error) throw new Error(`فشل التطبيق: ${rpc.error.message}`);
  return rpc.data as { applied: number; skipped: number };
}

export async function applyRiderBatch(input: { tenantId: string; userId: string; batchId: string }) {
  await loadApplicableBatch({ tenantId: input.tenantId, batchId: input.batchId, kind: "rider" });
  const admin = createAdminClient();
  const rpc = await admin.rpc("apply_rider_batch", { p_batch_id: input.batchId, p_actor: input.userId });
  if (rpc.error) throw new Error(`فشل التطبيق: ${rpc.error.message}`);
  return rpc.data as { applied: number; visa_only: number; skipped: number };
}

export async function recordDeposit(input: {
  tenantId: string;
  userId: string;
  caseId: string;
  amount: number;
  method: PaymentMethod | null;
  depositedAt: string | null;
  note: string | null;
}) {
  const admin = createAdminClient();
  // Tenant check happens here; the RPC trusts its caller.
  const { data: found, error } = await admin
    .from("deposit_cases")
    .select("id")
    .eq("id", input.caseId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!found) throw new Error("الحالة غير موجودة");

  const rpc = await admin.rpc("record_deposit", {
    p_case_id: input.caseId,
    p_actor: input.userId,
    p_amount: input.amount,
    p_method: input.method,
    p_deposited_at: input.depositedAt,
    p_note: input.note,
  });
  if (rpc.error) throw new Error(`فشل تسجيل الإيداع: ${rpc.error.message}`);
  return rpc.data as { status: Database["public"]["Enums"]["deposit_status"]; is_late: boolean };
}
