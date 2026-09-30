"use client";

import { useRef, useState } from "react";

/**
 * A date field that looks like every other input in the form, but is entered as
 * day / month / year left to right — so read right to left it is year, month,
 * day. The native picker is not used for typing because its format follows the
 * viewer's operating system; it is still reachable through the calendar button.
 * The form receives a plain ISO date in a hidden field.
 */
export function DateField({
  name,
  defaultValue,
  disabled,
}: {
  name: string;
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  const initial = defaultValue?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [day, setDay] = useState(initial?.[3] ?? "");
  const [month, setMonth] = useState(initial?.[2] ?? "");
  const [year, setYear] = useState(initial?.[1] ?? "");
  const pickerRef = useRef<HTMLInputElement>(null);

  const complete = day !== "" && month !== "" && year.length === 4;
  const iso = complete ? `${year}-${pad(month)}-${pad(day)}` : "";

  function openCalendar() {
    const picker = pickerRef.current;
    if (!picker) return;
    // showPicker is the reliable way; clicking is the fallback on older browsers.
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  function takeFromCalendar(value: string) {
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return;
    setYear(parts[1]);
    setMonth(parts[2]);
    setDay(parts[3]);
  }

  const partClass = "bg-transparent text-center outline-none placeholder:text-muted";

  return (
    <div
      dir="ltr"
      className="flex w-full items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-within:border-accent has-[:disabled]:opacity-70"
    >
      <input
        value={day}
        onChange={(e) => setDay(digits(e.target.value, 2))}
        disabled={disabled}
        inputMode="numeric"
        placeholder="يوم"
        aria-label="اليوم"
        className={`${partClass} w-10`}
      />
      <span className="text-muted">/</span>
      <input
        value={month}
        onChange={(e) => setMonth(digits(e.target.value, 2))}
        disabled={disabled}
        inputMode="numeric"
        placeholder="شهر"
        aria-label="الشهر"
        className={`${partClass} w-10`}
      />
      <span className="text-muted">/</span>
      <input
        value={year}
        onChange={(e) => setYear(digits(e.target.value, 4))}
        disabled={disabled}
        inputMode="numeric"
        placeholder="سنة"
        aria-label="السنة"
        className={`${partClass} w-14`}
      />

      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        aria-label="اختيار من التقويم"
        title="اختيار من التقويم"
        className="ms-auto text-muted hover:text-foreground disabled:opacity-50"
      >
        <CalendarIcon />
      </button>

      {/* Sits under the button so a browser without showPicker still opens on click. */}
      <input
        ref={pickerRef}
        type="date"
        value={iso}
        onChange={(e) => takeFromCalendar(e.target.value)}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.75" y="4.25" width="14.5" height="13" rx="2.5" />
      <path d="M2.75 8.25h14.5M6.5 2.75v3M13.5 2.75v3" strokeLinecap="round" />
    </svg>
  );
}

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function pad(value: string): string {
  return value.padStart(2, "0");
}
