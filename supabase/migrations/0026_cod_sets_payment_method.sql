-- COD is the authority on who worked and what he owes, so it also decides the
-- payment method: an amount owed means cash, zero means the day was all card.
-- The Rider report only completes it (orders, and the card-only riders COD omits).

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
  v_method     public.payment_method;
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
    select id, deduction_rate, deduction_mode into v_captain from public.captains
    where tenant_id = v_batch.tenant_id and external_user_id = v_row.d ->> 'external_user_id' and archived_at is null;

    if v_captain.id is null then
      update public.import_rows
      set is_valid = false, error_messages = error_messages || to_jsonb(array['كابتن غير معروف'])
      where id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_collected := (v_row.d ->> 'collected_amount')::numeric;
    v_method := (case when coalesce(v_collected, 0) > 0 then 'cash' else 'visa' end)::public.payment_method;

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

    insert into public.deposit_cases (tenant_id, operating_day_id, captain_id, collected_amount, payment_method,
                                      deduction_rate, deduction_mode, status)
    values (v_batch.tenant_id, v_day.id, v_captain.id, v_collected, v_method,
            v_captain.deduction_rate, v_captain.deduction_mode, 'awaiting_receipt')
    on conflict (operating_day_id, captain_id) do update set
      collected_amount = excluded.collected_amount,
      -- A case the Rider import opened as card-only becomes cash once COD says so.
      payment_method   = excluded.payment_method
    where public.deposit_cases.finalized_at is null
    returning id into v_case_id;

    if v_case_id is not null then
      perform app_private.evaluate_deposit_case(v_case_id);
      insert into public.deposit_events (tenant_id, deposit_case_id, event_type, actor_user_id, payload)
      values (v_batch.tenant_id, v_case_id, 'cod_imported', p_actor,
              jsonb_build_object('batch_id', p_batch_id, 'collected_amount', v_collected, 'payment_method', v_method));
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

revoke all on function public.apply_cod_batch(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_cod_batch(uuid, uuid) to service_role;

-- Cases imported before this rule existed never had a method set.
update public.deposit_cases
set payment_method = (case when coalesce(collected_amount, 0) > 0 then 'cash' else 'visa' end)::public.payment_method
where payment_method = 'unknown' and collected_amount is not null;
