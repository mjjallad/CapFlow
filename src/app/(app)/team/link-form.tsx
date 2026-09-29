"use client";

import { useActionState } from "react";
import { linkSupervisor, unlinkSupervisor, type LinkState } from "./actions";

export function LinkForm({ supervisorId, linkedEmail }: { supervisorId: string; linkedEmail: string | null }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(linkSupervisor, {});
  const [unlinkState, unlinkAction, unlinking] = useActionState<LinkState, FormData>(unlinkSupervisor, {});

  if (linkedEmail) {
    return (
      <form action={unlinkAction} className="flex items-center gap-2 text-sm">
        <input type="hidden" name="supervisorId" value={supervisorId} />
        <span dir="ltr">{linkedEmail}</span>
        <button type="submit" disabled={unlinking} className="text-xs text-muted hover:text-danger disabled:opacity-50">
          {unlinking ? "…" : "فك الربط"}
        </button>
        {unlinkState.error && <span className="text-xs text-danger">{unlinkState.error}</span>}
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="supervisorId" value={supervisorId} />
      <input
        name="email"
        type="email"
        required
        placeholder="بريد الحساب"
        dir="ltr"
        className="w-52 rounded border border-border bg-surface px-2 py-1 outline-none focus:border-accent"
      />
      <button type="submit" disabled={pending} className="rounded border border-border px-3 py-1 hover:bg-background disabled:opacity-50">
        {pending ? "…" : "ربط"}
      </button>
      {state.error && <span className="basis-full text-xs text-danger">{state.error}</span>}
    </form>
  );
}
