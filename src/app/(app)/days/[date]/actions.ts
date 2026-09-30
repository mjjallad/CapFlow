"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { recordDeposit, setSupervisorNote } from "@/lib/days/service";
import type { Database } from "@/lib/supabase/database.types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];
const METHODS: PaymentMethod[] = ["cash", "visa", "none", "unknown"];

export type DepositFormState = { error?: string; ok?: boolean; status?: string; isLate?: boolean };

export async function submitDeposit(_prev: DepositFormState, formData: FormData): Promise<DepositFormState> {
  const ctx = await requireTenant("deposits.record");
  const caseId = String(formData.get("caseId") ?? "");
  const businessDate = String(formData.get("businessDate") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const methodRaw = String(formData.get("method") ?? "");
  const depositedAtRaw = String(formData.get("depositedAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const payoutRaw = String(formData.get("payoutDeduction") ?? "").trim().replace(",", ".");

  const amount = Number(amountRaw);
  if (!caseId) return { error: "الحالة مفقودة." };
  if (!amountRaw || !Number.isFinite(amount) || amount < 0) return { error: "أدخل مبلغًا صالحًا." };
  const method = METHODS.includes(methodRaw as PaymentMethod) ? (methodRaw as PaymentMethod) : null;

  let payoutDeduction: number | null = null;
  if (payoutRaw) {
    payoutDeduction = Number(payoutRaw);
    if (!Number.isFinite(payoutDeduction) || payoutDeduction < 0) return { error: "خصم المدفوعات غير صالح." };
  }

  // datetime-local has no zone; interpret it in the tenant's timezone.
  let depositedAt: string | null = null;
  if (depositedAtRaw) {
    const local = new Date(depositedAtRaw);
    if (Number.isNaN(local.getTime())) return { error: "وقت الإيداع غير صالح." };
    depositedAt = toTenantInstant(depositedAtRaw, ctx.membership.tenant.timezone);
  }

  try {
    const result = await recordDeposit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      caseId,
      amount,
      method,
      depositedAt,
      note: note || null,
      payoutDeduction,
    });
    revalidatePath(`/days/${businessDate}`);
    revalidatePath("/days");
    return { ok: true, status: result.status, isLate: result.is_late };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر تسجيل الإيداع." };
  }
}

/** Converts "YYYY-MM-DDTHH:mm" typed in the tenant's zone to an ISO instant. */
function toTenantInstant(local: string, timeZone: string): string {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  // Find the UTC instant whose wall-clock time in `timeZone` matches the input.
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asIfUtc - guess)).toISOString();
}

export type NoteState = { error?: string; saved?: boolean };

export async function submitSupervisorNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const ctx = await requireTenant("deposits.note");
  const caseId = String(formData.get("caseId") ?? "");
  const businessDate = String(formData.get("businessDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!caseId) return { error: "الحالة مفقودة." };

  try {
    await setSupervisorNote({ tenantId: ctx.tenantId, userId: ctx.userId, caseId, note: note || null });
    revalidatePath(`/days/${businessDate}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر حفظ الملاحظة." };
  }
}
