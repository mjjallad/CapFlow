"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { setCaptainPhoto, updateCaptain } from "@/lib/captains/service";
import type { Database } from "@/lib/supabase/database.types";

type CaptainStatus = Database["public"]["Enums"]["captain_status"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];

const STATUSES: CaptainStatus[] = ["active", "inactive", "suspended"];
const VEHICLES: VehicleType[] = ["company_car", "company_scooter"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type SaveState = { error?: string; saved?: boolean };

export async function saveCaptain(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const ctx = await requireTenant("captains.manage");
  const captainId = String(formData.get("captainId") ?? "");
  if (!captainId) return { error: "الكابتن مفقود." };

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? null : value;
  };
  const statusRaw = String(formData.get("status") ?? "");
  const vehicleRaw = String(formData.get("vehicle_type") ?? "");
  const rateRaw = String(formData.get("deduction_rate") ?? "0").replace(",", ".");
  const rate = Number(rateRaw);

  if (!Number.isFinite(rate) || rate < 0) return { error: "نسبة الخصم غير صالحة." };

  try {
    await updateCaptain({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      captainId,
      edit: {
        full_name: String(formData.get("full_name") ?? "").trim(),
        phone: text("phone"),
        external_user_id: text("external_user_id"),
        national_id: text("national_id"),
        team_id: text("team_id"),
        vehicle_type: VEHICLES.includes(vehicleRaw as VehicleType) ? (vehicleRaw as VehicleType) : null,
        whatsapp_group: text("whatsapp_group"),
        service_center_name: text("service_center_name"),
        city_id: text("city_id"),
        status: STATUSES.includes(statusRaw as CaptainStatus) ? (statusRaw as CaptainStatus) : "active",
        deduction_rate: rate,
        notes: text("notes"),
      },
    });
    revalidatePath(`/captains/${captainId}`);
    revalidatePath("/captains");
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر الحفظ." };
  }
}

export type PhotoState = { error?: string; saved?: boolean };

export async function uploadCaptainPhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const ctx = await requireTenant("captains.manage");
  const captainId = String(formData.get("captainId") ?? "");
  const file = formData.get("photo");

  if (!captainId) return { error: "الكابتن مفقود." };
  if (!(file instanceof File) || file.size === 0) return { error: "اختر صورة." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { error: "الصورة يجب أن تكون JPG أو PNG أو WEBP." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "حجم الصورة يتجاوز 5 ميغابايت." };

  try {
    await setCaptainPhoto({ tenantId: ctx.tenantId, userId: ctx.userId, captainId, file });
    revalidatePath(`/captains/${captainId}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر رفع الصورة." };
  }
}
