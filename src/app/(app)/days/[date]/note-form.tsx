"use client";

import { useActionState } from "react";
import { submitSupervisorNote, type NoteState } from "./actions";

export function NoteForm({
  caseId,
  businessDate,
  note,
}: {
  caseId: string;
  businessDate: string;
  note: string | null;
}) {
  const [state, action, pending] = useActionState<NoteState, FormData>(submitSupervisorNote, {});

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="businessDate" value={businessDate} />
      <input
        name="note"
        defaultValue={note ?? ""}
        placeholder="ملاحظة"
        className="w-28 rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <button type="submit" disabled={pending} className="text-xs text-muted hover:text-foreground disabled:opacity-50">
        {pending ? "…" : state.saved ? "✓" : "حفظ"}
      </button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
