import { requireTenant } from "@/lib/auth/context";
import { listSupervisors } from "@/lib/team/service";
import { LinkForm } from "./link-form";

export default async function TeamPage() {
  const ctx = await requireTenant("team.manage");
  const supervisors = await listSupervisors(ctx.tenantId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">المشرفون</h1>
        <p className="mt-1 text-sm text-muted">
          اربط كل مشرف بحسابه ليرى كباتنه فقط عند الدخول. الحساب يجب أن يكون منشأً مسبقًا في Supabase.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-background text-muted">
            <tr>
              <th className="px-3 py-2 text-start font-medium">الرمز</th>
              <th className="px-3 py-2 text-start font-medium">الاسم</th>
              <th className="px-3 py-2 text-start font-medium">الفريق</th>
              <th className="px-3 py-2 text-start font-medium">كباتن</th>
              <th className="px-3 py-2 text-start font-medium">الحساب</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium" dir="ltr">{s.code}</td>
                <td className="px-3 py-2" dir="auto">{s.name}</td>
                <td className="px-3 py-2" dir="ltr">{s.teamName ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{s.captains}</td>
                <td className="px-3 py-2">
                  <LinkForm supervisorId={s.id} linkedEmail={s.linkedEmail} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
