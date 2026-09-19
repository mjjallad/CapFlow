import { describe, expect, it } from "vitest";
import { parseAmount, parseCount, parseSheetDate, shiftIsoDate } from "./amounts";

describe("parseAmount", () => {
  it("rounds float noise from Excel", () => {
    expect(parseAmount(16.330000000000002)).toBe(16.33);
    expect(parseAmount(91.75999999999999)).toBe(91.76);
  });

  it("accepts hand-typed forms", () => {
    expect(parseAmount("4,45")).toBe(4.45);
    expect(parseAmount("62, 83")).toBe(62.83);
    expect(parseAmount("35+20")).toBe(55);
    expect(parseAmount("19.1+20")).toBe(39.1);
    expect(parseAmount("٦٤.٧٦")).toBe(64.76);
  });

  it("distinguishes empty from invalid", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("10+x")).toBeNaN();
  });
});

describe("parseCount", () => {
  it("accepts integers only", () => {
    expect(parseCount(13)).toBe(13);
    expect(parseCount("7")).toBe(7);
    expect(parseCount(1.5)).toBeNaN();
    expect(parseCount(null)).toBeNull();
  });
});

describe("dates", () => {
  it("parses the reports' M/D/YYYY and shifts days", () => {
    expect(parseSheetDate("9/18/2026")).toBe("2026-09-18");
    expect(parseSheetDate("2026-09-18")).toBe("2026-09-18");
    expect(shiftIsoDate("2026-09-18", -1)).toBe("2026-09-17");
    expect(shiftIsoDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(parseSheetDate("nope")).toBeNull();
  });
});
