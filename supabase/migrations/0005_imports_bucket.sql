-- Private bucket for uploaded import files (captains, attendance, COD).
-- No storage policies: only trusted server code (service_role) reads or writes it,
-- so users can never fetch another tenant's raw uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imports',
  'imports',
  false,
  10485760, -- 10 MB
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
)
on conflict (id) do nothing;
