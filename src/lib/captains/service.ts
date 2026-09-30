import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { normalizeJordanPhone } from "@/lib/phone";

type CaptainStatus = Database["public"]["Enums"]["captain_status"];
type VehicleKind = Database["public"]["Enums"]["vehicle_kind"];
type DocumentKind = Database["public"]["Enums"]["captain_document_kind"];

const PHOTO_BUCKET = "captain-photos";
const DOCUMENT_BUCKET = "captain-documents";
const SIGNED_URL_TTL = 60 * 10; // seconds

/** A person who vouches for the captain: their name, ID number and phone. */
export type Referrer = { name: string; relation: string; phone: string };

export type CaptainEdit = {
  full_name: string;
  phone: string | null;
  phone_secondary: string | null;
  external_user_id: string | null;
  national_id: string | null;
  referrers: Referrer[];
  team_id: string | null;
  vehicle_kinds: VehicleKind[];
  whatsapp_group: string | null;
  city_id: string | null;
  branch_id: string | null;
  status: CaptainStatus;
  deduction_rate: number;
  deduction_mode: Database["public"]["Enums"]["deduction_mode"];
  contract_file_number: string | null;
  activated_on: string | null;
  notes: string | null;
  /** Required when the captain is moving off a company vehicle. */
  company_vehicle_returned_on: string | null;
};

/** Thrown when a company vehicle is being dropped without saying when it came back. */
export class ReturnDateRequired extends Error {
  constructor(public readonly kinds: VehicleKind[]) {
    super("تاريخ تسليم مركبة الشركة مطلوب");
    this.name = "ReturnDateRequired";
  }
}

export type CaptainDocument = {
  id: string;
  kind: DocumentKind;
  title: string | null;
  originalFilename: string | null;
  mimeType: string;
  createdAt: string;
  url: string | null;
};

async function signedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

/** A short-lived link to the captain's photo, or null when there is none. */
export function photoUrl(path: string | null): Promise<string | null> {
  return signedUrl(PHOTO_BUCKET, path);
}

export async function listDocuments(input: { tenantId: string; captainId: string }): Promise<CaptainDocument[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("captain_documents")
    .select("id, kind, title, original_filename, mime_type, storage_path, created_at")
    .eq("tenant_id", input.tenantId)
    .eq("captain_id", input.captainId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (d) => ({
      id: d.id,
      kind: d.kind,
      title: d.title,
      originalFilename: d.original_filename,
      mimeType: d.mime_type,
      createdAt: d.created_at,
      url: await signedUrl(DOCUMENT_BUCKET, d.storage_path),
    })),
  );
}

