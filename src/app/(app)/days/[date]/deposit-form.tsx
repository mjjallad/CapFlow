"use client";

import { useActionState, useState } from "react";
import { submitDeposit, type DepositFormState } from "./actions";

export function DepositForm({
  caseId,
  businessDate,
  expectedAmount,
  currency,
}: {
  caseId: string;
  businessDate: string;
  expectedAmount: number | null;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DepositFormState, FormData>(submitDeposit, {});

  if (state.ok) {
    return (
      <span className="text-xs text-emerald-700 dark:text-emerald-300">
        سُجّل{state.isLate ? " (متأخر)" : ""}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-background"
      >
        تسجيل إيداع
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 text-xs">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="businessDate" value={businessDate} />
      <label className="flex flex-col gap-0.5">
        <span className="text-muted">المبلغ ({currency})</span>
        <input
          name="amount"
          type="number"
          step="0.001"
          min="0"
          required
          defaultValue={expectedAmount ?? undefined}
          dir="ltr"
          className="w-24 rounded border border-border bg-surface px-2 py-1 outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted">الطريقة</span>
        <select name="method" defaultValue="cash" className="rounded border border-border bg-surface px-2 py-1">
          <option value="cash">كاش</option>
          <option value="visa">فيزا</option>
          <option value="none">لا شيء</option>
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted">وقت الإيداع (فارغ = الآن)</span>
        <input name="depositedAt" type="datetime-local" dir="ltr" className="rounded border border-border bg-surface px-2 py-1" />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted">ملاحظة</span>
        <input name="note" type="text" className="w-32 rounded border border-border bg-surface px-2 py-1" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-accent px-3 py-1.5 font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "…" : "حفظ"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-muted">
        إلغاء
      </button>
      {state.error && <span className="basis-full text-danger">{state.error}</span>}
    </form>
  );
}
