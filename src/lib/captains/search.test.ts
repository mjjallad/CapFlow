import { describe, expect, it } from "vitest";
import { captainSearchFilter } from "./search";

describe("captainSearchFilter", () => {
  it("looks in the name, both phones and the platform id", () => {
    const clauses = captainSearchFilter("Ahmad").split(",");
    expect(clauses).toEqual([
      "full_name.ilike.%Ahmad%",
      "phone.ilike.%Ahmad%",
      "phone_secondary.ilike.%Ahmad%",
      "external_user_id.ilike.%Ahmad%",
    ]);
  });

  it("also matches a phone typed in local form against the stored one", () => {
    const clauses = captainSearchFilter("0791234567").split(",");
    expect(clauses).toContain("phone.eq.+962791234567");
    expect(clauses).toContain("phone_secondary.eq.+962791234567");
  });

  it("does not let commas or brackets break the filter", () => {
    const filter = captainSearchFilter("a,b(c)");
    expect(filter.split(",")).toHaveLength(4);
    expect(filter).toContain("full_name.ilike.%a b c %");
  });
});
