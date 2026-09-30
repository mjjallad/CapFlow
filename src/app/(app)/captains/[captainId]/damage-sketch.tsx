"use client";

import { useRef, useState } from "react";
import type { VehicleKind } from "@/components/vehicle";
import { DAMAGE_COLORS, DAMAGE_KINDS, DAMAGE_LABELS, type DamageKind, type DamageMark } from "@/components/damage";

/**
 * Click the outline to drop a numbered mark. Coordinates are stored as a share
 * of the drawing (0–1), so they stay right at any size.
 */
export function DamageSketch({
  kind,
  marks,
  onChange,
  readOnly,
}: {
  kind: VehicleKind;
  marks: DamageMark[];
  onChange: (marks: DamageMark[]) => void;
  readOnly: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pendingKind, setPendingKind] = useState<DamageKind>("dent");

  function addMark(event: React.MouseEvent<HTMLDivElement>) {
    if (readOnly) return;
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onChange([...marks, { x: round(x), y: round(y), kind: pendingKind, note: "" }]);
  }

  const update = (index: number, patch: Partial<DamageMark>) =>
    onChange(marks.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  return (
    <div className="flex flex-col gap-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">نوع الضرر ثم اضغط على الرسم:</span>
          {DAMAGE_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPendingKind(k)}
              className={`rounded-full border px-3 py-1 text-xs ${
                k === pendingKind ? "border-accent font-medium" : "border-border hover:bg-background"
              }`}
            >
              <span
                className="me-1.5 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: DAMAGE_COLORS[k] }}
              />
              {DAMAGE_LABELS[k]}
            </button>
          ))}
        </div>
      )}

      <div
        ref={boxRef}
        onClick={addMark}
        className={`relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-background ${
          readOnly ? "" : "cursor-crosshair"
        }`}
      >
        {kind === "company_scooter" ? <ScooterOutline /> : <CarOutline />}

        {marks.map((mark, index) => (
          <span
            key={index}
            className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
            style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%`, backgroundColor: DAMAGE_COLORS[mark.kind] }}
          >
            {index + 1}
          </span>
        ))}
      </div>

      {marks.length === 0 ? (
        <p className="text-xs text-muted">لا توجد ضربات مسجّلة.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {marks.map((mark, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: DAMAGE_COLORS[mark.kind] }}
              >
                {index + 1}
              </span>
              <select
                value={mark.kind}
                onChange={(e) => update(index, { kind: e.target.value as DamageKind })}
                disabled={readOnly}
                className="rounded border border-border bg-surface px-2 py-1 text-xs"
              >
                {DAMAGE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {DAMAGE_LABELS[k]}
                  </option>
                ))}
              </select>
              <input
                value={mark.note}
                onChange={(e) => update(index, { note: e.target.value })}
                placeholder="الموضع أو الوصف"
                disabled={readOnly}
                className="min-w-40 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs"
                dir="auto"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(marks.filter((_, i) => i !== index))}
                  className="rounded border border-border px-2 text-xs text-muted hover:text-danger"
                  aria-label="حذف الضربة"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Top view: front at the top, so left/right match the driver's own left/right. */
function CarOutline() {
  return (
    <svg viewBox="0 0 200 320" className="w-full" role="img" aria-label="مخطط السيارة من الأعلى">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" opacity="0.75">
        <rect x="26" y="14" width="148" height="292" rx="46" />
        <path d="M52 66 h96 l14 34 H38 z" />
        <path d="M38 224 h124 l-14 34 H52 z" />
        <rect x="52" y="112" width="96" height="100" rx="10" />
        <path d="M26 96 h-12 v34 h12" />
        <path d="M174 96 h12 v34 h-12" />
        <circle cx="100" cy="162" r="14" />
      </g>
      <g fill="currentColor" opacity="0.45" fontSize="11" textAnchor="middle">
        <text x="100" y="42">الأمام</text>
        <text x="100" y="292">الخلف</text>
      </g>
    </svg>
  );
}

/** Side view: the angle a scooter's scratches are usually described from. */
function ScooterOutline() {
  return (
    <svg viewBox="0 0 320 200" className="w-full" role="img" aria-label="مخطط السكوتر من الجانب">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
        <circle cx="66" cy="150" r="30" />
        <circle cx="254" cy="150" r="30" />
        <path d="M66 150 L104 96 h84 l26 54" />
        <path d="M104 96 q-8 -34 14 -46" />
        <path d="M118 50 h44" />
        <path d="M188 96 q34 -6 40 -26 l8 -18" />
        <path d="M228 70 h40 l-6 34" />
        <path d="M188 96 l26 54" />
        <path d="M136 120 h72" />
      </g>
      <g fill="currentColor" opacity="0.45" fontSize="11" textAnchor="middle">
        <text x="40" y="192">الأمام</text>
        <text x="282" y="192">الخلف</text>
      </g>
    </svg>
  );
}
