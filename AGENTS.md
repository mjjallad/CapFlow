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
  Regenerate `src/lib/supabase/database.types.ts` after every schema change.

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

## Daily cycle (business rules, confirmed with the operator)
- Operating day D runs 16:30 on D → 16:30 on D+1 (`tenants.day_start_time`). The morning
  COD file is dated D+1 but belongs to D (`suggestCodBusinessDate`).
- Sources: **COD** `Rider details.xlsx` (authoritative attendance + `collected_amount` =
  `actual_amount`), **Rider** `Rider Performance.xlsx` (`completed_deliveries`, only
  `Working Days = 1` rows are staged), captain deposit (manual now, WhatsApp later).
  The night Review CSV is not imported (COD supersedes it).
- Money: `expected = collected − deduction_rate × deliveries − payout_deduction`;
  `withdrawn = collected − deposited` is always recorded. deposited ≥ expected → `matched`,
  else `review_required` (needs a payouts screenshot). Rate lives on `captains.deduction_rate`
  (0 / 0.5 / 1, set by supervisor) and is snapshotted onto the case at creation.
- Deadlines: deposit by 01:30 on D+1 (`is_late`), grace to 11:50, then `escalated` to the
  parent platform (account restricted 12:00). Time-based transitions are not automated yet.
- Absence is implicit: no COD/Rider row → no attendance row. Never materialize "leave" rows.
- Apply functions: `apply_cod_batch`, `apply_rider_batch`, `record_deposit`,
  `app_private.evaluate_deposit_case`. `operating_day_summaries` view feeds `/days`.
