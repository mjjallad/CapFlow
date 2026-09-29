-- Supervisors, teams and the captain fields that the legacy Diken system tracks.
-- Every captain belongs to one supervisor (code as used in the sheets' dip.s.c
-- column) and one team (A / B / FDK).

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name text not null,
  team_id uuid references public.teams(id) on delete set null,
  membership_id uuid references public.tenant_memberships(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create trigger supervisors_updated_at before update on public.supervisors
  for each row execute function public.set_updated_at();

alter table public.captains
  add column if not exists supervisor_id uuid references public.supervisors(id) on delete set null,
  add column if not exists needs_review boolean not null default false,
  add column if not exists review_note text,
  add column if not exists source_sheet text;

-- A captain whose phone collides with another captain is stored without one
-- and flagged for review, so the column has to accept NULL.
alter table public.captains alter column phone drop not null;

create index if not exists captains_supervisor_idx on public.captains (tenant_id, supervisor_id) where archived_at is null;

alter table public.supervisors enable row level security;
create policy tenant_select on public.supervisors for select using (app_private.is_tenant_member(tenant_id));
grant select on public.supervisors to authenticated;
grant all on public.supervisors to service_role;
