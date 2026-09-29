"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { linkSupervisorAccount, unlinkSupervisorAccount } from "@/lib/team/service";

export type LinkState = { error?: string; linked?: string };

export async function linkSupervisor(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const ctx = await requireTenant("team.manage");
  const supervisorId = String(formData.get("supervisorId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!supervisorId) return { error: "المشرف مفقود." };
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) return { error: "أدخل بريدًا صالحًا." };

  try {
    const { email: linked } = await linkSupervisorAccount({ tenantId: ctx.tenantId, supervisorId, email });
    revalidatePath("/team");
    return { linked };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر الربط." };
  }
}

export async function unlinkSupervisor(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const ctx = await requireTenant("team.manage");
  const supervisorId = String(formData.get("supervisorId") ?? "");
  if (!supervisorId) return { error: "المشرف مفقود." };

  try {
    await unlinkSupervisorAccount({ tenantId: ctx.tenantId, supervisorId });
    revalidatePath("/team");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر فك الربط." };
  }
}
