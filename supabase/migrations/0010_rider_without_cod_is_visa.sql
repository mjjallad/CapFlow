-- Rule confirmed with the operator: the COD export lists every rider who owes
-- cash. A rider who worked (Rider report) but is absent from COD had all orders
-- paid by card, so nothing is owed: collected = 0, payment_method = visa, matched.
-- awaiting_sijil is reserved for days where the COD file itself never arrived.

create or replace function public.apply_rider_batch(p_batch_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch     public.import_batches%rowtype;
  v_day       public.operating_days%rowtype;
  v_row       record;
  v_captain   record;
  v_case_id   uuid;
  v_deliveries integer;
  v_applied   integer := 0;
  v_visa      integer := 0;
  v_skipped   integer := 0;
begin
  select * into v_batch from public.import_batches where id = p_batch_id for update;
  if not found then raise exception 'import batch % not found', p_batch_id; end if;
  if v_batch.kind <> 'rider' then raise exception 'batch % is a % import, not rider', p_batch_id, v_batch.kind; end if;
  if v_batch.status <> 'needs_review' then raise exception 'batch % has status % and cannot be applied', p_batch_id, v_batch.status; end if;
  if v_batch.operating_day_id is null then raise exception 'batch % has no operating day', p_batch_id; end if;

  select * into v_day from public.operating_days where id = v_batch.operating_day_id for update;
  if v_day.status = 'closed' then raise exception 'operating day % is closed', v_day.business_date; end if;

  for v_row in
    select r.id, r.normalized_data as d from public.import_rows r
    where r.batch_id = p_batch_id and r.is_valid order by r.row_number
  loop
    select id, deduction_rate into v_captain from public.captains
    where tenant_id = v_batch.tenant_id and external_user_id = v_row.d ->> 'external_user_id' and archived_at is null;

    if v_captain.id is null then
      update public.import_rows
      set is_valid = false, error_messages = error_messages || to_jsonb(array['كابتن غير معروف'])
      where id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_deliveries := (v_row.d ->> 'completed_deliveries')::integer;

    insert into public.attendance_records (tenant_id, operating_day_id, captain_id, status, import_batch_id, recorded_by)
    values (v_batch.tenant_id, v_day.id, v_captain.id, 'present', p_batch_id, p_actor)
    on conflict (operating_day_id, captain_id) do nothing;

    -- Existing case (from COD): add the deliveries and re-evaluate.
    update public.deposit_cases
    set completed_deliveries = v_deliveries
    where operating_day_id = v_day.id and captain_id = v_captain.id and finalized_at is null
    returning id into v_case_id;

    if v_case_id is null then
      if exists (select 1 from public.deposit_cases where operating_day_id = v_day.id and captain_id = v_captain.id) then
        v_applied := v_applied + 1; -- finalized case: leave untouched
        continue;
      end if;
      -- Worked but not in COD: card-only day, nothing to hand in.
      insert into public.deposit_cases (tenant_id, operating_day_id, captain_id, collected_amount, completed_deliveries,
                                        deduction_rate, payment_method, status)
      values (v_batch.tenant_id, v_day.id, v_captain.id, 0, v_deliveries, v_captain.deduction_rate, 'visa', 'matched')
      returning id into v_case_id;
      v_visa := v_visa + 1;
    end if;

    perform app_private.evaluate_deposit_case(v_case_id);
    insert into public.deposit_events (tenant_id, deposit_case_id, event_type, actor_user_id, payload)
    values (v_batch.tenant_id, v_case_id, 'rider_imported', p_actor,
            jsonb_build_object('batch_id', p_batch_id, 'completed_deliveries', v_deliveries));

    v_applied := v_applied + 1;
  end loop;

  update public.import_batches
  set status = 'applied', applied_at = now(), accepted_rows = v_applied, rejected_rows = rejected_rows + v_skipped
  where id = p_batch_id;

  insert into public.audit_logs (tenant_id, actor_user_id, action, module, operation_context, entity_type, entity_id, after_data)
  values (v_batch.tenant_id, p_actor, 'rider.import.applied', 'imports', 'file_import', 'import_batch', p_batch_id,
          jsonb_build_object('applied', v_applied, 'visa_only', v_visa, 'skipped', v_skipped, 'business_date', v_day.business_date));

  return jsonb_build_object('applied', v_applied, 'visa_only', v_visa, 'skipped', v_skipped);
end;
$$;

-- Backfill: cases created by the previous rule (worked, no COD) become card-only.
with fixed as (
  update public.deposit_cases
  set collected_amount = 0, payment_method = 'visa', status = 'matched'
  where status = 'awaiting_sijil' and collected_amount is null and finalized_at is null
  returning id, tenant_id
)
insert into public.deposit_events (tenant_id, deposit_case_id, event_type, payload)
select tenant_id, id, 'rule_backfill', jsonb_build_object('rule', 'rider_without_cod_is_visa') from fixed;
