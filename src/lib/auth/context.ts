import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type Membership = {
  id: string;
  role: AppRole;
  tenant: { id: string; name: string; slug: string; timezone: string; currency_code: string };
};

export type AppContext = {
  userId: string;
  email: string | null;
  memberships: Membership[];
};

// Loaded once per request. Redirects to /login when there is no valid session.
export const getAppContext = cache(async (): Promise<AppContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("id, role, tenant:tenants!inner(id, name, slug, timezone, currency_code)")
    .eq("is_active", true)
    .order("created_at");

  if (error) throw error;

  return {
    userId: user.id,
    email: user.email ?? null,
    memberships: data.map((m) => ({ id: m.id, role: m.role, tenant: m.tenant })),
  };
});
