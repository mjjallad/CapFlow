import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

// Privileged client: bypasses RLS. Only for trusted server code
// (imports, WhatsApp webhook, reconciliation RPCs). Never import from client components.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing environment variable: SUPABASE_SECRET_KEY");

  return createSupabaseClient<Database>(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
