import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { normalizeJordanPhone } from "@/lib/phone";

type CaptainStatus = Database["public"]["Enums"]["captain_status"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];

const PHOTO_BUCKET = "captain-photos";
const PHOTO_URL_TTL = 60 * 10; // seconds

export type CaptainEdit = {
  full_name: string;
  phone: string | null;
  external_user_id: string | null;
  national_id: string | null;
  team_id: string | null;
  vehicle_type: VehicleType | null;
  whatsapp_group: string | null;
  service_center_name: string | null;
  city_id: string | null;
  status: CaptainStatus;
  deduction_rate: number;
  notes: string | null;
};

/** A short-lived link to the captain's photo, or null when there is none. */
export async function photoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_URL_TTL);
  return data?.signedUrl ?? null;
}

function clean(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text === "" ? null : text;
}

export async function updateCaptain(input: {
  tenantId: string;
  userId: string;
  captainId: string;
  edit: CaptainEdit;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: before, error: readErr } = await admin
    .from("captains")
    .select("*")
    .eq("id", input.captainId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!before) throw new Error("الكابتن غير موجود");

  const phone = input.edit.phone ? normalizeJordanPhone(input.edit.phone) : null;
  if (input.edit.phone && !phone) throw new Error("رقم الهاتف غير صالح");

  const patch = {
    full_name: input.edit.full_name.trim(),
    phone,
    external_user_id: clean(input.edit.external_user_id),
    national_id: clean(input.edit.national_id),
    team_id: input.edit.team_id,
    vehicle_type: input.edit.vehicle_type,
    whatsapp_group: clean(input.edit.whatsapp_group),
    service_center_name: clean(input.edit.service_center_name),
    city_id: input.edit.city_id,
    status: input.edit.status,
    deduction_rate: input.edit.deduction_rate,
    notes: clean(input.edit.notes),
    // An edited captain has been looked at, so the review flag can go.
    needs_review: false,
    review_note: null,
  };

  if (!patch.full_name) throw new Error("الاسم مطلوب");

  const { error } = await admin.from("captains").update(patch).eq("id", input.captainId);
  if (error) {
    if (error.code === "23505") {
      throw new Error("رقم الهاتف أو المعرّف مستخدم لكابتن آخر");
    }
    throw new Error(`تعذّر الحفظ: ${error.message}`);
  }

  // Only the fields that actually moved go into the audit entry.
  const previous = before as Record<string, Json>;
  const changed = Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => previous[key] !== value),
  ) as Record<string, Json>;
  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    actor_user_id: input.userId,
    action: "captain.updated",
    module: "captains",
    operation_context: "dashboard",
    entity_type: "captain",
    entity_id: input.captainId,
    before_data: Object.fromEntries(Object.keys(changed).map((key) => [key, previous[key]])),
    after_data: changed,
  });
}

export async function setCaptainPhoto(input: {
  tenantId: string;
  userId: string;
  captainId: string;
  file: File;
}): Promise<string> {
  const admin = createAdminClient();

  const { data: captain, error: readErr } = await admin
    .from("captains")
    .select("id, photo_path")
    .eq("id", input.captainId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!captain) throw new Error("الكابتن غير موجود");

  const ext = input.file.type === "image/png" ? "png" : input.file.type === "image/webp" ? "webp" : "jpg";
  const path = `${input.tenantId}/${input.captainId}/${Date.now()}.${ext}`;

  const upload = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, await input.file.arrayBuffer(), { contentType: input.file.type, upsert: false });
  if (upload.error) throw new Error(`تعذّر رفع الصورة: ${upload.error.message}`);

  const { error } = await admin.from("captains").update({ photo_path: path }).eq("id", input.captainId);
  if (error) throw new Error(`تعذّر حفظ الصورة: ${error.message}`);

  // Replacing a photo leaves the old object behind; drop it so the bucket stays tidy.
  if (captain.photo_path) await admin.storage.from(PHOTO_BUCKET).remove([captain.photo_path]);

  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    actor_user_id: input.userId,
    action: "captain.photo_updated",
    module: "captains",
    operation_context: "dashboard",
    entity_type: "captain",
    entity_id: input.captainId,
    after_data: { photo_path: path },
  });

  return path;
}
