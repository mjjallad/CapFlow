-- Create a public.profiles row for every new auth user so memberships can
-- reference it immediately. Runs as the trigger owner (postgres), so it can
-- write to profiles regardless of RLS.

create or replace function app_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- Backfill users created before this trigger existed.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
