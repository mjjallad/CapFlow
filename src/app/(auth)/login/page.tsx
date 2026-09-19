import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/";

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">CapFlow</h1>
        <p className="mb-6 text-sm text-muted">تسجيل الدخول إلى لوحة التسوية</p>
        <LoginForm next={nextPath} />
      </div>
    </main>
  );
}
