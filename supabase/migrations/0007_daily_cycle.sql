-- Daily reconciliation cycle: tenant schedule settings, per-captain deduction
-- agreement, richer COD/case columns, and the case evaluation rule.
--
-- Business rules (from the operator):
--   * The operating day D starts at day_start_time (16:30) on D and ends at the
--     same time on D+1. The morning COD file is dated D+1 but belongs to D.
--   * expected deposit = collected − deduction_rate × completed_deliveries − approved app payouts
--   * withdrawn = collected − deposited. It is always recorded; it is only a
--     problem when it exceeds what the agreement allows.
--   * Deposit deadline 01:30 (D+1); grace until 11:50, then the captain's name is
--     escalated to the parent platform and the account is restricted at 12:00.

-- Tenant schedule (all times in the tenant's timezone).
alter table public.tenants
  add column if not exists day_start_time        time not null default '16:30',
  add column if not exists deposit_deadline_time time not null default '01:30',
  add column if not exists grace_deadline_time   time not null default '11:50',
  add column if not exists payroll_cutoff_dow    smallint not null default 1 check (payroll_cutoff_dow between 0 and 6), -- 1 = Monday
  add column if not exists payroll_cutoff_time   time not null default '12:00';

-- Per-captain agreement: how much of the collected cash the captain may keep per delivered order.
alter table public.captains
  add column if not exists deduction_rate numeric(6,3) not null default 0 check (deduction_rate >= 0);

alter type public.import_kind add value if not exists 'rider';
alter type public.deposit_status add value if not exists 'escalated';
alter type public.evidence_type add value if not exists 'payout_screenshot';

-- Extra figures from the COD export, kept for audit and review.
alter table public.cod_records
  add column if not exists cod_collected_amount  numeric(14,3),
  add column if not exists paid_at_pickup_amount numeric(14,3),
  add column if not exists wallet_balance        numeric(14,3);

alter table public.deposit_cases
  add column if not exists deduction_rate    numeric(6,3) not null default 0 check (deduction_rate >= 0),
  add column if not exists payout_deduction  numeric(14,3) not null default 0 check (payout_deduction >= 0),
  add column if not exists deposited_at      timestamptz,
  add column if not exists escalated_at      timestamptz,
  add column if not exists review_reason     text,
  -- Cash the captain may keep under the per-order agreement.
  add column if not exists allowed_deduction numeric(14,3) generated always as
    (deduction_rate * coalesce(completed_deliveries, 0)) stored,
  -- What the captain must actually hand in.
  add column if not exists expected_amount numeric(14,3) generated always as
    (case when collected_amount is null then null
          else greatest(collected_amount - deduction_rate * coalesce(completed_deliveries, 0) - payout_deduction, 0) end) stored,
  -- Cash kept by the captain (always recorded, even when allowed).
  add column if not exists withdrawn_amount numeric(14,3) generated always as
    (case when collected_amount is null or deposited_amount is null then null
          else collected_amount - deposited_amount end) stored;

create index if not exists deposit_cases_captain_day_idx on public.deposit_cases (captain_id, operating_day_id);

-- Re-evaluates a case after any amount changes. Time-based transitions
-- (late/escalated) are handled separately; this only looks at money.
create or replace function app_private.evaluate_deposit_case(p_case_id uuid)
returns public.deposit_status
language plpgsql
set search_path = ''
as $$
declare
  c        public.deposit_cases%rowtype;
  v_status public.deposit_status;
  v_reason text;
begin
  select * into c from public.deposit_cases where id = p_case_id for update;
  if not found then raise exception 'deposit case % not found', p_case_id; end if;

  -- Finalized decisions are never overridden automatically.
  if c.finalized_at is not null then return c.status; end if;

  if c.collected_amount is null then
    -- Worked (per Rider) but no COD figure yet: we need the captain's sijil.
    v_status := 'awaiting_sijil';
  elsif c.deposited_amount is null then
    if c.collected_amount = 0 then
      v_status := 'matched';
    elsif c.status in ('late', 'escalated') then
      v_status := c.status; -- keep the time-based state until money arrives
    else
      v_status := 'awaiting_receipt';
    end if;
  elsif c.deposited_amount + 0.0005 >= c.expected_amount then
    v_status := 'matched';
  else
    v_status := 'review_required';
    v_reason := 'نقص يتجاوز الخصم المسموح — مطلوب صورة المدفوعات';
  end if;

  update public.deposit_cases
  set status = v_status,
      review_reason = case when v_status = 'review_required' then coalesce(review_reason, v_reason) else null end
  where id = p_case_id;

  return v_status;
end;
$$;

revoke all on function app_private.evaluate_deposit_case(uuid) from public;
grant execute on function app_private.evaluate_deposit_case(uuid) to service_role;
