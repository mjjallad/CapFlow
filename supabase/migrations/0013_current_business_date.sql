-- Same rule as Diken's current_work_date(), but per tenant: before the day's
-- start time (16:00 Amman) the clock still belongs to yesterday's business day.
create or replace function public.current_business_date(p_tenant_id uuid)
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when (now() at time zone t.timezone)::time < t.day_start_time
      then (now() at time zone t.timezone)::date - 1
      else (now() at time zone t.timezone)::date
  end
  from public.tenants t
  where t.id = p_tenant_id;
$$;

revoke all on function public.current_business_date(uuid) from public, anon;
grant execute on function public.current_business_date(uuid) to authenticated, service_role;
