-- Atomic apply functions for the daily reports and for recording a deposit.
-- All are SECURITY INVOKER and executable by service_role only.

-- Morning COD export ("Rider details"): the authoritative list of who worked
-- on the operating day and how much each captain owes.
create or replace function public.apply_cod_batch(p_batch_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch      public.import_batches%rowtype;
  v_day        public.operating_days%rowtype;
  v_row        record;
  v_captain    record;
  v_case_id    uuid;
  v_collected  numeric(14,3);
  v_applied    integer := 0;
  v_skipped    integer := 0;
begin
  select * into v_batch from public.import_batches where id = p_batch_id for update;
  if not found then raise exception 'import batch % not found', p_batch_id; end if;
  if v_batch.kind <> 'cod' then raise exception 'batch % is a % import, not cod', p_batch_id, v_batch.kind; end if;
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

    v_collected := (v_row.d ->> 'collected_amount')::numeric;

    insert into public.attendance_records (tenant_id, operating_day_id, captain_id, status, import_batch_id, recorded_by)
    values (v_batch.tenant_id, v_day.id, v_captain.id, 'present', p_batch_id, p_actor)
    on conflict (operating_day_id, captain_id) do update set
      status = 'present', import_batch_id = excluded.import_batch_id, recorded_by = excluded.recorded_by;

    insert into public.cod_records (tenant_id, operating_day_id, captain_id, actual_amount,
                                    cod_collected_amount, paid_at_pickup_amount, wallet_balance, import_batch_id)
    values (v_batch.tenant_id, v_day.id, v_captain.id, v_collected,
            (v_row.d ->> 'cod_collected_amount')::numeric, (v_row.d ->> 'paid_at_pickup_amount')::numeric,
            (v_row.d ->> 'wallet_balance')::numeric, p_batch_id)
    on conflict (operating_day_id, captain_id) do update set
      actual_amount = excluded.actual_amount, cod_collected_amount = excluded.cod_collected_amount,
      paid_at_pickup_amount = excluded.paid_at_pickup_amount, wallet_balance = excluded.wallet_balance,
      import_batch_id = excluded.import_batch_id;

    -- The deduction rate is snapshotted when the case is first created so a
    -- later agreement change never rewrites history.
    insert into public.deposit_cases (tenant_id, operating_day_id, captain_id, collected_amount, deduction_rate, status)
    values (v_batch.tenant_id, v_day.id, v_captain.id, v_collected, v_captain.deduction_rate, 'awaiting_receipt')
    on conflict (operating_day_id, captain_id) do update set collected_amount = excluded.collected_amount
    where public.deposit_cases.finalized_at is null
    returning id into v_case_id;

    if v_case_id is not null then
      perform app_private.evaluate_deposit_case(v_case_id);
      insert into public.deposit_events (tenant_id, deposit_case_id, event_type, actor_user_id, payload)
      values (v_batch.tenant_id, v_case_id, 'cod_imported', p_actor,
              jsonb_build_object('batch_id', p_batch_id, 'collected_amount', v_collected));
    end if;

    v_applied := v_applied + 1;
  end loop;

  update public.import_batches
  set status = 'applied', applied_at = now(), accepted_rows = v_applied, rejected_rows = rejected_rows + v_skipped
  where id = p_batch_id;

  insert into public.audit_logs (tenant_id, actor_user_id, action, module, operation_context, entity_type, entity_id, after_data)
  values (v_batch.tenant_id, p_actor, 'cod.import.applied', 'imports', 'file_import', 'import_batch', p_batch_id,
          jsonb_build_object('applied', v_applied, 'skipped', v_skipped, 'business_date', v_day.business_date));

  return jsonb_build_object('applied', v_applied, 'skipped', v_skipped);
end;
$$;

-- Noon "Rider Performance" export: completed deliveries per rider. Riders who
-- worked but have no COD figure get an awaiting_sijil case.
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
  v_no_cod    integer := 0;
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
    on conflict (operating_day_id, captain_id) do nothing; -- COD already recorded it

    -- Existing case (from COD): just add the deliveries and re-evaluate.
    update public.deposit_cases
    set completed_deliveries = v_deliveries
    where operating_day_id = v_day.id and captain_id = v_captain.id and finalized_at is null
    returning id into v_case_id;

    if v_case_id is null then
      if exists (select 1 from public.deposit_cases where operating_day_id = v_day.id and captain_id = v_captain.id) then
        v_applied := v_applied + 1; -- finalized case: leave untouched
        continue;
      end if;
      -- Worked, but no COD row: needs the captain's sijil to know the amount.
      insert into public.deposit_cases (tenant_id, operating_day_id, captain_id, completed_deliveries, deduction_rate, status)
      values (v_batch.tenant_id, v_day.id, v_captain.id, v_deliveries, v_captain.deduction_rate, 'awaiting_sijil')
      returning id into v_case_id;
      v_no_cod := v_no_cod + 1;
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
          jsonb_build_object('applied', v_applied, 'without_cod', v_no_cod, 'skipped', v_skipped, 'business_date', v_day.business_date));

  return jsonb_build_object('applied', v_applied, 'without_cod', v_no_cod, 'skipped', v_skipped);
