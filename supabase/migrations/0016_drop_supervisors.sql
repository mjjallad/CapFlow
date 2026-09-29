-- The supervisor layer no longer exists in the business: the company runs three
-- teams (A, B, FDK). Everything derived from it — the team assignment and the
-- FDK vehicle split — already lives on the captain, so the layer is dropped.
-- The original rows remain in the read-only Diken project if ever needed.

drop view if exists public.day_supervisor_summaries;

alter table public.captains drop column if exists supervisor_id;

drop table if exists public.supervisors;
