"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import {
  applyCodBatch,
  applyRiderBatch,
  stageCodImport,
  stageRiderImport,
  suggestCodBusinessDate,
} from "@/lib/days/service";

export type DailyUploadState = { error?: string; suggestedDate?: string };

const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm", ".csv"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadDailyFile(_prev: DailyUploadState, formData: FormData): Promise<DailyUploadState> {
  const ctx = await requireTenant("days.import");
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");
  const businessDate = String(formData.get("businessDate") ?? "");
  const confirmDate = formData.get("confirmDate") === "on";

  if (!(file instanceof File) || file.size === 0) return { error: "اختر الملف أولًا." };
  if (!ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))
    return { error: "الملف يجب أن يكون بصيغة .xlsx" };
  if (file.size > MAX_BYTES) return { error: "حجم الملف يتجاوز 10 ميغابايت." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) return { error: "اختر تاريخ يوم التشغيل." };
  if (kind !== "cod" && kind !== "rider") return { error: "نوع الملف غير معروف." };

  let batchId: string;
  try {
    if (kind === "cod") {
      // The COD file is dated with the pull date (business date + 1). Refuse a
      // mismatch once so a wrong day is never imported by accident.
      const suggested = await suggestCodBusinessDate(file);
      if (suggested && suggested !== businessDate && !confirmDate) {
        return {
          error: `تاريخ الملف يشير إلى يوم ${suggested} بينما اخترت ${businessDate}. صحّح التاريخ أو أكّد الاستيراد لليوم المختار.`,
          suggestedDate: suggested,
        };
      }
      ({ batchId } = await stageCodImport({ tenantId: ctx.tenantId, userId: ctx.userId, file, businessDate }));
    } else {
      ({ batchId } = await stageRiderImport({ tenantId: ctx.tenantId, userId: ctx.userId, file, businessDate }));
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر معالجة الملف." };
  }

  redirect(`/days/import/${batchId}`);
}

export type DailyApplyState = { error?: string; result?: Record<string, number>; businessDate?: string };

export async function applyDailyBatch(_prev: DailyApplyState, formData: FormData): Promise<DailyApplyState> {
  const ctx = await requireTenant("days.import");
  const batchId = String(formData.get("batchId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const businessDate = String(formData.get("businessDate") ?? "");
  if (!batchId) return { error: "معرّف الدفعة مفقود." };

  try {
    const result =
      kind === "cod"
        ? await applyCodBatch({ tenantId: ctx.tenantId, userId: ctx.userId, batchId })
        : await applyRiderBatch({ tenantId: ctx.tenantId, userId: ctx.userId, batchId });
    revalidatePath("/days");
    revalidatePath(`/days/${businessDate}`);
    revalidatePath(`/days/import/${batchId}`);
    return { result, businessDate };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر تطبيق الدفعة." };
  }
}