end;
$$;

-- Records what the captain deposited (manual entry now, WhatsApp/AI later).
-- p_deposited_at is when the money was deposited, used for the lateness rule.
create or replace function public.record_deposit(
  p_case_id uuid, p_actor uuid, p_amount numeric, p_method public.payment_method,
  p_deposited_at timestamptz, p_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c          public.deposit_cases%rowtype;
  t          public.tenants%rowtype;
  v_day      public.operating_days%rowtype;
  v_deadline timestamptz;
  v_status   public.deposit_status;
begin
  if p_amount is null or p_amount < 0 then raise exception 'amount must be >= 0'; end if;

  select * into c from public.deposit_cases where id = p_case_id for update;
  if not found then raise exception 'deposit case % not found', p_case_id; end if;
  if c.finalized_at is not null then raise exception 'case % is finalized', p_case_id; end if;

  select * into t from public.tenants where id = c.tenant_id;
  select * into v_day from public.operating_days where id = c.operating_day_id;

  -- Deadline is deposit_deadline_time on the calendar day after the business date.
  v_deadline := ((v_day.business_date + 1) + t.deposit_deadline_time) at time zone t.timezone;

  update public.deposit_cases
  set deposited_amount = p_amount,
      payment_method   = coalesce(p_method, payment_method),
      deposited_at     = coalesce(p_deposited_at, now()),
      is_late          = coalesce(p_deposited_at, now()) > v_deadline,
      notes            = case when p_note is null or p_note = '' then notes
                              else concat_ws(E'\n', notes, p_note) end
  where id = p_case_id;

  v_status := app_private.evaluate_deposit_case(p_case_id);

  insert into public.deposit_events (tenant_id, deposit_case_id, event_type, actor_user_id, payload)
  values (c.tenant_id, p_case_id, 'deposit_recorded', p_actor,
          jsonb_build_object('amount', p_amount, 'method', p_method, 'deposited_at', coalesce(p_deposited_at, now()),
                             'status', v_status, 'note', p_note));

  return jsonb_build_object('status', v_status, 'is_late', coalesce(p_deposited_at, now()) > v_deadline);
end;
$$;

revoke all on function public.apply_cod_batch(uuid, uuid) from public, anon, authenticated;
revoke all on function public.apply_rider_batch(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_deposit(uuid, uuid, numeric, public.payment_method, timestamptz, text) from public, anon, authenticated;
grant execute on function public.apply_cod_batch(uuid, uuid) to service_role;
grant execute on function public.apply_rider_batch(uuid, uuid) to service_role;
grant execute on function public.record_deposit(uuid, uuid, numeric, public.payment_method, timestamptz, text) to service_role;
