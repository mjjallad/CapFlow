-- FDK captains ride company-owned vehicles: cars or electric scooters.
-- Teams A and B ride their own, so the column stays NULL for them.
create type public.vehicle_type as enum ('company_car', 'company_scooter');

alter table public.captains
  add column if not exists vehicle_type public.vehicle_type;

update public.captains c
set vehicle_type = case
      when s.code = 'FDK.S' then 'company_scooter'::public.vehicle_type
      else 'company_car'::public.vehicle_type
    end
from public.supervisors s
where c.supervisor_id = s.id and s.code like 'FDK%';

create index if not exists captains_vehicle_idx on public.captains (tenant_id, vehicle_type)
  where vehicle_type is not null and archived_at is null;

-- Per-team totals for one operating day (the day board groups by team now).
create or replace view public.day_team_summaries
with (security_invoker = true) as
select
  c.tenant_id,
  c.operating_day_id,
  t.id   as team_id,
  t.name as team_name,
  count(*)::integer                                    as cases,
  coalesce(sum(c.collected_amount), 0)::numeric(14,3)  as collected_total,
  coalesce(sum(c.deposited_amount), 0)::numeric(14,3)  as deposited_total,
  count(*) filter (where c.status in ('awaiting_sijil', 'awaiting_receipt'))::integer as awaiting,
  count(*) filter (where c.status in ('late', 'escalated'))::integer                  as overdue,
  count(*) filter (where c.status = 'review_required')::integer                       as review
from public.deposit_cases c
join public.captains k on k.id = c.captain_id
join public.teams t on t.id = k.team_id
group by c.tenant_id, c.operating_day_id, t.id, t.name;

grant select on public.day_team_summaries to authenticated, service_role;
