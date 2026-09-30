import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { DamageMark } from "@/components/damage";

type VehicleKind = Database["public"]["Enums"]["vehicle_kind"];

export type Vehicle = {
  id: string;
  kind: VehicleKind;
  model: string | null;
  plate_number: string | null;
  made_year: number | null;
  color: string | null;
  odometer_km: number | null;
  received_on: string | null;
  inspected_on: string | null;
  damage_marks: DamageMark[];
  notes: string | null;
};

export type VehicleInput = Omit<Vehicle, "id"> & { id: string | null };

export async function listVehicles(input: { tenantId: string; captainId: string }): Promise<Vehicle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("id, kind, model, plate_number, made_year, color, odometer_km, received_on, inspected_on, damage_marks, notes")
    .eq("tenant_id", input.tenantId)
    .eq("captain_id", input.captainId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((v) => ({ ...v, damage_marks: (v.damage_marks ?? []) as unknown as DamageMark[] }));
}

function clean(value: string | null): string | null {
  const text = (value ?? "").trim();
  return text === "" ? null : text;
}

export async function saveVehicle(input: {
  tenantId: string;
  userId: string;
  captainId: string;
  vehicle: VehicleInput;
}): Promise<void> {
  const admin = createAdminClient();
  const v = input.vehicle;

  const row = {
    tenant_id: input.tenantId,
    captain_id: input.captainId,
    kind: v.kind,
    model: clean(v.model),
    plate_number: clean(v.plate_number),
    made_year: v.made_year,
    color: clean(v.color),
    odometer_km: v.odometer_km,
    received_on: clean(v.received_on),
    inspected_on: clean(v.inspected_on),
    damage_marks: v.damage_marks as unknown as Json,
    notes: clean(v.notes),
  };

  const result = v.id
    ? await admin.from("vehicles").update(row).eq("id", v.id).eq("tenant_id", input.tenantId)
    : await admin.from("vehicles").insert(row);

  if (result.error) {
    if (result.error.code === "23505") throw new Error("رقم اللوحة مسجّل لمركبة أخرى");
    throw new Error(`تعذّر حفظ المركبة: ${result.error.message}`);
  }

  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    actor_user_id: input.userId,
    action: v.id ? "vehicle.updated" : "vehicle.added",
    module: "captains",
    operation_context: "dashboard",
    entity_type: "captain",
    entity_id: input.captainId,
    after_data: row as unknown as Json,
  });
}

export async function deleteVehicle(input: {
  tenantId: string;
  userId: string;
  vehicleId: string;
}): Promise<string | null> {
  const admin = createAdminClient();

  const { data: vehicle, error: readErr } = await admin
    .from("vehicles")
    .select("id, captain_id, kind, plate_number")
    .eq("id", input.vehicleId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!vehicle) throw new Error("المركبة غير موجودة");

  const { error } = await admin.from("vehicles").delete().eq("id", vehicle.id);
  if (error) throw new Error(`تعذّر الحذف: ${error.message}`);

  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    actor_user_id: input.userId,
    action: "vehicle.removed",
    module: "captains",
    operation_context: "dashboard",
    entity_type: "captain",
    entity_id: vehicle.captain_id,
    before_data: { kind: vehicle.kind, plate_number: vehicle.plate_number },
  });

  return vehicle.captain_id;
}
