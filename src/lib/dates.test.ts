import { describe, expect, it } from "vitest";
import { formatDay, shiftIsoDate, weekdayArabic } from "./dates";

describe("formatDay", () => {
  it("shows day/month/year — read right to left that is year, month, day", () => {
    expect(formatDay("2026-09-30")).toBe("30/09/2026");
    expect(formatDay("2026-01-05")).toBe("05/01/2026");
  });

  it("never shifts the day across timezones", () => {
    // A naive `new Date("2026-03-01")` in a negative offset would render 28/02.
    expect(formatDay("2026-03-01")).toBe("01/03/2026");
  });

  it("handles empty and unexpected input", () => {
    expect(formatDay(null)).toBe("—");
    expect(formatDay("")).toBe("—");
    expect(formatDay("not-a-date")).toBe("not-a-date");
  });
});

describe("calendar helpers", () => {
  it("shifts dates and names weekdays", () => {
    expect(shiftIsoDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(weekdayArabic("2026-09-17")).toBe("الخميس");
  });
});
