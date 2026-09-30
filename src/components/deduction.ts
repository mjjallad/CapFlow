import type { Database } from "@/lib/supabase/database.types";

export type DeductionMode = Database["public"]["Enums"]["deduction_mode"];

/** What a captain may keep out of the cash he collected. */
export const DEDUCTION_LABELS: Record<DeductionMode, string> = {
  none: "بدون خصم — يودع كل المبلغ",
  per_order: "خصم لكل أوردر",
  payouts: "خصم مدفوعات — يخصم ما له من التطبيق",
};

export const DEDUCTION_SHORT: Record<DeductionMode, string> = {
  none: "بدون خصم",
  per_order: "خصم/أوردر",
  payouts: "خصم مدفوعات",
};

export const DEDUCTION_MODES = Object.keys(DEDUCTION_LABELS) as DeductionMode[];

export function isDeductionMode(value: unknown): value is DeductionMode {
  return typeof value === "string" && value in DEDUCTION_LABELS;
}
