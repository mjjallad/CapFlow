import type { Database } from "@/lib/supabase/database.types";

export type DepositStatus = Database["public"]["Enums"]["deposit_status"];

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  awaiting_sijil: "بانتظار السجل",
  awaiting_receipt: "بانتظار الإيصال",
  matched: "مطابق",
  review_required: "تحتاج مراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  late: "متأخر",
  escalated: "مُصعَّد للأم",
  cancelled: "ملغاة",
};

const CLASSES: Record<DepositStatus, string> = {
  awaiting_sijil: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  awaiting_receipt: "bg-background text-muted",
  matched: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  review_required: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  late: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  escalated: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  cancelled: "bg-background text-muted",
};

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSES[status]}`}>
      {DEPOSIT_STATUS_LABELS[status]}
    </span>
  );
}
