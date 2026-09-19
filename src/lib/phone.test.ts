import { describe, expect, it } from "vitest";
import { normalizeJordanPhone } from "./phone";

describe("normalizeJordanPhone", () => {
  it("accepts the Excel numeric form", () => {
    expect(normalizeJordanPhone(962798490446)).toBe("+962798490446");
  });

  it("accepts local, international and 00-prefixed forms", () => {
    expect(normalizeJordanPhone("0798490446")).toBe("+962798490446");
    expect(normalizeJordanPhone("+962 79 849 0446")).toBe("+962798490446");
    expect(normalizeJordanPhone("00962798490446")).toBe("+962798490446");
    expect(normalizeJordanPhone("798490446")).toBe("+962798490446");
  });

  it("converts Arabic-Indic digits", () => {
    expect(normalizeJordanPhone("٠٧٩٨٤٩٠٤٤٦")).toBe("+962798490446");
  });

  it("rejects non-mobile or malformed numbers", () => {
    expect(normalizeJordanPhone("065123456")).toBeNull();
    expect(normalizeJordanPhone("79849044")).toBeNull();
    expect(normalizeJordanPhone("")).toBeNull();
    expect(normalizeJordanPhone(null)).toBeNull();
  });
});
