import { requireTenant } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { VEHICLE_LABELS, type VehicleKind } from "@/components/vehicle";

export default async function TeamPage() {
  await requireTenant("captains.read");
  const supabase = await createClient();

  const { data: teams } = await supabase.from("teams").select("id, name").eq("is_active", true).order("name");
  const { data: captains } = await supabase
    .from("captains")
    .select("team_id, vehicle_kinds, status")
    .is("archived_at", null);

  type Tally = { total: number; active: number; vehicles: Map<VehicleKind, number> };
  const tally = new Map<string, Tally>();
  let unassigned = 0;
  for (const c of captains ?? []) {
    if (!c.team_id) {
      unassigned += 1;
      continue;
    }
    const t = tally.get(c.team_id) ?? { total: 0, active: 0, vehicles: new Map() };
    t.total += 1;
    if (c.status === "active") t.active += 1;
    for (const kind of c.vehicle_kinds ?? []) t.vehicles.set(kind, (t.vehicles.get(kind) ?? 0) + 1);
    tally.set(c.team_id, t);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">الفرق</h1>
        <p className="mt-1 text-sm text-muted">
          كباتن فريقَي A وB يعملون على مركباتهم، وفريق FDK على مركبات الشركة (سيارات وسكوترات).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {teams?.map((team) => {
          const t = tally.get(team.id);
          return (
            <div key={team.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="text-lg font-semibold">فريق {team.name}</div>
              <div className="mt-1 text-sm text-muted">
                {t?.active ?? 0} كابتن فعّال
                {t && t.total !== t.active ? ` من ${t.total}` : ""}
              </div>
              {t && t.vehicles.size > 0 && (
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {[...t.vehicles].map(([vehicle, n]) => (
                    <li key={vehicle} className="flex justify-between">
                      <span>{VEHICLE_LABELS[vehicle]}</span>
                      <span className="tabular-nums text-muted">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {unassigned > 0 && (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          {unassigned} كابتن بلا فريق — راجعهم من صفحة الكباتن.
        </p>
      )}
    </div>
  );
}
