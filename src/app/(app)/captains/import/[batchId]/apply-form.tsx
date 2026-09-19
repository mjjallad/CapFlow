"use client";

import { useActionState } from "react";
import { applyCaptainsImport, type ApplyState } from "../actions";

export function ApplyForm({ batchId, validCount }: { batchId: string; validCount: number }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyCaptainsImport, {});

  if (state.applied !== undefined) {
    return (
      <p className="rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
        تم تطبيق الدفعة: {state.applied} كابتن أُضيف/حُدّث
        {state.skipped ? `، ${state.skipped} تم تخطّيه` : ""}.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="batchId" value={batchId} />
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || validCount === 0}
        className="self-start rounded-md bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "جارٍ التطبيق…" : `تطبيق ${validCount} صفًّا صالحًا`}
      </button>
    </form>
  );
}
