-- The supervisor's own note on a case (what they used to type in their sheet),
-- kept apart from the imported note so neither overwrites the other.
alter table public.deposit_cases
  add column if not exists supervisor_note text;

create or replace function public.set_supervisor_note(p_case_id uuid, p_actor uuid, p_note text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.deposit_cases%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into c from public.deposit_cases where id = p_case_id for update;
  if not found then raise exception 'deposit case % not found', p_case_id; end if;

  update public.deposit_cases set supervisor_note = v_note where id = p_case_id;

  insert into public.deposit_events (tenant_id, deposit_case_id, event_type, actor_user_id, payload)
  values (c.tenant_id, p_case_id, 'supervisor_note', p_actor,
          jsonb_build_object('from', c.supervisor_note, 'to', v_note));

  return v_note;
end;
$$;

revoke all on function public.set_supervisor_note(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_supervisor_note(uuid, uuid, text) to service_role;

-- Per-supervisor totals for one operating day, used by the day board's filter bar.
create or replace view public.day_supervisor_summaries
with (security_invoker = true) as
select
  c.tenant_id,
  c.operating_day_id,
  s.id   as supervisor_id,
  s.code as supervisor_code,
  s.name as supervisor_name,
  count(*)::integer                                    as cases,
  coalesce(sum(c.collected_amount), 0)::numeric(14,3)  as collected_total,
  coalesce(sum(c.deposited_amount), 0)::numeric(14,3)  as deposited_total,
  count(*) filter (where c.status in ('awaiting_sijil', 'awaiting_receipt'))::integer as awaiting,
  count(*) filter (where c.status in ('late', 'escalated'))::integer                  as overdue,
  count(*) filter (where c.status = 'review_required')::integer                       as review
from public.deposit_cases c
join public.captains k on k.id = c.captain_id
join public.supervisors s on s.id = k.supervisor_id
group by c.tenant_id, c.operating_day_id, s.id, s.code, s.name;

grant select on public.day_supervisor_summaries to authenticated, service_role;
