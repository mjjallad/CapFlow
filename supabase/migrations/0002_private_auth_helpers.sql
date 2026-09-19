-- Move RLS helper functions out of the API-exposed `public` schema.
-- `app_private` is never added to PostgREST's exposed schemas, so these
-- functions can only be reached from inside the database (RLS policies).

create schema if not exists app_private;
grant usage on schema app_private to authenticated, anon, service_role;

create or replace function app_private.is_tenant_member(target_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = target_tenant_id and m.user_id = auth.uid() and m.is_active
  );
$$;

create or replace function app_private.has_active_tenant_membership()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.user_id = auth.uid() and m.is_active
  );
$$;

-- Policies run with the caller's privileges, so authenticated must keep EXECUTE.
revoke all on function app_private.is_tenant_member(uuid) from public;
revoke all on function app_private.has_active_tenant_membership() from public;
grant execute on function app_private.is_tenant_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_active_tenant_membership() to authenticated, service_role;

alter policy tenant_select on public.tenants using (app_private.is_tenant_member(id));

do $$
declare tab text;
begin
  foreach tab in array array['tenant_memberships','cities','teams','captains','operating_days','import_batches','attendance_records','cod_records','deposit_cases','incoming_messages','media_assets','deposit_evidence','deposit_events','review_tasks','audit_logs']
  loop
    execute format('alter policy tenant_select on public.%I using (app_private.is_tenant_member(tenant_id))', tab);
  end loop;
end $$;

alter policy ai_providers_select on public.ai_providers using (app_private.has_active_tenant_membership());
alter policy ai_models_select on public.ai_models using (app_private.has_active_tenant_membership());

alter policy import_rows_select on public.import_rows using (
  exists (select 1 from public.import_batches b where b.id = batch_id and app_private.is_tenant_member(b.tenant_id))
);

alter policy evidence_extractions_select on public.evidence_extractions using (
  exists (
    select 1 from public.deposit_evidence e
    where e.id = evidence_id and app_private.is_tenant_member(e.tenant_id)
  )
);

drop function public.is_tenant_member(uuid);
drop function public.has_active_tenant_membership();
