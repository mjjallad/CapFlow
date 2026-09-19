"use client";

import { useActionState, useState } from "react";
import { uploadDailyFile, type DailyUploadState } from "./actions";

const KINDS = [
  { value: "cod", label: "COD الصباحي (Rider details)", hint: "من عمل فعلًا وكم عليه — يُنشئ حالات الإيداع" },
  { value: "rider", label: "Rider الظهر (Rider Performance)", hint: "عدد التوصيلات لكل كابتن" },
] as const;

export function DailyUploadForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState<DailyUploadState, FormData>(uploadDailyFile, {});
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("cod");

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">نوع الملف</legend>
        {KINDS.map((k) => (
          <label key={k.value} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="kind"
              value={k.value}
              checked={kind === k.value}
              onChange={() => setKind(k.value)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{k.label}</span>
              <span className="block text-muted">{k.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">يوم التشغيل</span>
        <input
          name="businessDate"
          type="date"
          required
          defaultValue={state.suggestedDate ?? defaultDate}
          key={state.suggestedDate ?? "initial"}
          dir="ltr"
          className="w-fit rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
        />
        <span className="text-muted">
          اليوم الذي يبدأ 16:30 مساءً. ملف COD الصباحي يخص اليوم السابق لتاريخه.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">الملف</span>
        <input
          name="file"
          type="file"
          accept=".xlsx,.xlsm,.csv"
          required
          className="rounded-md border border-border bg-surface px-3 py-2 file:ml-3 file:rounded file:border-0 file:bg-background file:px-3 file:py-1"
        />
      </label>

      {state.error && (
        <div role="alert" className="flex flex-col gap-2 text-sm text-danger">
          <p>{state.error}</p>
          {state.suggestedDate && (
            <label className="flex items-center gap-2 text-foreground">
              <input type="checkbox" name="confirmDate" />
              <span>أؤكد الاستيراد لليوم المختار رغم اختلاف تاريخ الملف</span>
            </label>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "جارٍ الرفع والتحقق…" : "رفع وتحقق"}
      </button>
    </form>
  );
}
