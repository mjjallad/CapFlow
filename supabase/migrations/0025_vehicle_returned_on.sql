-- When a captain moves off a company vehicle, the day he handed it back is
-- recorded and the vehicle is released from him — it stays in the fleet with
-- its plate, odometer and condition sketch intact.
alter table public.vehicles
  add column if not exists returned_on date;

create index if not exists vehicles_unassigned_idx on public.vehicles (tenant_id, kind)
  where captain_id is null;