function isCompanyKind(kind: VehicleKind): boolean {
  return kind === "company_car" || kind === "company_scooter";
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

  const phoneSecondary = input.edit.phone_secondary ? normalizeJordanPhone(input.edit.phone_secondary) : null;
  if (input.edit.phone_secondary && !phoneSecondary) throw new Error("رقم الهاتف الثاني غير صالح");
  if (phone && phoneSecondary && phone === phoneSecondary) throw new Error("رقما الهاتف متطابقان");

  // A referrer's phone goes through the same normalization as a captain's, but a
  // number we cannot parse is kept as typed rather than rejecting the whole save.
  const referrers = input.edit.referrers
    .map((r) => ({
      name: r.name.trim(),
      relation: r.relation.trim(),
      phone: normalizeJordanPhone(r.phone) ?? r.phone.trim(),
    }))
    .filter((r) => r.name || r.relation || r.phone);

  const patch = {
    full_name: input.edit.full_name.trim(),
    phone,
    phone_secondary: phoneSecondary,
    external_user_id: clean(input.edit.external_user_id),
    national_id: clean(input.edit.national_id),
    referrers: referrers as unknown as Json,
    team_id: input.edit.team_id,
    vehicle_kinds: input.edit.vehicle_kinds,
    whatsapp_group: clean(input.edit.whatsapp_group),
    city_id: input.edit.city_id,
    branch_id: input.edit.branch_id,
    status: input.edit.status,
    deduction_rate: input.edit.deduction_mode === "per_order" ? input.edit.deduction_rate : 0,
    deduction_mode: input.edit.deduction_mode,
    contract_file_number: clean(input.edit.contract_file_number),
    activated_on: clean(input.edit.activated_on),
    notes: clean(input.edit.notes),
    // An edited captain has been looked at, so the review flag can go.
    needs_review: false,
    review_note: null,
  };

  if (!patch.full_name) throw new Error("الاسم مطلوب");

  // Moving off a company vehicle has to say when it was handed back, and the
  // vehicle is released rather than deleted so its history survives.
  const droppedCompanyKinds = (before.vehicle_kinds ?? []).filter(
    (kind) => isCompanyKind(kind) && !input.edit.vehicle_kinds.includes(kind),
  );
  if (droppedCompanyKinds.length > 0 && !input.edit.company_vehicle_returned_on) {
    throw new ReturnDateRequired(droppedCompanyKinds);
  }

  const { error } = await admin.from("captains").update(patch).eq("id", input.captainId);
  if (error) {
    if (error.code === "23505") throw new Error("رقم الهاتف أو المعرّف مستخدم لكابتن آخر");
    throw new Error(`تعذّر الحفظ: ${error.message}`);
  }

  // Only the fields that actually moved go into the audit entry.
  const previous = before as Record<string, Json>;
  const changed = Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value)),
  ) as Record<string, Json>;

  if (droppedCompanyKinds.length > 0) {
    const returnedOn = input.edit.company_vehicle_returned_on!;
    const { error: releaseError } = await admin
      .from("vehicles")
      .update({ captain_id: null, returned_on: returnedOn })
      .eq("tenant_id", input.tenantId)
      .eq("captain_id", input.captainId)
      .in("kind", droppedCompanyKinds);
    if (releaseError) throw new Error(`تعذّر تسليم المركبة: ${releaseError.message}`);

    await admin.from("audit_logs").insert({
      tenant_id: input.tenantId,
      actor_user_id: input.userId,
      action: "vehicle.returned",
      module: "captains",
      operation_context: "dashboard",
      entity_type: "captain",
      entity_id: input.captainId,
      after_data: { kinds: droppedCompanyKinds, returned_on: returnedOn },
    });
  }

  if (Object.keys(changed).length) {
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
}

export async function setCaptainPhoto(input: {
  tenantId: string;
  userId: string;
  captainId: string;
  file: File;
}): Promise<void> {
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
}

export async function addCaptainDocument(input: {
  tenantId: string;
  userId: string;
  captainId: string;
  kind: DocumentKind;
  title: string | null;
  file: File;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: captain, error: readErr } = await admin
    .from("captains")
    .select("id")
    .eq("id", input.captainId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!captain) throw new Error("الكابتن غير موجود");

  const safeName = input.file.name.replace(/[^\w.\-؀-ۿ]+/g, "_");
  const path = `${input.tenantId}/${input.captainId}/${Date.now()}-${safeName}`;

  const upload = await admin.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, await input.file.arrayBuffer(), { contentType: input.file.type, upsert: false });
  if (upload.error) throw new Error(`تعذّر رفع الملف: ${upload.error.message}`);

  const { error } = await admin.from("captain_documents").insert({
    tenant_id: input.tenantId,
    captain_id: input.captainId,
    kind: input.kind,
    title: clean(input.title),
    storage_path: path,
    original_filename: input.file.name,
    mime_type: input.file.type,
    size_bytes: input.file.size,
    uploaded_by: input.userId,
  });
  if (error) {
    await admin.storage.from(DOCUMENT_BUCKET).remove([path]);
    throw new Error(`تعذّر حفظ الملف: ${error.message}`);
  }
}

export async function deleteCaptainDocument(input: {
  tenantId: string;
  userId: string;
  documentId: string;
}): Promise<string> {
  const admin = createAdminClient();

  const { data: doc, error: readErr } = await admin
    .from("captain_documents")
    .select("id, captain_id, storage_path, kind, original_filename")
    .eq("id", input.documentId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!doc) throw new Error("الملف غير موجود");

  const { error } = await admin.from("captain_documents").delete().eq("id", doc.id);
  if (error) throw new Error(`تعذّر الحذف: ${error.message}`);
  await admin.storage.from(DOCUMENT_BUCKET).remove([doc.storage_path]);

  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    actor_user_id: input.userId,
    action: "captain.document_deleted",
    module: "captains",
    operation_context: "dashboard",
    entity_type: "captain",
    entity_id: doc.captain_id,
    before_data: { kind: doc.kind, original_filename: doc.original_filename },
  });

  return doc.captain_id;
}
