-- Deposit SaaS – Phase 1 database foundation
-- PostgreSQL / Supabase migration.
-- Never expose service_role credentials to the frontend.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.app_role as enum ('owner', 'admin', 'accountant', 'supervisor', 'reviewer', 'operator', 'viewer');
create type public.captain_status as enum ('active', 'inactive', 'suspended');
create type public.operating_day_status as enum ('open', 'locked', 'closed');
create type public.attendance_status as enum ('present', 'absent', 'leave');
create type public.payment_method as enum ('cash', 'visa', 'none', 'unknown');
create type public.deposit_status as enum ('awaiting_sijil', 'awaiting_receipt', 'matched', 'review_required', 'approved', 'rejected', 'late', 'cancelled');
create type public.evidence_type as enum ('sijil', 'receipt', 'pdf_receipt', 'text_deposit', 'unknown');
create type public.evidence_status as enum ('received', 'processed', 'linked', 'rejected', 'review_required');
create type public.import_kind as enum ('captains', 'attendance', 'cod');
create type public.import_status as enum ('uploaded', 'validating', 'needs_review', 'applied', 'failed', 'cancelled');
create type public.review_status as enum ('open', 'in_progress', 'resolved', 'dismissed');
create type public.extraction_status as enum ('queued', 'processing', 'succeeded', 'failed', 'needs_review');
create type public.review_subject_type as enum ('general', 'deposit_case', 'deposit_evidence', 'captain', 'import_batch');
create type public.audit_module as enum ('system', 'tenancy', 'captains', 'imports', 'deposits', 'reviews', 'reports', 'integrations');
create type public.operation_context as enum ('system', 'dashboard', 'backend_api', 'rpc', 'whatsapp_webhook', 'file_import', 'scheduled_job', 'migration');

-- Every business customer is isolated by tenant_id.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug extensions.citext not null unique,
  timezone text not null default 'Asia/Amman',
  currency_code char(3) not null default 'JOD',
  business_day_cutoff time not null default '16:00',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  code text,
  is_active boolean not null default true,
  unique (tenant_id, name),
  unique (tenant_id, code)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  name text not null,
  code text,
  supervisor_membership_id uuid references public.tenant_memberships(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (tenant_id, code)
);

create table public.captains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  external_user_id text,
  phone text not null,
  full_name text not null,
  city_id uuid references public.cities(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  service_center_name text,
  group_label text,
  team_leader_name text,
  status public.captain_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (tenant_id, phone),
  -- NULL external ids never collide; only real ids must be unique per tenant.
  unique (tenant_id, external_user_id)
);
create index captains_tenant_team_idx on public.captains (tenant_id, team_id) where archived_at is null;

-- A business date is explicit; it is never inferred from the UTC timestamp later.
create table public.operating_days (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  business_date date not null,
  status public.operating_day_status not null default 'open',
  locked_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, business_date)
);

-- Uploads are immutable source records. Parsed rows are auditable, including rejected rows.
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  operating_day_id uuid references public.operating_days(id) on delete restrict,
  kind public.import_kind not null,
  status public.import_status not null default 'uploaded',
  original_filename text not null,
  storage_path text not null,
  checksum text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  source_rows integer not null default 0 check (source_rows >= 0),
  accepted_rows integer not null default 0 check (accepted_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  error_summary text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_data jsonb not null,
  normalized_data jsonb,
  is_valid boolean not null default false,
  error_messages jsonb not null default '[]'::jsonb,
  unique (batch_id, row_number)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  operating_day_id uuid not null references public.operating_days(id) on delete restrict,
  captain_id uuid not null references public.captains(id) on delete restrict,
  status public.attendance_status not null,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operating_day_id, captain_id)
);

create table public.cod_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  operating_day_id uuid not null references public.operating_days(id) on delete restrict,
  captain_id uuid not null references public.captains(id) on delete restrict,
  actual_amount numeric(14,3),
  import_batch_id uuid references public.import_batches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (actual_amount is null or actual_amount >= 0),
  unique (operating_day_id, captain_id)
);

