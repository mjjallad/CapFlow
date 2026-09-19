import Link from "next/link";
import { requireTenant } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS = { active: "نشط", inactive: "غير نشط", suspended: "موقوف" } as const;
const PAGE_SIZE = 100;

export default async function CaptainsPage({ searchParams }: PageProps<"/captains">) {
  const ctx = await requireTenant("captains.read");
  const { q, page } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const pageNumber = Math.max(1, Number(typeof page === "string" ? page : 1) || 1);
  const supabase = await createClient();

  let request = supabase
    .from("captains")
    .select("id, external_user_id, full_name, phone, status, service_center_name, city:cities(name), team:teams(name)", {
      count: "exact",
    })
    .is("archived_at", null)
    .order("full_name")
    .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);

  if (query) {
    request = request.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,external_user_id.ilike.%${query}%`);
  }

  const { data: captains, count } = await request;
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">الكباتن</h1>
          <p className="text-sm text-muted">{total} كابتن</p>
        </div>
        {can(ctx.membership.role, "captains.import") && (
          <Link
            href="/captains/import"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            استيراد من Excel
          </Link>
        )}
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="بحث بالاسم أو الهاتف أو UserID"
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface">
          بحث
        </button>
      </form>

      {!captains?.length ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          {query ? "لا نتائج مطابقة." : "لا يوجد كباتن بعد — ابدأ بالاستيراد من Excel."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">UserID</th>
                <th className="px-3 py-2 text-start font-medium">الاسم</th>
                <th className="px-3 py-2 text-start font-medium">الهاتف</th>
                <th className="px-3 py-2 text-start font-medium">المدينة</th>
                <th className="px-3 py-2 text-start font-medium">مركز الخدمة</th>
                <th className="px-3 py-2 text-start font-medium">الفريق</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {captains.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{c.external_user_id ?? "—"}</td>
                  <td className="px-3 py-2" dir="auto">{c.full_name}</td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{c.phone}</td>
                  <td className="px-3 py-2" dir="auto">{c.city?.name ?? "—"}</td>
                  <td className="px-3 py-2" dir="auto">{c.service_center_name ?? "—"}</td>
                  <td className="px-3 py-2" dir="auto">{c.team?.name ?? "—"}</td>
                  <td className="px-3 py-2">{STATUS_LABELS[c.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center gap-3 text-sm">
          {pageNumber > 1 && (
            <Link href={`/captains?q=${encodeURIComponent(query)}&page=${pageNumber - 1}`} className="hover:underline">
              السابق
            </Link>
          )}
          <span className="text-muted">
            صفحة {pageNumber} من {pageCount}
          </span>
          {pageNumber < pageCount && (
            <Link href={`/captains?q=${encodeURIComponent(query)}&page=${pageNumber + 1}`} className="hover:underline">
              التالي
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
