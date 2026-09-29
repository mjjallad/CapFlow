// One-off sync: load the captain roster exported from the legacy Diken project
// (read-only export, saved as a JSON file) into CapFlow.
//
//   node scripts/sync-captains-from-diken.mjs <export-file> [--apply]
//
// Without --apply it only reports what would change. Diken itself is never touched.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TENANT_SLUG = "demo";
const CHUNK = 500;

const [, , exportPath, ...flags] = process.argv;
const apply = flags.includes("--apply");
if (!exportPath) {
  console.error("usage: node scripts/sync-captains-from-diken.mjs <export-file> [--apply]");
  process.exit(1);
}

// Columns in the export, in order.
const COLS = [
  "user_id", "name", "phone", "city", "team", "supervisor_code",
  "sc_name", "group_label", "team_leader", "active", "needs_review",
  "review_note", "source_sheet",
];

// Supervisors as defined in Diken (code → display name).
const SUPERVISORS = {
  "A.K": "احمد كريك", "A.S": "عمرو", "A.SH": "قنديل", "FDK.R": "رامي وظيفة ثابتة",
  "FDK.S": "سكوتر كهرباء", "H.Z": "حسين زازا", "M.J": "محمد الجلاد", "M.MAH": "أبو سفاقة",
  "M.S": "ماهر السرخي", "M.SH": "محمود شريم", "O.SH": "جاسم", "R.D": "روحي", "Z.I": "سمور",
};

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  const local = digits.startsWith("962") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^7[789]\d{7}$/.test(local) ? `+962${local}` : null;
}

async function loadEnv() {
  const text = await readFile(path.resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

/** Extracts the rows array from the persisted MCP result wrapper. */
async function loadExport(file) {
  const raw = await readFile(file, "utf8");
  const text = JSON.parse(raw).result ?? raw;
  const start = text.indexOf("[{");
  const end = text.lastIndexOf("}]");
  if (start < 0 || end < 0) throw new Error("could not locate the JSON payload in the export");
  const payload = JSON.parse(text.slice(start, end + 2));
  const rows = payload[0]?.rows;
  if (!Array.isArray(rows)) throw new Error("export has no 'rows' array");
  return rows.map((r) => Object.fromEntries(COLS.map((c, i) => [c, r[i]])));
}

async function main() {
  await loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const incoming = await loadExport(exportPath);
  console.log(`export: ${incoming.length} captains`);

  const { data: tenant, error: tErr } = await db.from("tenants").select("id").eq("slug", TENANT_SLUG).single();
  if (tErr) throw tErr;
  const tenantId = tenant.id;

  // --- reference data ------------------------------------------------------
  const teamNames = [...new Set(incoming.map((r) => r.team).filter(Boolean))];
  const cityNames = [...new Set(incoming.map((r) => r.city).filter(Boolean))];

  if (apply) {
    if (teamNames.length)
      await must(db.from("teams").upsert(teamNames.map((name) => ({ tenant_id: tenantId, name })), { onConflict: "tenant_id,name" }));
    if (cityNames.length)
      await must(db.from("cities").upsert(cityNames.map((name) => ({ tenant_id: tenantId, name })), { onConflict: "tenant_id,name" }));
  }

  const teams = await idMap(db, "teams", tenantId);
  const cities = await idMap(db, "cities", tenantId);

  if (apply) {
    await must(
      db.from("supervisors").upsert(
        Object.entries(SUPERVISORS).map(([code, name]) => ({
          tenant_id: tenantId,
          code,
          name,
          team_id: teams.get(code.startsWith("FDK") ? "FDK" : null) ?? null,
        })),
        { onConflict: "tenant_id,code" },
      ),
    );
  }
  const { data: supRows } = await db.from("supervisors").select("id, code").eq("tenant_id", tenantId);
  const supervisors = new Map((supRows ?? []).map((s) => [s.code, s.id]));

  // --- phone conflicts -----------------------------------------------------
  // CapFlow enforces one phone per captain per tenant. Where a number moved to a
  // different captain, clear it from the old one before writing the new roster.
  const existing = await selectAll(db, "captains", "external_user_id, phone", (q) =>
    q.eq("tenant_id", tenantId).not("phone", "is", null),
  );
  const phoneOwner = new Map(existing.map((c) => [c.phone, c.external_user_id]));

  const wanted = new Map();
  for (const r of incoming) {
    const phone = normalizePhone(r.phone);
    if (phone) wanted.set(phone, r.user_id);
  }
  const toClear = [...wanted].filter(([phone, uid]) => phoneOwner.has(phone) && phoneOwner.get(phone) !== uid).map(([phone]) => phoneOwner.get(phone));

  console.log(`phones to detach from previous owners: ${toClear.length}`);
  if (apply && toClear.length) {
    for (const part of chunks(toClear, CHUNK)) {
      await must(db.from("captains").update({ phone: null }).eq("tenant_id", tenantId).in("external_user_id", part));
    }
  }

  // --- captains ------------------------------------------------------------
  const unknownSupervisors = new Set();
  const noPhone = [];
  const payload = incoming.map((r) => {
    const phone = normalizePhone(r.phone);
    if (!phone && r.phone) noPhone.push(r.user_id);
    if (r.supervisor_code && !supervisors.has(r.supervisor_code)) unknownSupervisors.add(r.supervisor_code);
    return {
      tenant_id: tenantId,
      external_user_id: r.user_id,
      full_name: r.name ?? r.user_id,
      phone,
      city_id: cities.get(r.city) ?? null,
      team_id: teams.get(r.team) ?? null,
      supervisor_id: supervisors.get(r.supervisor_code) ?? null,
      service_center_name: r.sc_name ?? null,
      group_label: r.group_label ?? null,
      team_leader_name: r.team_leader ?? null,
      status: r.active ? "active" : "inactive",
      needs_review: Boolean(r.needs_review),
      review_note: r.review_note ?? null,
      source_sheet: r.source_sheet ?? null,
      archived_at: null,
    };
  });

  if (unknownSupervisors.size) console.log("supervisor codes with no row:", [...unknownSupervisors].join(", "));
  if (noPhone.length) console.log(`captains whose phone could not be normalized: ${noPhone.length} (${noPhone.slice(0, 5).join(", ")})`);

  if (!apply) {
    console.log("dry run — nothing written. Re-run with --apply");
    return;
  }

  let written = 0;
  for (const part of chunks(payload, CHUNK)) {
    await must(db.from("captains").upsert(part, { onConflict: "tenant_id,external_user_id" }));
    written += part.length;
    process.stdout.write(`\rupserted ${written}/${payload.length}`);
  }
  console.log("");

  const { count } = await db.from("captains").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  console.log(`captains in CapFlow now: ${count}`);
}

/** PostgREST caps a response at 1000 rows, so page through the whole table. */
async function selectAll(db, table, columns, refine = (q) => q, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await refine(db.from(table).select(columns)).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function idMap(db, table, tenantId) {
  const { data, error } = await db.from(table).select("id, name").eq("tenant_id", tenantId);
  if (error) throw error;
  return new Map(data.map((r) => [r.name, r.id]));
}

async function must(promise) {
  const { error } = await promise;
  if (error) throw new Error(`${error.message}${error.details ? ` — ${error.details}` : ""}`);
}

function* chunks(items, size) {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

main().catch((err) => {
  console.error("failed:", err.message);
  process.exit(1);
});
