"use client";

import { useActionState } from "react";
import { uploadCaptainsFile, type UploadState } from "./actions";

export function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadCaptainsFile, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">ملف الكباتن (Excel)</span>
        <input
          name="file"
          type="file"
          accept=".xlsx,.xlsm,.csv"
          required
          className="rounded-md border border-border bg-surface px-3 py-2 file:ml-3 file:rounded file:border-0 file:bg-background file:px-3 file:py-1"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
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
