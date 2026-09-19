import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { BatchStatusBadge } from "@/components/batch-status";
import { formatMoney } from "@/lib/dates";
import type { NormalizedCodRow } from "@/lib/imports/cod/parse";
import type { NormalizedRiderRow } from "@/lib/imports/rider/parse";
import { DailyApplyForm } from "./apply-form";

const PREVIEW_LIMIT = 300;

export default async function DailyBatchPage({ params }: PageProps<"/days/import/[batchId]">) {
  const { batchId } = await params;
  const ctx = await requireTenant("days.import");
  const currency = ctx.membership.tenant.currency_code;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, kind, original_filename, status, source_rows, accepted_rows, rejected_rows, error_summary, day:operating_days(business_date)")
    .eq("id", batchId)
    .in("kind", ["cod", "rider"])
    .maybeSingle();
  if (!batch || (batch.kind !== "cod" && batch.kind !== "rider")) notFound();
  const kind = batch.kind;
  const businessDate = batch.day?.business_date ?? "";

  const { data: rows } = await supabase
    .from("import_rows")
    .select("id, row_number, normalized_data, is_valid, error_messages")
    .eq("batch_id", batchId)
    .order("is_valid", { ascending: true })
    .order("row_number")
    .limit(PREVIEW_LIMIT);

  const invalidRows = (rows ?? []).filter((r) => !r.is_valid);
  const validRows = (rows ?? []).filter((r) => r.is_valid);

  // Which of the valid riders are actually known captains? Unknown ones will be
  // skipped on apply, so surface the count before the operator commits.
  const riderIds = validRows.map((r) => (r.normalized_data as { external_user_id: string }).external_user_id);
  const { data: known } = riderIds.length
    ? await supabase.from("captains").select("external_user_id").in("external_user_id", riderIds).is("archived_at", null)
    : { data: [] as { external_user_id: string | null }[] };
  const knownIds = new Set((known ?? []).map((c) => c.external_user_id));
  const unknownCount = riderIds.filter((id) => !knownIds.has(id)).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/days/import" className="text-sm text-muted hover:underline">
          ← استيراد التقارير اليومية
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold" dir="ltr">{batch.original_filename}</h1>
          <BatchStatusBadge status={batch.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {kind === "cod" ? "COD الصباحي" : "Rider الظهر"} · يوم <span dir="ltr">{businessDate}</span> · {batch.source_rows} صفًّا ·{" "}
          {batch.accepted_rows} صالح · {batch.rejected_rows} مرفوض
        </p>
        {batch.error_summary && <p className="mt-2 text-sm text-danger">{batch.error_summary}</p>}
      </div>

      {batch.status === "needs_review" && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          {unknownCount > 0 && (
            <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              {unknownCount} من الصفوف المعروضة ({riderIds.length}) تخص كباتن غير موجودين في قائمتك — ستُتخطى، ويمكن إعادة
              رفع الملف بعد استيراد الكباتن.
            </p>
          )}
          <p className="text-sm">
            {kind === "cod"
              ? "لكل كابتن معروف: يُسجَّل حاضرًا، يُحفظ المبلغ المطلوب، وتُفتح حالة إيداع بانتظار الإيصال."
              : "لكل كابتن معروف: تُضاف التوصيلات إلى حالة اليوم؛ ومن عمل ولم يظهر في COD يُسجَّل «فيزا — لا كاش عليه»."}
          </p>
          <DailyApplyForm batchId={batch.id} kind={kind} businessDate={businessDate} validCount={batch.accepted_rows} />
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
                  <th className="px-3 py-2 text-start font-medium">rider_id</th>
                  <th className="px-3 py-2 text-start font-medium">الأخطاء</th>
                </tr>
              </thead>
              <tbody>
                {invalidRows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums">{r.row_number}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{String((r.normalized_data as { external_user_id?: string } | null)?.external_user_id ?? "—")}</td>
                    <td className="px-3 py-2">{(r.error_messages as string[]).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-medium">صفوف صالحة ({validRows.length}{validRows.length + invalidRows.length >= PREVIEW_LIMIT ? "+" : ""})</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">السطر</th>
                <th className="px-3 py-2 text-start font-medium">rider_id</th>
                <th className="px-3 py-2 text-start font-medium">معروف؟</th>
                {kind === "cod" ? (
                  <>
                    <th className="px-3 py-2 text-start font-medium">المطلوب</th>
                    <th className="px-3 py-2 text-start font-medium">COD محصّل</th>
                    <th className="px-3 py-2 text-start font-medium">مدفوع عند الاستلام</th>
                    <th className="px-3 py-2 text-start font-medium">رصيد المحفظة</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 text-start font-medium">توصيلات مكتملة</th>
                    <th className="px-3 py-2 text-start font-medium">إجمالي الأوردرات</th>
                    <th className="px-3 py-2 text-start font-medium">العقد</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {validRows.map((r) => {
                const id = (r.normalized_data as { external_user_id: string }).external_user_id;
                const isKnown = knownIds.has(id);
                return (
                  <tr key={r.id} className={`border-t border-border ${isKnown ? "" : "text-muted"}`}>
                    <td className="px-3 py-2 tabular-nums">{r.row_number}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{id}</td>
                    <td className="px-3 py-2">{isKnown ? "✓" : "غير معروف"}</td>
                    {kind === "cod" ? (
                      (() => {
                        const d = r.normalized_data as unknown as NormalizedCodRow;
                        return (
                          <>
                            <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(d.collected_amount, currency)}</td>
                            <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(d.cod_collected_amount, currency)}</td>
                            <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(d.paid_at_pickup_amount, currency)}</td>
                            <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(d.wallet_balance, currency)}</td>
                          </>
                        );
                      })()
                    ) : (
                      (() => {
                        const d = r.normalized_data as unknown as NormalizedRiderRow;
                        return (
                          <>
                            <td className="px-3 py-2 tabular-nums">{d.completed_deliveries}</td>
                            <td className="px-3 py-2 tabular-nums">{d.total_orders ?? "—"}</td>
                            <td className="px-3 py-2" dir="ltr">{d.contract_name ?? "—"}</td>
                          </>
                        );
                      })()
                    )}
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
