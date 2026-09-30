-- What the captain is allowed to keep out of the cash he collected. Agreed per
-- captain and snapshotted onto each day's case so history never shifts:
--   none      → hands in everything
--   per_order → keeps deduction_rate × delivered orders
--   payouts   → keeps what the app owes him that day (payout_deduction)
create type public.deduction_mode as enum ('none', 'per_order', 'payouts');

alter table public.captains
  add column if not exists deduction_mode public.deduction_mode not null default 'none';

update public.captains set deduction_mode = 'per_order' where deduction_rate > 0;

alter table public.deposit_cases
  add column if not exists deduction_mode public.deduction_mode not null default 'none';

update public.deposit_cases set deduction_mode = 'per_order' where deduction_rate > 0;

-- A referrer is the person who vouched for the captain: name, how they are
-- related, and a phone to reach them on.
update public.captains
set referrers = (
  select jsonb_agg(jsonb_build_object(
    'name', r ->> 'name',
    'relation', coalesce(r ->> 'relation', ''),
    'phone', coalesce(r ->> 'phone', '')
  ))
  from jsonb_array_elements(referrers) r
)
where jsonb_array_length(referrers) > 0;
