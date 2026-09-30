<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CapFlow — project notes

Deposit reconciliation SaaS for delivery captains (Jordan, JOD). Multi-tenant; every
business row carries `tenant_id` and is protected by RLS.

## Stack
- Next.js 16 App Router + TypeScript + Tailwind v4, Arabic RTL UI (`lang="ar" dir="rtl"`).
- Supabase project `CapFlow` (`mtrzckcqmgbxlnvkenpk`, eu-central-1, Postgres 17) in the `mjjallad0@gmail.com` account.
- Schema lives in `supabase/migrations/*.sql`; applied via the Supabase MCP `apply_migration`.
  Regenerate `src/lib/supabase/database.types.ts` after every schema change. The generator
  marks all function arguments non-nullable; cast at the call site rather than editing the
  generated file.

## Supabase clients (`src/lib/supabase/`)
- `client.ts` — browser, RLS as the signed-in user.
- `server.ts` — Server Components / Actions / Route Handlers, RLS as the user.
- `admin.ts` — `server-only`, service_role via `SUPABASE_SECRET_KEY`. Only for trusted
  server code (imports, WhatsApp webhook, reconciliation). Never import from client code.
- `proxy.ts` + `src/proxy.ts` — session refresh and login redirect (Next 16 "proxy" = old middleware).

## Rules
- RLS currently grants SELECT only. All writes to financial tables go through server
  code with the admin client until narrow role-based policies exist.
- RLS helper functions live in schema `app_private` (not exposed via PostgREST).
- `deposit_events` and `audit_logs` are append-only (triggers block UPDATE/DELETE).
- Business dates are explicit (`operating_days.business_date`); never derive from UTC timestamps.
- New Supabase projects grant **no** table privileges to API roles by default. Migration
  0004 grants `authenticated` SELECT, `service_role` ALL (plus default privileges for
  future tables). `anon` gets nothing. Keep it that way.
- `profiles` rows are auto-created by the `on_auth_user_created` trigger (migration 0003).
- Imports: `src/lib/imports/<kind>/parse.ts` is pure and unit-tested (`npm test`);
  `service.ts` stages rows via the admin client; applying is a single Postgres function
  (`apply_<kind>_batch`, SECURITY INVOKER, service_role only) so it is atomic.
- Phones are canonical E.164 (`+9627XXXXXXXX`) via `src/lib/phone.ts` everywhere.
- Permissions: `src/lib/auth/permissions.ts` (`can(role, permission)`); pages call
  `requireTenant(permission)` from `src/lib/auth/context.ts`.
- Dates are written with `src/components/date-field.tsx` (three boxes: day / month /
  year, left to right, so read right to left it is year, month, day) and displayed with
  `formatDay` as dd/mm/yyyy. The native `<input type="date">` is not used for typing —
  its format follows the viewer's operating system — but a calendar button opens it via
  `showPicker()` and copies the choice into the three boxes.
- Every data-entry form attaches `advanceOnEnter` from `src/components/form-nav.ts`:
  Enter moves to the next field and submits from the last one, while a textarea keeps
  Enter for newlines. Search forms deliberately do not, so Enter searches straight away.
- Captain search goes through `captainSearchFilter` (`src/lib/captains/search.ts`): name,
  both phone numbers and the platform id, plus the canonical form of a typed phone so
  `0791234567` finds `+962791234567`.
- `branches` holds the activation branches (أبو علندا, شفا بدران, وادي صقرة, الزرقاء);
  `captains.branch_id` points at one.
- `/captains/[id]/vehicles/[vehicleId]/print` is the handover sheet: captain, vehicle,
  condition sketch, damage table and signature lines. `.no-print` hides chrome and
  `globals.css` flips the tokens to black on white for `@media print`.
- Captains belong to a team: **A**, **B** or **FDK**. `captains.vehicle_kinds` is a set
  (`own_car`, `own_scooter`, `company_car`, `company_scooter`) because a captain may ride
  more than one. The day board and the captains list group by team.
- `captains.phone` may be NULL when the number belongs to someone else; such rows carry
  `needs_review`.
