import Link from "next/link";
import { requireTenant } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";
import { BatchStatusBadge } from "@/components/batch-status";

export default async function CaptainsImportPage() {
  await requireTenant("captains.import");
  const supabase = await createClient();

  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, original_filename, status, source_rows, accepted_rows, rejected_rows, created_at")
    .eq("kind", "captains")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/captains" className="text-sm text-muted hover:underline">
          ← الكباتن
        </Link>
        <h1 className="mt-1 text-xl font-semibold">استيراد الكباتن</h1>
        <p className="mt-1 text-sm text-muted">
          الأعمدة المطلوبة: UserID، name، po.number. الأعمدة الاختيارية: City، S.C name، dip.s.c، Team Leader، status.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <UploadForm />
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
                  <th className="px-3 py-2 text-start font-medium">الملف</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">الصفوف</th>
                  <th className="px-3 py-2 text-start font-medium">صالحة</th>
                  <th className="px-3 py-2 text-start font-medium">مرفوضة</th>
                  <th className="px-3 py-2 text-start font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link href={`/captains/import/${b.id}`} className="hover:underline" dir="ltr">
                        {b.original_filename}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <BatchStatusBadge status={b.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{b.source_rows}</td>
                    <td className="px-3 py-2 tabular-nums">{b.accepted_rows}</td>
                    <td className="px-3 py-2 tabular-nums">{b.rejected_rows}</td>
                    <td className="px-3 py-2 text-muted" dir="ltr">
                      {new Date(b.created_at).toLocaleString("en-GB", { timeZone: "Asia/Amman" })}
                    </td>
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
