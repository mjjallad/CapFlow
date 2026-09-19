-- Applies a validated captains import in one transaction:
--   * creates missing cities/teams for the tenant
--   * upserts captains by (tenant_id, external_user_id)
--   * rejects rows whose phone already belongs to a different captain
--   * marks the batch applied and writes an audit log entry
-- SECURITY INVOKER: only service_role (trusted server code) may execute it.

create or replace function public.apply_captains_batch(p_batch_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch   public.import_batches%rowtype;
  v_row     record;
  v_applied integer := 0;
  v_skipped integer := 0;
begin
  select * into v_batch from public.import_batches where id = p_batch_id for update;
  if not found then
    raise exception 'import batch % not found', p_batch_id;
  end if;
  if v_batch.kind <> 'captains' then
    raise exception 'batch % is a % import, not captains', p_batch_id, v_batch.kind;
  end if;
  if v_batch.status <> 'needs_review' then
    raise exception 'batch % has status % and cannot be applied', p_batch_id, v_batch.status;
  end if;

  insert into public.cities (tenant_id, name)
  select distinct v_batch.tenant_id, r.normalized_data ->> 'city'
  from public.import_rows r
  where r.batch_id = p_batch_id and r.is_valid and nullif(r.normalized_data ->> 'city', '') is not null
  on conflict (tenant_id, name) do nothing;

  insert into public.teams (tenant_id, name)
  select distinct v_batch.tenant_id, r.normalized_data ->> 'team_name'
  from public.import_rows r
  where r.batch_id = p_batch_id and r.is_valid and nullif(r.normalized_data ->> 'team_name', '') is not null
  on conflict (tenant_id, name) do nothing;

  for v_row in
    select r.id, r.normalized_data as d
    from public.import_rows r
    where r.batch_id = p_batch_id and r.is_valid
    order by r.row_number
  loop
    if exists (
      select 1 from public.captains c
      where c.tenant_id = v_batch.tenant_id
        and c.phone = v_row.d ->> 'phone'
        and c.external_user_id is distinct from v_row.d ->> 'external_user_id'
    ) then
      update public.import_rows
      set is_valid = false,
          error_messages = error_messages || to_jsonb(array['رقم الهاتف مستخدم لكابتن آخر'])
      where id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.captains (
      tenant_id, external_user_id, phone, full_name, city_id, team_id,
      service_center_name, group_label, team_leader_name, status
    )
    values (
      v_batch.tenant_id,
      v_row.d ->> 'external_user_id',
      v_row.d ->> 'phone',
      v_row.d ->> 'full_name',
      (select id from public.cities where tenant_id = v_batch.tenant_id and name = v_row.d ->> 'city'),
      (select id from public.teams  where tenant_id = v_batch.tenant_id and name = v_row.d ->> 'team_name'),
      v_row.d ->> 'service_center_name',
      v_row.d ->> 'group_label',
      v_row.d ->> 'team_leader_name',
      coalesce((v_row.d ->> 'status')::public.captain_status, 'active')
    )
    on conflict (tenant_id, external_user_id) do update set
      phone               = excluded.phone,
      full_name           = excluded.full_name,
      city_id             = excluded.city_id,
      team_id             = excluded.team_id,
      service_center_name = excluded.service_center_name,
      group_label         = excluded.group_label,
      team_leader_name    = excluded.team_leader_name,
      status              = excluded.status,
      archived_at         = null;

    v_applied := v_applied + 1;
  end loop;

  update public.import_batches
  set status = 'applied',
      applied_at = now(),
      accepted_rows = v_applied,
      rejected_rows = rejected_rows + v_skipped
  where id = p_batch_id;

  insert into public.audit_logs (
    tenant_id, actor_user_id, action, module, operation_context, entity_type, entity_id, after_data
  ) values (
    v_batch.tenant_id, p_actor, 'captains.import.applied', 'imports', 'file_import',
    'import_batch', p_batch_id, jsonb_build_object('applied', v_applied, 'skipped', v_skipped)
  );

  return jsonb_build_object('applied', v_applied, 'skipped', v_skipped);
end;
$$;

revoke all on function public.apply_captains_batch(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_captains_batch(uuid, uuid) to service_role;
