-- Company-owned cars and scooters handed to captains. Kept as their own rows
-- (not columns on the captain) because a captain may hold a car and a scooter
-- at once, and a vehicle outlives the captain currently driving it.
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  captain_id uuid references public.captains(id) on delete set null,
  kind public.vehicle_kind not null,
  model text,
  plate_number text,
  made_year smallint check (made_year is null or made_year between 1950 and 2100),
  color text,
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  received_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_company_owned check (kind in ('company_car', 'company_scooter'))
);

create unique index if not exists vehicles_plate_key
  on public.vehicles (tenant_id, plate_number)
  where plate_number is not null;

create index if not exists vehicles_captain_idx on public.vehicles (captain_id);

create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;
create policy tenant_select on public.vehicles for select using (app_private.is_tenant_member(tenant_id));
grant select on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