- `/captains/[captainId]` is the captain's profile: identity, team, WhatsApp group, photo
  two phone numbers, the referrers who vouched for them (`captains.referrers` jsonb:
  name + relation + phone), contract file number, activation date, photo and notes —
  all editable under `captains.manage`. Scanned papers live in
  `captain_documents` + the private `captain-documents` bucket. Company cars and
  scooters are rows in `vehicles` (model, plate, year, colour, odometer, handover date,
  notes) and the section only appears once the captain has a `company_*` vehicle kind.
  Taking a `company_*` kind off a captain requires a handover date: the form warns, the
  date is required, and the vehicle is released (`captain_id` null, `returned_on` set)
  rather than deleted, so its plate, odometer and sketch stay in the fleet.
  Each vehicle also carries a pre-handover condition sketch: `vehicles.damage_marks` holds
  `{x, y, kind, note}` points as a share (0–1) of the outline drawing, so they stay correct
  at any size. The damage vocabulary lives in `src/components/damage.ts`. Dropping
  `car-top.*` or `scooter-side.*` into `public/vehicle-sketch/` replaces the built-in
  vector outline with that picture (see `src/lib/captains/sketch.ts`); marks are shares
  of the drawing, so swapping the picture never moves an existing mark. Both buckets are private
  and shown through short-lived signed URLs (`next/image` with `unoptimized`). Every edit
  writes an `audit_logs` row with only the changed fields.
- `deposit_cases` has two foreign keys to `operating_days`, so embeds must name the
  constraint: `operating_days!deposit_cases_operating_day_id_fkey(...)`.
- `public.current_business_date(tenant)` mirrors Diken's `current_work_date()`: before
  `day_start_time` (16:00 Amman) the current business day is still yesterday.

## Working agreement
Everything in `deposit_cases`, `cod_records`, `attendance_records`, `deposit_events`
and `import_batches` today is **test data** from trial imports (business date
2026-09-17). We keep building and refining until the user calls "phase zero"; only
when the user explicitly asks do we wipe those tables and start recording real days.
Never delete operational data before that word comes. The captain roster, supervisors
and teams are real and stay.

## Legacy Diken project (read-only)
The live system runs on a separate Supabase project **diken** (`debozlnlomrehhamokkh`,
same gmail org). It is the source of the captain roster and of the rules as code
(`current_work_date`, `upsert_deposit`, `process_cod_file`, `sync_captains`, …).
**Never write to it.** Read with the Supabase MCP and port behaviour into CapFlow.
`scripts/sync-captains-from-diken.mjs` loads a captains export into CapFlow
(dry run by default, `--apply` to write).

## Source of truth for business rules
The operator's own rules doc (Arabic, Claude Docs — read it with the docs connector,
never web-fetch): https://claude.ai/code/artifact/19c32bd2-7053-45d0-84b8-50e436a03b8e
It describes the *current* n8n + Supabase + Sheets system and its recommendations for
this app. Where this file and that doc disagree, ask the user before changing behaviour.

## Daily cycle (business rules, confirmed with the operator)
- Operating day D runs 16:00 on D → 16:00 on D+1 (`tenants.day_start_time`). The morning
  COD file is dated D+1 but belongs to D (`suggestCodBusinessDate`).
- Sources: **COD** `Rider details.xlsx` (authoritative attendance + `collected_amount` =
  `actual_amount`), **Rider** `Rider Performance.xlsx` (`completed_deliveries`, only
  `Working Days = 1` rows are staged), captain deposit (manual now, WhatsApp later).
  The night Review CSV is not imported (COD supersedes it).
- `captains.deduction_mode` is the agreement, snapshotted onto each case:
  `none` (hands in everything), `per_order` (keeps `deduction_rate` × delivered orders),
  `payouts` (keeps what the app owes him that day — the supervisor types the amount when
  recording the deposit, e.g. collected 50, payouts 20, so he deposits 30).
- Money: `expected = collected − deduction_rate × deliveries − payout_deduction`;
  `withdrawn = collected − deposited` is always recorded. deposited ≥ expected → `matched`,
  else `review_required` (needs a payouts screenshot). Rate lives on `captains.deduction_rate`
  (0 / 0.5 / 1, set by supervisor) and is snapshotted onto the case at creation.
- Deadlines: deposit by 01:30 on D+1 (`is_late`), grace to 11:50, then `escalated` to the
  parent platform (account restricted 12:00). Time-based transitions are not automated yet.
- Absence is implicit: no COD/Rider row → no attendance row. Never materialize "leave" rows.
- Worked (Rider) but absent from COD = card-only day: case with collected 0, payment_method
  visa, matched. `awaiting_sijil` is only for days where the COD file never arrived.
- Apply functions: `apply_cod_batch`, `apply_rider_batch`, `record_deposit`,
  `app_private.evaluate_deposit_case`. `operating_day_summaries` view feeds `/days`.
