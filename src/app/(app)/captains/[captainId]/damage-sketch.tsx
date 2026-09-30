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

/** Top view, front on the left — the layout body shops and insurers draw. */
function CarOutline() {
  return (
    <svg viewBox="0 0 480 320" className="w-full" role="img" aria-label="مخطط السيارة من الأعلى">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* body */}
        <path
          opacity="0.9"
          d="M104 64 L386 64 C422 64 444 78 450 100 C454 118 456 142 456 170 C456 198 454 222 450 240 C444 262 422 276 386 276 L104 276 C72 276 48 260 42 236 C36 216 34 194 34 170 C34 146 36 124 42 104 C48 80 72 64 104 64 Z"
        />
        {/* bonnet edges */}
        <path opacity="0.45" d="M60 112 C86 92 120 82 156 78" />
        <path opacity="0.45" d="M60 228 C86 248 120 258 156 262" />
        {/* windscreen, roof, rear screen */}
        <path opacity="0.6" d="M168 122 L208 104 L208 236 L168 218 Z" />
        <rect opacity="0.6" x="208" y="104" width="128" height="132" rx="10" />
        <path opacity="0.6" d="M336 104 L378 122 L378 218 L336 236 Z" />
        {/* side windows */}
        <g opacity="0.4">
          <rect x="216" y="84" width="54" height="16" rx="6" />
          <rect x="274" y="84" width="54" height="16" rx="6" />
          <rect x="216" y="240" width="54" height="16" rx="6" />
          <rect x="274" y="240" width="54" height="16" rx="6" />
        </g>
        {/* door seams and rear quarter lines */}
        <g opacity="0.35">
          <path d="M212 64 L212 84" />
          <path d="M272 64 L272 84" />
          <path d="M332 64 L332 84" />
          <path d="M212 276 L212 256" />
          <path d="M272 276 L272 256" />
          <path d="M332 276 L332 256" />
          <path d="M378 122 L420 92" />
          <path d="M378 218 L420 248" />
        </g>
        {/* wing mirrors */}
        <g opacity="0.55">
          <path d="M158 64 C156 52 160 46 170 46 C178 46 181 52 179 64 Z" />
          <path d="M158 276 C156 288 160 294 170 294 C178 294 181 288 179 276 Z" />
        </g>
        {/* head and tail lamps */}
        <g opacity="0.5">
          <path d="M40 124 C50 108 70 96 94 90 L98 110 C78 116 60 126 50 140 Z" />
          <path d="M40 216 C50 232 70 244 94 250 L98 230 C78 224 60 214 50 200 Z" />
          <path d="M450 118 C442 104 426 95 406 91 L402 111 C418 115 432 122 440 132 Z" />
          <path d="M450 222 C442 236 426 245 406 249 L402 229 C418 225 432 218 440 208 Z" />
        </g>
        {/* wipers and panel creases */}
        <g opacity="0.35">
          <path d="M182 140 L152 152" />
          <path d="M182 200 L152 188" />
          <path d="M120 82 L124 98" />
          <path d="M120 258 L124 242" />
          <path d="M414 100 L420 112" />
          <path d="M414 240 L420 228" />
        </g>
      </g>
      <g fill="currentColor" opacity="0.45" fontSize="12" textAnchor="middle">
        <text x="60" y="26">الأمام</text>
        <text x="428" y="26">الخلف</text>
      </g>
    </svg>
  );
}

/** Side view: the angle a scooter's scratches are usually described from. */
function ScooterOutline() {
  return (
    <svg viewBox="0 0 340 210" className="w-full" role="img" aria-label="مخطط السكوتر من الجانب">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <g opacity="0.85">
          <circle cx="72" cy="150" r="34" />
          <circle cx="266" cy="150" r="34" />
        </g>
        <g opacity="0.25">
          <circle cx="72" cy="150" r="13" />
          <circle cx="266" cy="150" r="13" />
        </g>
        {/* front fender, fork and handlebar with mirror */}
        <path opacity="0.5" d="M40 136 C46 112 62 100 84 100 L104 100" />
        <path opacity="0.85" d="M72 150 L106 74" />
        <path opacity="0.85" d="M96 92 L120 40" />
        <path opacity="0.7" d="M100 36 L146 36" />
        <path opacity="0.5" d="M138 34 L150 18" />
        <ellipse opacity="0.5" cx="154" cy="14" rx="9" ry="6" />
        {/* leg shield and floorboard */}
        <path opacity="0.7" d="M116 50 C104 76 100 96 104 118 L104 128 L178 128" />
        <path opacity="0.5" d="M128 60 L108 104" />
        {/* body, seat and top case */}
        <path opacity="0.85" d="M178 128 L182 108 C184 100 190 96 198 96 L242 96 C252 96 258 102 258 112 L258 124" />
        <path opacity="0.85" d="M196 96 L200 76 C202 68 208 64 216 64 L246 64 C254 64 258 70 258 78 L258 96" />
        <path opacity="0.6" d="M200 76 L258 76" />
        <path opacity="0.6" d="M258 82 L284 82 C290 82 292 86 290 92 L284 106 L258 106" />
        <path opacity="0.85" d="M258 124 L266 150" />
        <path opacity="0.5" d="M178 128 L158 150" />
        <path opacity="0.4" d="M232 124 L238 150" />
      </g>
      <g fill="currentColor" opacity="0.4" fontSize="11" textAnchor="middle">
        <text x="72" y="200">الأمام</text>
        <text x="266" y="200">الخلف</text>
      </g>
    </svg>
  );
}
