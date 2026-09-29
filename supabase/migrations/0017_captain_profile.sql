-- Everything the office keeps about a captain beyond the imported roster:
-- a photo, the national ID, the WhatsApp group they sit in, and free notes.
alter table public.captains
  add column if not exists national_id     text,
  add column if not exists whatsapp_group  text,
  add column if not exists photo_path      text,
  add column if not exists notes           text;

-- The imported `group_label` column already held the WhatsApp channel
-- ("chanel (M.J)1", "O.SH/2"); keep it as the starting value.
update public.captains
set whatsapp_group = group_label
where whatsapp_group is null and group_label is not null;

create unique index if not exists captains_national_id_key
  on public.captains (tenant_id, national_id)
  where national_id is not null;

-- Private bucket: photos are served through short-lived signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captain-photos', 'captain-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
