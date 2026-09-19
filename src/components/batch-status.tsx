import type { Database } from "@/lib/supabase/database.types";

type ImportStatus = Database["public"]["Enums"]["import_status"];

const LABELS: Record<ImportStatus, { text: string; className: string }> = {
  uploaded: { text: "مرفوع", className: "bg-background text-muted" },
  validating: { text: "قيد التحقق", className: "bg-background text-muted" },
  needs_review: { text: "بانتظار المراجعة", className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  applied: { text: "مُطبَّق", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200" },
  failed: { text: "فشل", className: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200" },
  cancelled: { text: "مُلغى", className: "bg-background text-muted" },
};

export function BatchStatusBadge({ status }: { status: ImportStatus }) {
  const { text, className } = LABELS[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{text}</span>;
}
