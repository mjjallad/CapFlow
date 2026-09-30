"use client";

import { useRef, useState } from "react";
import type { VehicleKind } from "@/components/vehicle";
import { DAMAGE_COLORS, DAMAGE_KINDS, DAMAGE_LABELS, type DamageKind, type DamageMark } from "@/components/damage";
import { DamagePins, VehicleOutline } from "@/components/vehicle-outline";

/**
 * Click the outline to drop a numbered mark. Coordinates are stored as a share
 * of the drawing (0–1), so they stay right at any size.
 */
export function DamageSketch({
  kind,
  marks,
  onChange,
  readOnly,
  outlineUrl,
}: {
  kind: VehicleKind;
  marks: DamageMark[];
  onChange: (marks: DamageMark[]) => void;
  readOnly: boolean;
  /** Set when an image in public/vehicle-sketch/ replaces the built-in drawing. */
  outlineUrl?: string;
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
        className={`relative w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-white ${
          readOnly ? "" : "cursor-crosshair"
        }`}
      >
        <VehicleOutline kind={kind} outlineUrl={outlineUrl} />
        <DamagePins marks={marks} />
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

