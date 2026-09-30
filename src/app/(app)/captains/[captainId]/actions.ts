"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import {
  addCaptainDocument,
  deleteCaptainDocument,
  setCaptainPhoto,
  updateCaptain,
  ReturnDateRequired,
  type Referrer,
} from "@/lib/captains/service";
import { deleteVehicle, saveVehicle } from "@/lib/captains/vehicles";
import { isDamageKind, type DamageMark } from "@/components/damage";
import { isDeductionMode } from "@/components/deduction";
import { VEHICLE_LABELS } from "@/components/vehicle";
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

export type SaveState = {
  error?: string;
  saved?: boolean;
  /** Names of the company vehicles whose handover date the form must ask for. */
  needsReturnDate?: string[];
};

/** The referrer rows travel as JSON from the client component. */
function parseReferrers(raw: string): Referrer[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
      .map((r) => ({
        name: String(r.name ?? ""),
        relation: String(r.relation ?? ""),
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
  const modeRaw = String(formData.get("deduction_mode") ?? "none");
  if (!Number.isFinite(rate) || rate < 0) return { error: "نسبة الخصم غير صالحة." };

  const vehicleKinds = formData
    .getAll("vehicle_kinds")
    .map(String)
    .filter((v): v is VehicleKind => VEHICLES.includes(v as VehicleKind));

  const activatedOn = text("activated_on");
  if (activatedOn && !/^\d{4}-\d{2}-\d{2}$/.test(activatedOn)) return { error: "تاريخ التفعيل غير صالح." };

  const returnedOn = text("company_vehicle_returned_on");
  if (returnedOn && !/^\d{4}-\d{2}-\d{2}$/.test(returnedOn)) return { error: "تاريخ تسليم المركبة غير صالح." };

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
        branch_id: text("branch_id"),
        status: STATUSES.includes(statusRaw as CaptainStatus) ? (statusRaw as CaptainStatus) : "active",
        deduction_rate: rate,
        deduction_mode: isDeductionMode(modeRaw) ? modeRaw : "none",
        contract_file_number: text("contract_file_number"),
        activated_on: activatedOn,
        notes: text("notes"),
        company_vehicle_returned_on: returnedOn,
      },
    });
    revalidatePath(`/captains/${captainId}`);
    revalidatePath("/captains");
    return { saved: true };
  } catch (err) {
    if (err instanceof ReturnDateRequired) {
      return { needsReturnDate: err.kinds.map((kind) => VEHICLE_LABELS[kind]) };
    }
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

export type VehicleState = { error?: string; saved?: boolean };

/** The condition-sketch marks travel as JSON from the client component. */
function parseDamageMarks(raw: string): DamageMark[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
      .map((m) => ({
        x: clamp(Number(m.x)),
        y: clamp(Number(m.y)),
        kind: isDamageKind(m.kind) ? m.kind : "other",
        note: String(m.note ?? ""),
      }));
  } catch {
    return [];
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

const COMPANY_KINDS: VehicleKind[] = ["company_car", "company_scooter"];

export async function saveVehicleAction(_prev: VehicleState, formData: FormData): Promise<VehicleState> {
  const ctx = await requireTenant("captains.manage");
  const captainId = String(formData.get("captainId") ?? "");
  if (!captainId) return { error: "الكابتن مفقود." };

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? null : value;
  };
  const number = (key: string) => {
    const raw = text(key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  };

  const kindRaw = String(formData.get("kind") ?? "");
  const kind = COMPANY_KINDS.includes(kindRaw as VehicleKind) ? (kindRaw as VehicleKind) : "company_car";
  const madeYear = number("made_year");
  const odometer = number("odometer_km");
  const receivedOn = text("received_on");
  const inspectedOn = text("inspected_on");

  if (Number.isNaN(madeYear) || (madeYear !== null && (madeYear < 1950 || madeYear > 2100)))
    return { error: "سنة الصنع غير صالحة." };
  if (Number.isNaN(odometer) || (odometer !== null && odometer < 0)) return { error: "عداد المشي غير صالح." };
  if (receivedOn && !/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) return { error: "تاريخ الاستلام غير صالح." };
  if (inspectedOn && !/^\d{4}-\d{2}-\d{2}$/.test(inspectedOn)) return { error: "تاريخ الكشف غير صالح." };

  try {
    await saveVehicle({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      captainId,
      vehicle: {
        id: text("vehicleId"),
        kind,
        model: text("model"),
        plate_number: text("plate_number"),
        made_year: madeYear,
        color: text("color"),
        odometer_km: odometer,
        received_on: receivedOn,
        inspected_on: inspectedOn,
        damage_marks: parseDamageMarks(String(formData.get("damage_marks") ?? "")),
        notes: text("notes"),
      },
    });
    revalidatePath(`/captains/${captainId}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر حفظ المركبة." };
  }
}

export async function removeVehicle(_prev: VehicleState, formData: FormData): Promise<VehicleState> {
  const ctx = await requireTenant("captains.manage");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  if (!vehicleId) return { error: "المركبة مفقودة." };

  try {
    const captainId = await deleteVehicle({ tenantId: ctx.tenantId, userId: ctx.userId, vehicleId });
    if (captainId) revalidatePath(`/captains/${captainId}`);
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر حذف المركبة." };
  }
}
