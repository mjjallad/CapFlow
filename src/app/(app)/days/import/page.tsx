import Link from "next/link";
import { requireTenant } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { BatchStatusBadge } from "@/components/batch-status";
import { formatDateTime, shiftIsoDate, todayInTimezone } from "@/lib/dates";
import { DailyUploadForm } from "./upload-form";

const KIND_LABELS = { cod: "COD", rider: "Rider", captains: "كباتن", attendance: "حضور" } as const;

export default async function DailyImportPage() {
  const ctx = await requireTenant("days.import");
  const tz = ctx.membership.tenant.timezone;
  const supabase = await createClient();

  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, kind, original_filename, status, source_rows, accepted_rows, rejected_rows, created_at, day:operating_days(business_date)")
    .in("kind", ["cod", "rider"])
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/days" className="text-sm text-muted hover:underline">
          ← الأيام
        </Link>
        <h1 className="mt-1 text-xl font-semibold">استيراد التقارير اليومية</h1>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <DailyUploadForm defaultDate={shiftIsoDate(todayInTimezone(tz), -1)} />
      </section>

      <section>
        <h2 className="mb-3 font-medium">الدفعات السابقة</h2>
        {!batches?.length ? (
          <p className="text-sm text-muted">لا توجد دفعات بعد.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">اليوم</th>
                  <th className="px-3 py-2 text-start font-medium">النوع</th>
                  <th className="px-3 py-2 text-start font-medium">الملف</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">صالحة / مرفوضة</th>
                  <th className="px-3 py-2 text-start font-medium">رُفع في</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{b.day?.business_date ?? "—"}</td>
                    <td className="px-3 py-2">{KIND_LABELS[b.kind]}</td>
                    <td className="px-3 py-2">
                      <Link href={`/days/import/${b.id}`} className="hover:underline" dir="ltr">
                        {b.original_filename}
                      </Link>
                    </td>
                    <td className="px-3 py-2"><BatchStatusBadge status={b.status} /></td>
                    <td className="px-3 py-2 tabular-nums">{b.accepted_rows} / {b.rejected_rows}</td>
                    <td className="px-3 py-2 text-muted" dir="ltr">{formatDateTime(b.created_at, tz)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
