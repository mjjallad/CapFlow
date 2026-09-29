import type { Database } from "@/lib/supabase/database.types";

export type VehicleKind = Database["public"]["Enums"]["vehicle_kind"];

/** A captain can ride several of these at once. */
export const VEHICLE_LABELS: Record<VehicleKind, string> = {
  own_car: "سيارته الخاصة",
  own_scooter: "سكوتره الخاص",
  company_car: "سيارة الشركة",
  company_scooter: "سكوتر الشركة",
};

export const VEHICLE_ORDER: VehicleKind[] = ["own_car", "own_scooter", "company_car", "company_scooter"];

export function vehicleSummary(kinds: VehicleKind[] | null): string {
  if (!kinds?.length) return "—";
  return VEHICLE_ORDER.filter((k) => kinds.includes(k))
    .map((k) => VEHICLE_LABELS[k])
    .join(" + ");
}

export type DocumentKind = Database["public"]["Enums"]["captain_document_kind"];

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  contract: "عقد",
  national_id: "هوية",
  license: "رخصة",
  vehicle: "مركبة",
  other: "أخرى",
};
