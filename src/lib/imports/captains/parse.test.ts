import { describe, expect, it } from "vitest";
import { parseCaptainRows, resolveColumns } from "./parse";

const HEADERS = ["City", "UserID", "name", "status", "S.C name", "dip.s.c", "Team Leader", "po.number"];

function row(rowNumber: number, cells: Record<string, unknown>) {
  return { rowNumber, cells };
}

describe("resolveColumns", () => {
  it("maps the operator's sheet headers", () => {
    expect(resolveColumns(HEADERS)).toEqual({
      city: "City",
      externalUserId: "UserID",
      fullName: "name",
      status: "status",
      serviceCenter: "S.C name",
      groupLabel: "dip.s.c",
      teamLeader: "Team Leader",
      phone: "po.number",
    });
  });

  it("is case and whitespace insensitive", () => {
    expect(resolveColumns(["  PHONE ", "Full Name", "user id"])).toEqual({
      phone: "  PHONE ",
      fullName: "Full Name",
      externalUserId: "user id",
    });
  });
});

describe("parseCaptainRows", () => {
  it("normalizes a valid row", () => {
    const { rows, missingRequired } = parseCaptainRows(HEADERS, [
      row(2, {
        City: "Amman",
        UserID: 4556952,
        name: "Abdallah Ahmad DK",
        "S.C name": "محمد الشعار",
        "dip.s.c": "محمد الجلاد",
        "Team Leader": "Team A (Kamal)",
        "po.number": 962798490446,
      }),
    ]);
    expect(missingRequired).toEqual([]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].normalized).toEqual({
      external_user_id: "4556952",
      full_name: "Abdallah Ahmad DK",
      phone: "+962798490446",
      city: "Amman",
      service_center_name: "محمد الشعار",
      group_label: "محمد الجلاد",
      team_name: "Team A (Kamal)",
      team_leader_name: "Team A (Kamal)",
      status: "active",
    });
  });

  it("reports missing and invalid fields", () => {
    const { rows } = parseCaptainRows(HEADERS, [
      row(2, { UserID: null, name: "X", "po.number": "12345" }),
    ]);
    expect(rows[0].normalized).toBeNull();
    expect(rows[0].errors).toEqual(["المعرّف (UserID) مفقود", "رقم الهاتف غير صالح: 12345"]);
  });

  it("rejects later duplicates within the file", () => {
    const { rows } = parseCaptainRows(HEADERS, [
      row(2, { UserID: 1, name: "A", "po.number": "0798490446" }),
      row(3, { UserID: 2, name: "B", "po.number": "0798490446" }),
      row(4, { UserID: 1, name: "C", "po.number": "0798490447" }),
    ]);
    expect(rows[0].normalized).not.toBeNull();
    expect(rows[1].errors).toEqual(["رقم الهاتف مكرر (السطر 2)"]);
    expect(rows[2].errors).toEqual(["المعرّف مكرر (السطر 2)"]);
  });

  it("lists required columns that are absent", () => {
    const { missingRequired } = parseCaptainRows(["City", "name"], []);
    expect(missingRequired).toEqual(["externalUserId", "phone"]);
  });
});