-- One daily case is the operational reconciliation record for a captain.
create table public.deposit_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  operating_day_id uuid not null references public.operating_days(id) on delete restrict,
  captain_id uuid not null references public.captains(id) on delete restrict,
  status public.deposit_status not null default 'awaiting_sijil',
  payment_method public.payment_method not null default 'unknown',
  collected_amount numeric(14,3),
  deposited_amount numeric(14,3),
  variance_amount numeric(14,3) generated always as (
    case when collected_amount is not null and deposited_amount is not null
      then deposited_amount - collected_amount else null end
  ) stored,
  completed_deliveries integer check (completed_deliveries is null or completed_deliveries >= 0),
  distance_km numeric(10,3) check (distance_km is null or distance_km >= 0),
  is_late boolean not null default false,
  original_operating_day_id uuid references public.operating_days(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  finalized_by uuid references public.profiles(id) on delete set null,
  unique (operating_day_id, captain_id),
  check (collected_amount is null or collected_amount >= 0),
  check (deposited_amount is null or deposited_amount >= 0)
);
create index deposit_cases_dashboard_idx on public.deposit_cases (tenant_id, operating_day_id, status, payment_method);

-- WhatsApp/API messages and files; save raw payload safely for diagnosis without using it as a source of truth.
create table public.incoming_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  provider text not null,
  provider_message_id text not null,
  sender_phone text not null,
  captain_id uuid references public.captains(id) on delete set null,
  received_at timestamptz not null,
  text_body text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, provider, provider_message_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  message_id uuid references public.incoming_messages(id) on delete set null,
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 text,
  created_at timestamptz not null default now(),
  unique (tenant_id, sha256)
);

-- Reference catalogue: a model is configured once and can be retired without
-- changing historical extraction records.
create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  model_key text not null,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, model_key)
);

-- The business evidence is separate from each AI attempt that reads it.
create table public.deposit_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  message_id uuid references public.incoming_messages(id) on delete set null,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  captain_id uuid references public.captains(id) on delete set null,
  deposit_case_id uuid references public.deposit_cases(id) on delete set null,
  evidence_type public.evidence_type not null,
  status public.evidence_status not null default 'received',
  received_at timestamptz not null default now(),
  rejection_reason text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  archive_reason text,
  unique (message_id, evidence_type),
  unique (media_asset_id, evidence_type)
);
create index deposit_evidence_unlinked_idx on public.deposit_evidence (tenant_id, captain_id, status, received_at desc) where deposit_case_id is null;

create table public.evidence_extractions (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.deposit_evidence(id) on delete cascade,
  ai_model_id uuid references public.ai_models(id) on delete restrict,
  status public.extraction_status not null default 'queued',
  extraction_schema_version text not null default 'v1',
  extracted_amount numeric(14,3),
  extracted_collected_amount numeric(14,3),
  extracted_deliveries integer,
  extracted_distance_km numeric(10,3),
  extracted_payment_method public.payment_method,
  extracted_business_date date,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  normalized_output jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  failure_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (extracted_amount is null or extracted_amount >= 0),
  check (extracted_collected_amount is null or extracted_collected_amount >= 0)
);
create index evidence_extractions_queue_idx on public.evidence_extractions (created_at) where status in ('queued', 'needs_review');
create index evidence_extractions_history_idx on public.evidence_extractions (evidence_id, created_at desc);

