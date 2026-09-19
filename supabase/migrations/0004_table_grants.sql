-- New Supabase projects grant no data privileges to the API roles by default.
-- Grant exactly what the app design needs:
--   authenticated : SELECT only (RLS narrows rows to the user's tenant)
--   anon          : nothing (login goes through Auth, not tables)
--   service_role  : full access for trusted server code (admin client)

grant select on all tables in schema public to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Same rules for tables created by future migrations (run as postgres).
alter default privileges for role postgres in schema public grant select on tables to authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant usage, select on sequences to service_role;
