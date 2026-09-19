import { describe, expect, it } from "vitest";
import { parseRiderRows } from "./parse";

const HEADERS = ["rider_id", "contract_name", "Working Days", "Total Orders", "Completed Deliveries"];
const row = (rowNumber: number, cells: Record<string, unknown>) => ({ rowNumber, cells });

describe("parseRiderRows", () => {
  it("stages only riders who worked", () => {
    const result = parseRiderRows(HEADERS, [
      row(2, { rider_id: "610316", contract_name: "diken", "Working Days": 1, "Total Orders": 18, "Completed Deliveries": 17 }),
      row(3, { rider_id: "681534", contract_name: "diken", "Working Days": 0 }),
      row(4, { rider_id: "740857", contract_name: "diken - full time", "Working Days": 1, "Total Orders": 7, "Completed Deliveries": 7 }),
    ]);
    expect(result.missingRequired).toEqual([]);
    expect(result.notWorking).toBe(1);
    expect(result.rows.map((r) => r.normalized)).toEqual([
      { external_user_id: "610316", completed_deliveries: 17, total_orders: 18, contract_name: "diken" },
      { external_user_id: "740857", completed_deliveries: 7, total_orders: 7, contract_name: "diken - full time" },
    ]);
  });

  it("flags invalid delivery counts and duplicates", () => {
    const { rows } = parseRiderRows(HEADERS, [
      row(2, { rider_id: "1", "Working Days": 1, "Completed Deliveries": null }),
      row(3, { rider_id: "2", "Working Days": 1, "Completed Deliveries": 3 }),
      row(4, { rider_id: "2", "Working Days": 1, "Completed Deliveries": 4 }),
    ]);
    expect(rows[0].errors).toEqual(["Completed Deliveries مفقود"]);
    expect(rows[2].errors).toEqual(["rider_id مكرر (السطر 3)"]);
  });
});
