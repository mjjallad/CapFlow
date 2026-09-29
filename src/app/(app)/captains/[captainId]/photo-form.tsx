"use client";

import { useActionState } from "react";
import { uploadCaptainPhoto, type PhotoState } from "./actions";

export function PhotoForm({ captainId }: { captainId: string }) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(uploadCaptainPhoto, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="captainId" value={captainId} />
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-xs file:ml-2 file:rounded file:border-0 file:bg-background file:px-2 file:py-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-background disabled:opacity-60"
      >
        {pending ? "جارٍ الرفع…" : "رفع الصورة"}
      </button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
