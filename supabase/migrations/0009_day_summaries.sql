-- Per-day totals for the days list. security_invoker so RLS on deposit_cases
-- still applies to whoever queries the view.
create or replace view public.operating_day_summaries
with (security_invoker = true) as
select
  d.id                                                         as operating_day_id,
  d.tenant_id,
  d.business_date,
  d.status,
  count(c.id)::integer                                         as cases,
  coalesce(sum(c.collected_amount), 0)::numeric(14,3)          as collected_total,
  coalesce(sum(c.expected_amount), 0)::numeric(14,3)           as expected_total,
  coalesce(sum(c.deposited_amount), 0)::numeric(14,3)          as deposited_total,
  count(c.id) filter (where c.status in ('awaiting_sijil', 'awaiting_receipt'))::integer as awaiting,
  count(c.id) filter (where c.status in ('late', 'escalated'))::integer                  as overdue,
  count(c.id) filter (where c.status = 'review_required')::integer                       as review,
  count(c.id) filter (where c.status in ('matched', 'approved'))::integer                as settled
from public.operating_days d
left join public.deposit_cases c on c.operating_day_id = d.id
group by d.id;

grant select on public.operating_day_summaries to authenticated, service_role;
