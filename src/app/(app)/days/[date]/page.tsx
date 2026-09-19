import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DepositStatusBadge, type DepositStatus } from "@/components/deposit-status";
import { formatDateTime, formatMoney, weekdayArabic } from "@/lib/dates";
import { DepositForm } from "./deposit-form";

const PAGE_SIZE = 200;

// Tabs map to status groups; "all" shows everything for the day.
const TABS: { key: string; label: string; statuses: DepositStatus[] | null }[] = [
  { key: "open", label: "بانتظار الإيداع", statuses: ["awaiting_receipt", "awaiting_sijil"] },
  { key: "overdue", label: "متأخر / مُصعَّد", statuses: ["late", "escalated"] },
  { key: "review", label: "مراجعة", statuses: ["review_required"] },
  { key: "settled", label: "مُسوّى", statuses: ["matched", "approved"] },
  { key: "all", label: "الكل", statuses: null },
];

export default async function DayPage({ params, searchParams }: PageProps<"/days/[date]">) {
  const { date } = await params;
  const { tab: tabParam, q, page } = await searchParams;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const ctx = await requireTenant("days.read");
  const { currency_code: currency, timezone: tz } = ctx.membership.tenant;
  const canRecord = can(ctx.membership.role, "deposits.record");
  const supabase = await createClient();

  const { data: day } = await supabase
    .from("operating_day_summaries")
    .select("*")
    .eq("business_date", date)
    .maybeSingle();
  if (!day) notFound();

  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];
  const query = typeof q === "string" ? q.trim() : "";
  const pageNumber = Math.max(1, Number(typeof page === "string" ? page : 1) || 1);

  let request = supabase
    .from("deposit_cases")
    .select(
      "id, status, collected_amount, expected_amount, deposited_amount, withdrawn_amount, allowed_deduction, deduction_rate, completed_deliveries, payment_method, is_late, deposited_at, review_reason, notes, captain:captains!inner(id, external_user_id, full_name, phone, service_center_name, group_label)",
      { count: "exact" },
    )
    .eq("operating_day_id", day.operating_day_id!)
    .order("collected_amount", { ascending: false, nullsFirst: false })
    .order("status")
    .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);

  if (tab.statuses) request = request.in("status", tab.statuses);
  if (query) {
    request = request.or(
      `full_name.ilike.%${query}%,phone.ilike.%${query}%,external_user_id.ilike.%${query}%`,
      { referencedTable: "captains" },
    );
  }

  const { data: cases, count } = await request;
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number, t = tab.key) => `/days/${date}?tab=${t}&q=${encodeURIComponent(query)}&page=${p}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/days" className="text-sm text-muted hover:underline">
          ← الأيام
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          يوم <span dir="ltr">{date}</span> · {weekdayArabic(date)}
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="كباتن عملوا" value={String(day.cases ?? 0)} />
        <Stat label="المطلوب" value={formatMoney(day.collected_total, currency)} />
        <Stat label="المتوقع إيداعه" value={formatMoney(day.expected_total, currency)} />
        <Stat label="المودَع" value={formatMoney(day.deposited_total, currency)} />
        <Stat label="بانتظار" value={String(day.awaiting ?? 0)} />
        <Stat label="متأخر / مراجعة" value={`${day.overdue ?? 0} / ${day.review ?? 0}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefFor(1, t.key)}
            className={`rounded-full px-3 py-1 text-sm ${
              t.key === tab.key ? "bg-accent text-accent-foreground" : "border border-border hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <form className="ms-auto flex gap-2">
          <input type="hidden" name="tab" value={tab.key} />
          <input
            name="q"
            defaultValue={query}
            placeholder="بحث بالاسم أو الهاتف أو UserID"
            className="w-64 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface">
            بحث
          </button>
        </form>
      </div>

      {!cases?.length ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">لا حالات في هذا التبويب.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">الكابتن</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
                <th className="px-3 py-2 text-start font-medium">المطلوب</th>
                <th className="px-3 py-2 text-start font-medium">أوردرات</th>
                <th className="px-3 py-2 text-start font-medium">المتوقع</th>
                <th className="px-3 py-2 text-start font-medium">المودَع</th>
                <th className="px-3 py-2 text-start font-medium">المسحوب</th>
                <th className="px-3 py-2 text-start font-medium">وقت الإيداع</th>
                {canRecord && <th className="px-3 py-2 text-start font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div dir="auto">{c.captain.full_name}</div>
                    <div className="text-xs text-muted" dir="ltr">
                      {c.captain.external_user_id} · {c.captain.phone}
                    </div>
                    {c.captain.group_label && <div className="text-xs text-muted" dir="auto">{c.captain.group_label}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <DepositStatusBadge status={c.status} />
                    {c.payment_method === "visa" && <div className="mt-1 text-xs text-muted">فيزا — لا كاش عليه</div>}
                    {c.is_late && <div className="mt-1 text-xs text-orange-700 dark:text-orange-300">متأخر</div>}
                    {c.review_reason && <div className="mt-1 max-w-48 text-xs text-muted">{c.review_reason}</div>}
                  </td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.collected_amount, currency)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {c.completed_deliveries ?? "—"}
                    {c.deduction_rate > 0 && (
                      <div className="text-xs text-muted" dir="ltr">
                        −{c.deduction_rate}/order
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.expected_amount, currency)}</td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.deposited_amount, currency)}</td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">
                    {c.withdrawn_amount === null ? (
                      "—"
                    ) : c.withdrawn_amount < 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        زيادة {formatMoney(-c.withdrawn_amount, currency)}
                      </span>
                    ) : c.withdrawn_amount > (c.allowed_deduction ?? 0) + 0.0005 ? (
                      <span className="text-danger">{formatMoney(c.withdrawn_amount, currency)}</span>
                    ) : (
                      formatMoney(c.withdrawn_amount, currency)
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted" dir="ltr">{formatDateTime(c.deposited_at, tz)}</td>
                  {canRecord && (
                    <td className="px-3 py-2">
                      {!["matched", "approved", "cancelled", "rejected"].includes(c.status) && (
                        <DepositForm caseId={c.id} businessDate={date} expectedAmount={c.expected_amount} currency={currency} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center gap-3 text-sm">
          {pageNumber > 1 && <Link href={hrefFor(pageNumber - 1)} className="hover:underline">السابق</Link>}
          <span className="text-muted">
            صفحة {pageNumber} من {pageCount} · {total} حالة
          </span>
          {pageNumber < pageCount && <Link href={hrefFor(pageNumber + 1)} className="hover:underline">التالي</Link>}
        </nav>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-semibold tabular-nums" dir="ltr">{value}</div>
    </div>
  );
}
