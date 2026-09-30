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
  suggestRiderBusinessDate,
} from "@/lib/days/service";

export type DailyUploadState = { error?: string; suggestedDate?: string };

const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm", ".csv"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadDailyFile(_prev: DailyUploadState, formData: FormData): Promise<DailyUploadState> {
  const ctx = await requireTenant("days.import");
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");
  const picked = String(formData.get("businessDate") ?? "");
  // What the form offered before anyone touched it. An untouched date must not
  // outrank the day the file states for itself — that is how a COD and a Rider
  // report for the same day once landed on two different days.
  const offered = String(formData.get("offeredDate") ?? "");
  const confirmDate = formData.get("confirmDate") === "on";

  if (!(file instanceof File) || file.size === 0) return { error: "اختر الملف أولًا." };
  if (!ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))
    return { error: "الملف يجب أن يكون بصيغة .xlsx" };
  if (file.size > MAX_BYTES) return { error: "حجم الملف يتجاوز 10 ميغابايت." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(picked)) return { error: "اختر تاريخ يوم التشغيل." };
  if (kind !== "cod" && kind !== "rider") return { error: "نوع الملف غير معروف." };

  let batchId: string;
  try {
    // Each report states its own day: COD from its Date column minus one, Rider
    // from the pull stamp in its filename minus the platform's shift age.
    let stated: string | null;
    let evidence = "";

    if (kind === "cod") {
      stated = await suggestCodBusinessDate(file);
    } else {
      const rider = await suggestRiderBusinessDate(file);
      stated = rider.businessDate;
      if (rider.daysSinceLastShift !== null) {
        evidence = ` الملف سُحب يوم ${rider.pulledOn} ويقول إن آخر شفت كان قبل ${rider.daysSinceLastShift} يومًا.`;
      }
    }

    const businessDate = stated && picked === offered ? stated : picked;

    if (stated && stated !== businessDate && !confirmDate) {
      return {
        error: `الملف يخص يوم ${stated} بينما اخترت ${businessDate}.${evidence} صحّح التاريخ أو أكّد الاستيراد لليوم المختار.`,
        suggestedDate: stated,
      };
    }

    ({ batchId } =
      kind === "cod"
        ? await stageCodImport({ tenantId: ctx.tenantId, userId: ctx.userId, file, businessDate })
        : await stageRiderImport({ tenantId: ctx.tenantId, userId: ctx.userId, file, businessDate }));
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
