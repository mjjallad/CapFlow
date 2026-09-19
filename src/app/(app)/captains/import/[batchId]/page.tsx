import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { NormalizedCaptain } from "@/lib/imports/captains/parse";
import { BatchStatusBadge } from "@/components/batch-status";
import { ApplyForm } from "./apply-form";

const PREVIEW_LIMIT = 300;

export default async function ImportBatchPage({ params }: PageProps<"/captains/import/[batchId]">) {
  const { batchId } = await params;
  await requireTenant("captains.import");
  const supabase = await createClient();

  // RLS restricts this to the user's tenant; a foreign id simply returns nothing.
  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, original_filename, status, source_rows, accepted_rows, rejected_rows, error_summary, created_at")
    .eq("id", batchId)
    .eq("kind", "captains")
    .maybeSingle();
  if (!batch) notFound();

  const { data: rows } = await supabase
    .from("import_rows")
    .select("id, row_number, normalized_data, is_valid, error_messages")
    .eq("batch_id", batchId)
    .order("is_valid", { ascending: true })
    .order("row_number")
    .limit(PREVIEW_LIMIT);

  const invalidRows = (rows ?? []).filter((r) => !r.is_valid);
  const validRows = (rows ?? []).filter((r) => r.is_valid);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/captains/import" className="text-sm text-muted hover:underline">
          ← استيراد الكباتن
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold" dir="ltr">
            {batch.original_filename}
          </h1>
          <BatchStatusBadge status={batch.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {batch.source_rows} صفًّا · {batch.accepted_rows} صالح · {batch.rejected_rows} مرفوض
        </p>
        {batch.error_summary && <p className="mt-2 text-sm text-danger">{batch.error_summary}</p>}
      </div>

      {batch.status === "needs_review" && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm">
            سيتم إضافة الكباتن الجدد وتحديث الموجودين (بحسب UserID). الصفوف المرفوضة لن تُستورد.
          </p>
          <ApplyForm batchId={batch.id} validCount={batch.accepted_rows} />
        </section>
      )}

      {invalidRows.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium text-danger">صفوف مرفوضة ({invalidRows.length})</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">السطر</th>
                  <th className="px-3 py-2 text-start font-medium">الأخطاء</th>
                </tr>
              </thead>
              <tbody>
                {invalidRows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums">{r.row_number}</td>
                    <td className="px-3 py-2">{(r.error_messages as string[]).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-medium">
          صفوف صالحة{validRows.length >= PREVIEW_LIMIT - invalidRows.length ? ` (أول ${validRows.length})` : ` (${validRows.length})`}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">السطر</th>
                <th className="px-3 py-2 text-start font-medium">UserID</th>
                <th className="px-3 py-2 text-start font-medium">الاسم</th>
                <th className="px-3 py-2 text-start font-medium">الهاتف</th>
                <th className="px-3 py-2 text-start font-medium">المدينة</th>
                <th className="px-3 py-2 text-start font-medium">مركز الخدمة</th>
                <th className="px-3 py-2 text-start font-medium">الفريق</th>
              </tr>
            </thead>
            <tbody>
              {validRows.map((r) => {
                const d = r.normalized_data as unknown as NormalizedCaptain;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums">{r.row_number}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{d.external_user_id}</td>
                    <td className="px-3 py-2" dir="auto">{d.full_name}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{d.phone}</td>
                    <td className="px-3 py-2" dir="auto">{d.city ?? "—"}</td>
                    <td className="px-3 py-2" dir="auto">{d.service_center_name ?? "—"}</td>
                    <td className="px-3 py-2" dir="auto">{d.team_name ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
