"use client";

import Link from "next/link";
import { useActionState } from "react";
import { applyDailyBatch, type DailyApplyState } from "../actions";

const RESULT_LABELS: Record<string, string> = {
  applied: "صف طُبّق",
  skipped: "كابتن غير معروف تم تخطّيه",
  without_cod: "عمل بلا COD (بانتظار السجل)",
};

export function DailyApplyForm({
  batchId,
  kind,
  businessDate,
  validCount,
}: {
  batchId: string;
  kind: "cod" | "rider";
  businessDate: string;
  validCount: number;
}) {
  const [state, action, pending] = useActionState<DailyApplyState, FormData>(applyDailyBatch, {});

  if (state.result) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
        <p>
          تم التطبيق:{" "}
          {Object.entries(state.result)
            .map(([k, v]) => `${v} ${RESULT_LABELS[k] ?? k}`)
            .join(" · ")}
        </p>
        <Link href={`/days/${state.businessDate ?? businessDate}`} className="font-medium underline">
          افتح لوحة يوم {state.businessDate ?? businessDate} →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="businessDate" value={businessDate} />
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
        {pending ? "جارٍ التطبيق…" : `تطبيق ${validCount} صفًّا على يوم ${businessDate}`}
      </button>
    </form>
  );
}
