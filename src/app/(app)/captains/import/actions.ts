"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { applyCaptainsBatch, stageCaptainsImport } from "@/lib/imports/captains/service";

export type UploadState = { error?: string };

const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm", ".csv"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadCaptainsFile(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const ctx = await requireTenant("captains.import");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { error: "اختر ملف Excel أولًا." };
  if (!ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))
    return { error: "الملف يجب أن يكون بصيغة .xlsx" };
  if (file.size > MAX_BYTES) return { error: "حجم الملف يتجاوز 10 ميغابايت." };

  let batchId: string;
  try {
    ({ batchId } = await stageCaptainsImport({ tenantId: ctx.tenantId, userId: ctx.userId, file }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر معالجة الملف." };
  }

  redirect(`/captains/import/${batchId}`);
}

export type ApplyState = { error?: string; applied?: number; skipped?: number };

export async function applyCaptainsImport(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const ctx = await requireTenant("captains.import");
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return { error: "معرّف الدفعة مفقود." };

  try {
    const result = await applyCaptainsBatch({ tenantId: ctx.tenantId, userId: ctx.userId, batchId });
    revalidatePath("/captains");
    revalidatePath(`/captains/import/${batchId}`);
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر تطبيق الدفعة." };
  }
}
