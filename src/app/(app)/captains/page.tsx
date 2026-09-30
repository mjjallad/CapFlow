import Link from "next/link";
import { requireTenant } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { vehicleSummary } from "@/components/vehicle";
import { captainSearchFilter } from "@/lib/captains/search";

const STATUS_LABELS = { active: "نشط", inactive: "غير نشط", suspended: "موقوف" } as const;
const PAGE_SIZE = 100;

export default async function CaptainsPage({ searchParams }: PageProps<"/captains">) {
  const ctx = await requireTenant("captains.read");
  const { q, page, team } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const teamName = typeof team === "string" ? team : "";
  const pageNumber = Math.max(1, Number(typeof page === "string" ? page : 1) || 1);
  const supabase = await createClient();

  const { data: teams } = await supabase.from("teams").select("id, name").eq("is_active", true).order("name");
  const selected = teams?.find((t) => t.name === teamName);

  let request = supabase
    .from("captains")
    .select(
      "id, external_user_id, full_name, phone, status, needs_review, vehicle_kinds, city:cities(name), team:teams(name)",
      { count: "exact" },
    )
    .is("archived_at", null)
    .order("full_name")
    .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);

  if (selected) request = request.eq("team_id", selected.id);
  if (query) request = request.or(captainSearchFilter(query));

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

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="بحث بالاسم أو الهاتف أو UserID"
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          name="team"
          defaultValue={teamName}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="">كل الفرق</option>
          {teams?.map((t) => (
            <option key={t.id} value={t.name}>
              فريق {t.name}
            </option>
          ))}
        </select>
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
                <th className="px-3 py-2 text-start font-medium">المركبة</th>
                <th className="px-3 py-2 text-start font-medium">الفريق</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {captains.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{c.external_user_id ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/captains/${c.id}`} className="hover:underline" dir="auto">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">{c.phone}</td>
                  <td className="px-3 py-2" dir="auto">{c.city?.name ?? "—"}</td>
                  <td className="px-3 py-2" dir="auto">{vehicleSummary(c.vehicle_kinds)}</td>
                  <td className="px-3 py-2" dir="auto">{c.team?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {STATUS_LABELS[c.status]}
                    {c.needs_review && <div className="text-xs text-amber-700 dark:text-amber-300">بحاجة مراجعة</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center gap-3 text-sm">
          {pageNumber > 1 && (
            <Link href={`/captains?q=${encodeURIComponent(query)}&team=${encodeURIComponent(teamName)}&page=${pageNumber - 1}`} className="hover:underline">
              السابق
            </Link>
          )}
          <span className="text-muted">
            صفحة {pageNumber} من {pageCount}
          </span>
          {pageNumber < pageCount && (
            <Link href={`/captains?q=${encodeURIComponent(query)}&team=${encodeURIComponent(teamName)}&page=${pageNumber + 1}`} className="hover:underline">
              التالي
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
