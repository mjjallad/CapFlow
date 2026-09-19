import "server-only";

import ExcelJS from "exceljs";

export type SheetTable = {
  sheetName: string;
  headers: string[];
  rows: { rowNumber: number; cells: Record<string, unknown> }[];
};

function plainValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("result" in value) return plainValue(value.result as ExcelJS.CellValue);
    if ("text" in value) return value.text;
    if (value instanceof Date) return value.toISOString();
    if ("error" in value) return null;
  }
  return value;
}

/** Reads the first worksheet; the first row with any content is the header. */
export async function readFirstSheet(buffer: ArrayBuffer): Promise<SheetTable> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("الملف لا يحتوي على أي ورقة عمل");

  let headers: string[] = [];
  let headerRowNumber = 0;
  const rows: SheetTable["rows"] = [];

  sheet.eachRow((row, rowNumber) => {
    const values = row.values as ExcelJS.CellValue[]; // 1-based, index 0 unused
    if (!headerRowNumber) {
      headers = values.map((v) => (v === undefined || v === null ? "" : String(plainValue(v) ?? "").trim()));
      headerRowNumber = rowNumber;
      return;
    }
    const cells: Record<string, unknown> = {};
    let hasContent = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = plainValue(values[index] ?? null);
      if (value !== null && value !== "") hasContent = true;
      cells[header] = value;
    });
    if (hasContent) rows.push({ rowNumber, cells });
  });

  return { sheetName: sheet.name, headers: headers.filter(Boolean), rows };
}
