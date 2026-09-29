-- A captain may ride more than one vehicle (e.g. their own car during the day and
-- a company scooter at night), so the single vehicle_type becomes a set.
create type public.vehicle_kind as enum ('own_car', 'own_scooter', 'company_car', 'company_scooter');

alter table public.captains
  add column if not exists vehicle_kinds public.vehicle_kind[] not null default '{}';

update public.captains
set vehicle_kinds = array[vehicle_type::text::public.vehicle_kind]
where vehicle_type is not null;

drop index if exists captains_vehicle_idx;
alter table public.captains drop column if exists vehicle_type;
drop type if exists public.vehicle_type;

create index if not exists captains_vehicle_kinds_idx on public.captains using gin (vehicle_kinds);

-- Paperwork the office keeps: extra identifier numbers, where the paper contract
-- is filed, and when the captain was activated.
alter table public.captains
  add column if not exists identifiers          jsonb not null default '[]'::jsonb,
  add column if not exists contract_file_number text,
  add column if not exists activated_on         date,
  add constraint captains_identifiers_is_array check (jsonb_typeof(identifiers) = 'array');

-- Scanned documents (contract pages, ID copies, licences).
create type public.captain_document_kind as enum ('contract', 'national_id', 'license', 'vehicle', 'other');

create table if not exists public.captain_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  captain_id uuid not null references public.captains(id) on delete cascade,
  kind public.captain_document_kind not null default 'contract',
  title text,
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists captain_documents_captain_idx on public.captain_documents (captain_id, created_at desc);

alter table public.captain_documents enable row level security;
create policy tenant_select on public.captain_documents for select using (app_private.is_tenant_member(tenant_id));
grant select on public.captain_documents to authenticated;
grant all on public.captain_documents to service_role;

-- Private bucket: documents are served through short-lived signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captain-documents', 'captain-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
