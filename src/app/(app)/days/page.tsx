import Link from "next/link";
import { requireTenant } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, weekdayArabic } from "@/lib/dates";

const DAY_STATUS = { open: "مفتوح", locked: "مقفل", closed: "مُغلق" } as const;

export default async function DaysPage() {
  const ctx = await requireTenant("days.read");
  const currency = ctx.membership.tenant.currency_code;
  const supabase = await createClient();

  const { data: days } = await supabase
    .from("operating_day_summaries")
    .select("*")
    .order("business_date", { ascending: false })
    .limit(60);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">الأيام التشغيلية</h1>
        {can(ctx.membership.role, "days.import") && (
          <Link href="/days/import" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            استيراد تقرير يومي
          </Link>
        )}
      </div>

      {!days?.length ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          لا توجد أيام بعد — ابدأ باستيراد ملف COD الصباحي.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">اليوم</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
                <th className="px-3 py-2 text-start font-medium">كباتن عملوا</th>
                <th className="px-3 py-2 text-start font-medium">المطلوب</th>
                <th className="px-3 py-2 text-start font-medium">المودَع</th>
                <th className="px-3 py-2 text-start font-medium">بانتظار</th>
                <th className="px-3 py-2 text-start font-medium">متأخر</th>
                <th className="px-3 py-2 text-start font-medium">مراجعة</th>
                <th className="px-3 py-2 text-start font-medium">مُسوّى</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.operating_day_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link href={`/days/${d.business_date}`} className="font-medium hover:underline">
                      <span dir="ltr">{d.business_date}</span> · {weekdayArabic(d.business_date!)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{DAY_STATUS[d.status!]}</td>
                  <td className="px-3 py-2 tabular-nums">{d.cases}</td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(d.collected_total, currency)}</td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(d.deposited_total, currency)}</td>
                  <td className="px-3 py-2 tabular-nums">{d.awaiting}</td>
                  <td className="px-3 py-2 tabular-nums">{d.overdue}</td>
                  <td className="px-3 py-2 tabular-nums">{d.review}</td>
                  <td className="px-3 py-2 tabular-nums">{d.settled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
