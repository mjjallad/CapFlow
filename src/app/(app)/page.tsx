import { getAppContext } from "@/lib/auth/context";

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  admin: "مدير",
  accountant: "محاسب",
  supervisor: "مشرف",
  reviewer: "مراجع",
  operator: "مشغّل",
  viewer: "مشاهد",
};

export default async function HomePage() {
  const ctx = await getAppContext();

  if (ctx.memberships.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="mb-2 text-lg font-semibold">لا توجد عضوية بعد</h1>
        <p className="text-sm text-muted">
          حسابك مسجّل لكنه غير مرتبط بأي شركة. اطلب من مدير النظام إضافتك.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">شركاتك</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ctx.memberships.map((m) => (
          <li key={m.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-1 font-medium">{m.tenant.name}</div>
            <div className="text-sm text-muted">
              الدور: {ROLE_LABELS[m.role] ?? m.role} · العملة: {m.tenant.currency_code}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
