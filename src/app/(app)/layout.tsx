import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await getAppContext();

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-5">
            <Link href="/" className="font-semibold">
              CapFlow
            </Link>
            <Link href="/captains" className="text-sm text-muted hover:text-foreground">
              الكباتن
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted" dir="ltr">
              {ctx.email}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
