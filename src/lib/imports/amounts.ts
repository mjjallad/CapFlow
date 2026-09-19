// Shared numeric parsing for report cells. Sheets arrive with floats
// (16.330000000000002), integers, and occasionally hand-typed text.

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

function toAscii(text: string): string {
  return text.replace(ARABIC_DIGITS, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

/** Parses a money/decimal cell. Returns null when empty, NaN when unparseable. */
export function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? round3(value) : NaN;

  let text = toAscii(String(value)).trim();
  if (!text) return null;
  // Hand-typed forms seen in the field: "4,45" (decimal comma), "35+20" (two deposits).
  text = text.replace(/\s+/g, "");
  if (text.includes("+")) {
    let total = 0;
    for (const part of text.split("+")) {
      const n = parseAmount(part);
      if (n === null || Number.isNaN(n)) return NaN;
      total += n;
    }
    return round3(total);
  }
  text = text.replace(",", ".");
  const n = Number(text);
  return Number.isFinite(n) ? round3(n) : NaN;
}

/** Parses a whole-number cell (counts). */
export function parseCount(value: unknown): number | null {
  const n = parseAmount(value);
  if (n === null) return null;
  if (Number.isNaN(n) || !Number.isInteger(n)) return NaN;
  return n;
}

/** Parses the reports' M/D/YYYY (or ISO) date into YYYY-MM-DD. */
export function parseSheetDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return toIsoDate(value);
  const text = String(value).trim();
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return null;
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(Date.UTC(y, m - 1, d + days)));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