-- Immutable timeline for financial/operational decisions. Do not update or delete these rows.
create table public.deposit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  deposit_case_id uuid not null references public.deposit_cases(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  evidence_id uuid references public.deposit_evidence(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index deposit_events_case_idx on public.deposit_events (deposit_case_id, occurred_at);
create index deposit_cases_attention_idx on public.deposit_cases (tenant_id, operating_day_id, updated_at desc)
  where status in ('awaiting_sijil', 'awaiting_receipt', 'review_required', 'late');
create index deposit_cases_late_idx on public.deposit_cases (tenant_id, original_operating_day_id)
  where is_late;

create table public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  -- Polymorphic target: deposit_case, deposit_evidence, captain, import_batch, or general.
  subject_type public.review_subject_type not null default 'general',
  subject_id uuid,
  status public.review_status not null default 'open',
  priority smallint not null default 2 check (priority between 1 and 5),
  reason_code text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((subject_type = 'general' and subject_id is null) or (subject_type <> 'general' and subject_id is not null))
);
create index review_tasks_inbox_idx on public.review_tasks (tenant_id, priority desc, created_at)
  where status in ('open', 'in_progress');
create index review_tasks_subject_idx on public.review_tasks (tenant_id, subject_type, subject_id, created_at desc)
  where subject_id is not null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  module public.audit_module not null default 'system',
  operation_context public.operation_context not null default 'system',
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  created_at timestamptz not null default now()
);

-- Shared helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.prevent_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception '% on % is not allowed', tg_op, tg_table_name; end;
$$;

create trigger tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger memberships_updated_at before update on public.tenant_memberships for each row execute function public.set_updated_at();
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger captains_updated_at before update on public.captains for each row execute function public.set_updated_at();
create trigger attendance_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();
create trigger cod_updated_at before update on public.cod_records for each row execute function public.set_updated_at();
create trigger deposit_cases_updated_at before update on public.deposit_cases for each row execute function public.set_updated_at();
create trigger deposit_events_no_update before update or delete on public.deposit_events for each row execute function public.prevent_mutation();
create trigger audit_logs_no_update before update or delete on public.audit_logs for each row execute function public.prevent_mutation();
create trigger deposit_evidence_no_delete before delete on public.deposit_evidence for each row execute function public.prevent_mutation();

-- Supabase Row Level Security: frontend users only see their own tenant.
create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = target_tenant_id and m.user_id = auth.uid() and m.is_active
  );
$$;

create or replace function public.has_active_tenant_membership()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.user_id = auth.uid() and m.is_active
  );
$$;

revoke execute on function public.is_tenant_member(uuid) from anon;
revoke execute on function public.has_active_tenant_membership() from anon;

-- tenants is keyed by id, not tenant_id.
alter table public.tenants enable row level security;
create policy tenant_select on public.tenants for select using (public.is_tenant_member(id));

-- Apply the same tenant predicate to each tenant-owned table.
do $$
declare tab text;
begin
  foreach tab in array array['tenant_memberships','cities','teams','captains','operating_days','import_batches','attendance_records','cod_records','deposit_cases','incoming_messages','media_assets','deposit_evidence','deposit_events','review_tasks','audit_logs']
  loop
    execute format('alter table public.%I enable row level security', tab);
    execute format('create policy tenant_select on public.%I for select using (public.is_tenant_member(tenant_id))', tab);
  end loop;
end $$;

-- A user may read only their own sensitive profile. Tenant directories should be
-- exposed later through a dedicated, field-limited view rather than this table.
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select using (id = auth.uid());

-- AI providers/models are a shared, read-only catalogue for authenticated tenant members.
-- Only trusted backend code using service_role may change this catalogue.
alter table public.ai_providers enable row level security;
alter table public.ai_models enable row level security;
create policy ai_providers_select on public.ai_providers for select using (public.has_active_tenant_membership());
create policy ai_models_select on public.ai_models for select using (public.has_active_tenant_membership());

-- import_rows belongs to its batch, so it needs a relationship-based policy.
alter table public.import_rows enable row level security;
create policy import_rows_select on public.import_rows for select using (
  exists (select 1 from public.import_batches b where b.id = batch_id and public.is_tenant_member(b.tenant_id))
);

alter table public.evidence_extractions enable row level security;
create policy evidence_extractions_select on public.evidence_extractions for select using (
  exists (
    select 1 from public.deposit_evidence e
    where e.id = evidence_id and public.is_tenant_member(e.tenant_id)
  )
);

-- Writes to financial tables must use server-side API/RPC with service_role;
-- add narrow role-based INSERT/UPDATE policies only after the API contract is implemented.
