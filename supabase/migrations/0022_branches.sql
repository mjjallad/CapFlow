-- The branch a captain was activated at.
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create trigger branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();

alter table public.branches enable row level security;
create policy tenant_select on public.branches for select using (app_private.is_tenant_member(tenant_id));
grant select on public.branches to authenticated;
grant all on public.branches to service_role;

alter table public.captains
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

create index if not exists captains_branch_idx on public.captains (tenant_id, branch_id) where archived_at is null;

insert into public.branches (tenant_id, name)
select t.id, b.name
from public.tenants t
cross join (values ('أبو علندا'), ('شفا بدران'), ('وادي صقرة'), ('الزرقاء')) as b(name)
on conflict (tenant_id, name) do nothing;
