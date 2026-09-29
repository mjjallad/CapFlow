import type { Database } from "@/lib/supabase/database.types";

export type VehicleType = Database["public"]["Enums"]["vehicle_type"];

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  company_car: "سيارة الشركة",
  company_scooter: "سكوتر الشركة",
};
