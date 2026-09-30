"use client";

import Image from "next/image";
import { useActionState } from "react";
import { advanceOnEnter } from "@/components/form-nav";
import { removeCaptainDocument, uploadCaptainDocument, type DocumentState } from "./actions";
import { DOCUMENT_LABELS, type DocumentKind } from "@/components/vehicle";

export type DocumentRow = {
  id: string;
  kind: DocumentKind;
  title: string | null;
  originalFilename: string | null;
  mimeType: string;
  createdAt: string;
  url: string | null;
};

export function CaptainDocuments({
  captainId,
  documents,
  readOnly,
  timeZone,
}: {
  captainId: string;
  documents: DocumentRow[];
  readOnly: boolean;
  timeZone: string;
}) {
  const [state, action, pending] = useActionState<DocumentState, FormData>(uploadCaptainDocument, {});

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">المستندات</h2>

      {documents.length === 0 ? (
        <p className="text-sm text-muted">لا توجد مستندات بعد.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {documents.map((doc) => (
            <li key={doc.id} className="overflow-hidden rounded-lg border border-border">
              {doc.url && doc.mimeType.startsWith("image/") ? (
                <a href={doc.url} target="_blank" rel="noreferrer">
                  {/* The URL is signed and short-lived, so it is served unoptimized. */}
                  <Image
                    src={doc.url}
                    alt={doc.title ?? DOCUMENT_LABELS[doc.kind]}
                    width={320}
                    height={144}
                    unoptimized
                    className="h-36 w-full object-cover"
                  />
                </a>
              ) : (
                <a
                  href={doc.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-36 items-center justify-center bg-background text-sm text-muted hover:underline"
                >
                  فتح الملف
                </a>
              )}
              <div className="flex items-start justify-between gap-2 p-2 text-xs">
                <div>
                  <div className="font-medium">{DOCUMENT_LABELS[doc.kind]}</div>
                  {doc.title && <div dir="auto">{doc.title}</div>}
                  <div className="text-muted" dir="ltr">
                    {new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "short" }).format(new Date(doc.createdAt))}
                  </div>
                </div>
                {!readOnly && <DeleteButton documentId={doc.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form
          action={action}
          onKeyDown={advanceOnEnter}
          className="flex flex-wrap items-end gap-2 border-t border-border pt-4 text-sm"
        >
          <input type="hidden" name="captainId" value={captainId} />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">النوع</span>
            <select name="kind" defaultValue="contract" className="rounded border border-border bg-surface px-2 py-1.5">
              {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">وصف (اختياري)</span>
            <input name="title" className="w-40 rounded border border-border bg-surface px-2 py-1.5" dir="auto" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">الملف (صورة أو PDF)</span>
            <input
              name="document"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              className="text-xs file:ml-2 file:rounded file:border-0 file:bg-background file:px-2 file:py-1"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground disabled:opacity-60"
          >
            {pending ? "جارٍ الرفع…" : "رفع"}
          </button>
          {state.error && <span className="basis-full text-danger">{state.error}</span>}
        </form>
      )}
    </section>
  );
}

function DeleteButton({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState<DocumentState, FormData>(removeCaptainDocument, {});

  return (
    <form action={action}>
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" disabled={pending} className="text-muted hover:text-danger disabled:opacity-50">
        {pending ? "…" : "حذف"}
      </button>
      {state.error && <span className="text-danger">{state.error}</span>}
    </form>
  );
}
