// Opt-in end-to-end check against the real Supabase project.
// Run: CAPFLOW_INTEGRATION=1 COD_FILE=... RIDER_FILE=... npx vitest run src/lib/days/integration.test.ts
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const enabled = process.env.CAPFLOW_INTEGRATION === "1";

async function loadEnvLocal() {
  const text = await readFile(path.resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

async function fileFrom(p: string): Promise<File> {
  const buf = await readFile(p);
  return new File([new Uint8Array(buf)], path.basename(p), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe.skipIf(!enabled)("daily cycle (integration)", () => {
  it("stages and applies COD then Rider for one business date", async () => {
    await loadEnvLocal();
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const svc = await import("./service");

    const admin = createAdminClient();
    const { data: tenant } = await admin.from("tenants").select("id").eq("slug", "demo").single();
    const { data: users } = await admin.auth.admin.listUsers();
    const tenantId = tenant!.id;
    const userId = users.users[0].id;
    const businessDate = process.env.BUSINESS_DATE ?? "2026-09-17";

    const codFile = await fileFrom(process.env.COD_FILE!);
    expect(await svc.suggestCodBusinessDate(codFile)).toBe(businessDate);

    const cod = await svc.stageCodImport({ tenantId, userId, file: codFile, businessDate });
    const codResult = await svc.applyCodBatch({ tenantId, userId, batchId: cod.batchId });
    console.log("COD:", JSON.stringify(codResult));
    expect(codResult.applied).toBeGreaterThan(0);

    const riderFile = await fileFrom(process.env.RIDER_FILE!);
    const rider = await svc.stageRiderImport({ tenantId, userId, file: riderFile, businessDate });
    const riderResult = await svc.applyRiderBatch({ tenantId, userId, batchId: rider.batchId });
    console.log("Rider:", JSON.stringify(riderResult));
    expect(riderResult.applied).toBeGreaterThan(0);

    const { data: summary } = await admin
      .from("operating_day_summaries")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("business_date", businessDate)
      .single();
    console.log("Day summary:", JSON.stringify(summary));
    expect(summary!.cases).toBe(codResult.applied + riderResult.visa_only);
  }, 180_000);
});
