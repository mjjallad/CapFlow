import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadApplicableBatch, stageImport } from "@/lib/imports/stage";
import { parseCaptainRows } from "./parse";

export async function stageCaptainsImport(input: { tenantId: string; userId: string; file: File }) {
  return stageImport({
    kind: "captains",
    tenantId: input.tenantId,
    userId: input.userId,
    file: input.file,
    parse: (sheet) => {
      const { rows, missingRequired } = parseCaptainRows(sheet.headers, sheet.rows);
      return {
        rows,
        fatalError: missingRequired.length ? `أعمدة إلزامية مفقودة: ${missingRequired.join(", ")}` : undefined,
      };
    },
  });
}

export async function applyCaptainsBatch(input: {
  tenantId: string;
  userId: string;
  batchId: string;
}): Promise<{ applied: number; skipped: number }> {
  await loadApplicableBatch({ tenantId: input.tenantId, batchId: input.batchId, kind: "captains" });
  const admin = createAdminClient();
  const rpc = await admin.rpc("apply_captains_batch", { p_batch_id: input.batchId, p_actor: input.userId });
  if (rpc.error) throw new Error(`فشل التطبيق: ${rpc.error.message}`);
  return rpc.data as { applied: number; skipped: number };
}
