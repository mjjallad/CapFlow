import { describe, expect, it } from "vitest";
import { parseCodRows } from "./parse";

const HEADERS = [
  "Date",
  "Country",
  "3PL",
  "rider_id",
  "Last wallet balance",
  "cod_collected_amount_lc",
  "paid_at_pickup_amount_lc",
  "actual_amount",
];

const row = (rowNumber: number, cells: Record<string, unknown>) => ({ rowNumber, cells });

describe("parseCodRows", () => {
  it("normalizes rows and derives the business date from the pull date", () => {
    const result = parseCodRows(HEADERS, [
      row(2, {
        Date: "9/18/2026",
        Country: "jo",
        "3PL": "Diken",
        rider_id: "610316",
        "Last wallet balance": 581.54,
        cod_collected_amount_lc: 53.31,
        paid_at_pickup_amount_lc: 0,
        actual_amount: 91.75999999999999,
      }),
      row(3, { rider_id: "740857", "Last wallet balance": 959.63, cod_collected_amount_lc: 16.33, paid_at_pickup_amount_lc: 0, actual_amount: 16.330000000000002 }),
    ]);
    expect(result.missingRequired).toEqual([]);
    expect(result.fileDate).toBe("2026-09-18");
    expect(result.suggestedBusinessDate).toBe("2026-09-17");
    expect(result.rows[0].normalized).toEqual({
      external_user_id: "610316",
      collected_amount: 91.76,
      cod_collected_amount: 53.31,
      paid_at_pickup_amount: 0,
      wallet_balance: 581.54,
    });
    expect(result.rows[1].normalized?.collected_amount).toBe(16.33);
  });

  it("rejects missing, negative and duplicate riders", () => {
    const { rows } = parseCodRows(HEADERS, [
      row(2, { rider_id: "1", actual_amount: -5 }),
      row(3, { rider_id: "", actual_amount: 5 }),
      row(4, { rider_id: "2", actual_amount: 5 }),
      row(5, { rider_id: "2", actual_amount: 6 }),
    ]);
    expect(rows[0].errors).toEqual(["actual_amount سالب"]);
    expect(rows[1].errors).toEqual(["rider_id مفقود"]);
    expect(rows[2].errors).toEqual([]);
    expect(rows[3].errors).toEqual(["rider_id مكرر (السطر 4)"]);
  });

  it("reports missing required columns", () => {
    expect(parseCodRows(["Date", "rider_id"], []).missingRequired).toEqual(["actualAmount"]);
  });
});
