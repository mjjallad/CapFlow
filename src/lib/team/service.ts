import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type SupervisorRow = {
  id: string;
  code: string;
  name: string;
  teamName: string | null;
  captains: number;
  linkedEmail: string | null;
};

/** Supervisors with their captain counts and the email of the linked account. */
export async function listSupervisors(tenantId: string): Promise<SupervisorRow[]> {
  const admin = createAdminClient();

  const [{ data: supervisors, error }, { data: captains }] = await Promise.all([
    admin
      .from("supervisors")
      .select("id, code, name, membership_id, team:teams(name), membership:tenant_memberships(user_id)")
      .eq("tenant_id", tenantId)
      .order("code"),
    admin.from("captains").select("supervisor_id").eq("tenant_id", tenantId).is("archived_at", null),
  ]);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const c of captains ?? []) {
    if (c.supervisor_id) counts.set(c.supervisor_id, (counts.get(c.supervisor_id) ?? 0) + 1);
  }

  // profiles holds no email, so read the linked addresses from auth.
  const linkedUserIds = new Set((supervisors ?? []).map((s) => s.membership?.user_id).filter(Boolean) as string[]);
  const emails = new Map<string, string>();
  if (linkedUserIds.size) {
    for (let page = 1; page <= 20; page += 1) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      for (const u of data?.users ?? []) if (u.email && linkedUserIds.has(u.id)) emails.set(u.id, u.email);
      if (!data || data.users.length < 200) break;
    }
  }

  return (supervisors ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    teamName: s.team?.name ?? null,
    captains: counts.get(s.id) ?? 0,
    linkedEmail: s.membership?.user_id ? (emails.get(s.membership.user_id) ?? "حساب مرتبط") : null,
  }));
}

/**
 * Links a supervisor row to a person's account: finds their auth user by email,
 * makes sure they are an active member of the tenant with the supervisor role,
 * and points the supervisor row at that membership. Accounts are never created
 * here — the person must already have signed in once.
 */
export async function linkSupervisorAccount(input: {
  tenantId: string;
  supervisorId: string;
  email: string;
}): Promise<{ email: string }> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: supervisor, error: sErr } = await admin
    .from("supervisors")
    .select("id")
    .eq("id", input.supervisorId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!supervisor) throw new Error("المشرف غير موجود");

  // listUsers has no email filter, so page until the address turns up.
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) throw new Error("لا يوجد حساب بهذا البريد. أنشئه أولًا من Supabase ثم أعد المحاولة.");

  const { data: membership, error: mErr } = await admin
    .from("tenant_memberships")
    .upsert(
      { tenant_id: input.tenantId, user_id: userId, role: "supervisor", is_active: true },
      { onConflict: "tenant_id,user_id" },
    )
    .select("id")
    .single();
  if (mErr) throw new Error(`تعذّر إنشاء العضوية: ${mErr.message}`);

  // One membership can only stand for one supervisor.
  await admin
    .from("supervisors")
    .update({ membership_id: null })
    .eq("tenant_id", input.tenantId)
    .eq("membership_id", membership.id);

  const { error: uErr } = await admin
    .from("supervisors")
    .update({ membership_id: membership.id })
    .eq("id", input.supervisorId);
  if (uErr) throw new Error(`تعذّر الربط: ${uErr.message}`);

  return { email };
}

export async function unlinkSupervisorAccount(input: { tenantId: string; supervisorId: string }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("supervisors")
    .update({ membership_id: null })
    .eq("id", input.supervisorId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(`تعذّر فك الربط: ${error.message}`);
}
