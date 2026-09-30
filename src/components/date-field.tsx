"use client";

import { useState } from "react";

/**
 * A date field that looks like every other input in the form, but is entered as
 * day / month / year left to right — so read right to left it is year, month,
 * day. The native picker is avoided because its format follows the viewer's
 * operating system. The form still receives a plain ISO date.
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

  const complete = day !== "" && month !== "" && year.length === 4;
  const iso = complete ? `${year}-${pad(month)}-${pad(day)}` : "";

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
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function pad(value: string): string {
  return value.padStart(2, "0");
}
