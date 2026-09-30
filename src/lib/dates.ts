// Calendar helpers. Business dates are plain YYYY-MM-DD strings; timestamps
// are formatted in the tenant's timezone for display.

export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * A calendar date for reading, as dd/mm/yyyy — right to left that is year,
 * month, day. Parsed from the parts so no timezone can shift the day.
 */
export function formatDay(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function weekdayArabic(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS_AR[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function formatMoney(value: number | null | undefined, currency = "JOD"): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${currency}`;
}
