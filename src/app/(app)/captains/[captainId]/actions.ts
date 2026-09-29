"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import {
  addCaptainDocument,
  deleteCaptainDocument,
  setCaptainPhoto,
  updateCaptain,
  type Referrer,
} from "@/lib/captains/service";
import type { Database } from "@/lib/supabase/database.types";

type CaptainStatus = Database["public"]["Enums"]["captain_status"];
type VehicleKind = Database["public"]["Enums"]["vehicle_kind"];
type DocumentKind = Database["public"]["Enums"]["captain_document_kind"];

const STATUSES: CaptainStatus[] = ["active", "inactive", "suspended"];
const VEHICLES: VehicleKind[] = ["own_car", "own_scooter", "company_car", "company_scooter"];
const DOCUMENT_KINDS: DocumentKind[] = ["contract", "national_id", "license", "vehicle", "other"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type SaveState = { error?: string; saved?: boolean };

/** The referrer rows travel as JSON from the client component. */
function parseReferrers(raw: string): Referrer[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
      .map((r) => ({
        name: String(r.name ?? ""),
        national_id: String(r.national_id ?? ""),
        phone: String(r.phone ?? ""),
      }));
  } catch {
    return [];
  }
}

export async function saveCaptain(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const ctx = await requireTenant("captains.manage");
  const captainId = String(formData.get("captainId") ?? "");
  if (!captainId) return { error: "الكابتن مفقود." };

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? null : value;
  };
  const statusRaw = String(formData.get("status") ?? "");
  const rate = Number(String(formData.get("deduction_rate") ?? "0").replace(",", "."));
  if (!Number.isFinite(rate) || rate < 0) return { error: "نسبة الخصم غير صالحة." };

  const vehicleKinds = formData
    .getAll("vehicle_kinds")
    .map(String)
    .filter((v): v is VehicleKind => VEHICLES.includes(v as VehicleKind));

  const activatedOn = text("activated_on");
  if (activatedOn && !/^\d{4}-\d{2}-\d{2}$/.test(activatedOn)) return { error: "تاريخ التفعيل غير صالح." };

  try {
    await updateCaptain({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      captainId,
      edit: {
        full_name: String(formData.get("full_name") ?? "").trim(),
        phone: text("phone"),
        phone_secondary: text("phone_secondary"),
        external_user_id: text("external_user_id"),
        national_id: text("national_id"),
        referrers: parseReferrers(String(formData.get("referrers") ?? "")),
        team_id: text("team_id"),
        vehicle_kinds: vehicleKinds,
        whatsapp_group: text("whatsapp_group"),
        city_id: text("city_id"),
        status: STATUSES.includes(statusRaw as CaptainStatus) ? (statusRaw as CaptainStatus) : "active",
        deduction_rate: rate,
        contract_file_number: text("contract_file_number"),
        activated_on: activatedOn,
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
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return { error: "الصورة يجب أن تكون JPG أو PNG أو WEBP." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "حجم الصورة يتجاوز 5 ميغابايت." };

  try {
    await setCaptainPhoto({ tenantId: ctx.tenantId, userId: ctx.userId, captainId, file });
    revalidatePath(`/captains/${captainId}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر رفع الصورة." };
  }
}

export type DocumentState = { error?: string; saved?: boolean };

export async function uploadCaptainDocument(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const ctx = await requireTenant("captains.manage");
  const captainId = String(formData.get("captainId") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("document");

  if (!captainId) return { error: "الكابتن مفقود." };
  if (!(file instanceof File) || file.size === 0) return { error: "اختر ملفًا." };
  if (!DOCUMENT_TYPES.includes(file.type)) return { error: "الملف يجب أن يكون صورة أو PDF." };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "حجم الملف يتجاوز 10 ميغابايت." };

  try {
    await addCaptainDocument({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      captainId,
      kind: DOCUMENT_KINDS.includes(kindRaw as DocumentKind) ? (kindRaw as DocumentKind) : "contract",
      title: title || null,
      file,
    });
    revalidatePath(`/captains/${captainId}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر رفع الملف." };
  }
}

export async function removeCaptainDocument(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const ctx = await requireTenant("captains.manage");
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { error: "الملف مفقود." };

  try {
    const captainId = await deleteCaptainDocument({ tenantId: ctx.tenantId, userId: ctx.userId, documentId });
    revalidatePath(`/captains/${captainId}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر حذف الملف." };
  }
}
