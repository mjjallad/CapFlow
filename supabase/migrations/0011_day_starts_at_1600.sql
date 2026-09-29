-- The operator's business-rules doc states the operating day runs 16:00 → 16:00,
-- not 16:30 (see AGENTS.md, "Source of truth").
alter table public.tenants alter column day_start_time set default '16:00';
update public.tenants set day_start_time = '16:00' where day_start_time = '16:30';
