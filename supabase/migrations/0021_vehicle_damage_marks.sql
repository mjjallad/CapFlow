-- Condition sketch taken before the vehicle is handed to the captain: each mark
-- is a point on the outline drawing, stored as a share of the drawing's width and
-- height so it survives any redraw:
--   [{ "x": 0.42, "y": 0.18, "kind": "dent", "note": "باب السائق" }]
alter table public.vehicles
  add column if not exists damage_marks jsonb not null default '[]'::jsonb,
  add column if not exists inspected_on date;

alter table public.vehicles
  add constraint vehicles_damage_marks_is_array check (jsonb_typeof(damage_marks) = 'array');
