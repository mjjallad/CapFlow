import { parseCount } from "@/lib/imports/amounts";

// Noon "Rider Performance" export. Only riders with Working Days = 1 matter
// for the day; the rest of the ~5000 rows are not staged at all.

const COLUMNS = {
  riderId: ["rider_id", "rider id"],
  workingDays: ["working days", "working_days"],
  completedDeliveries: ["completed deliveries", "completed_deliveries"],
  totalOrders: ["total orders", "total_orders"],
  contract: ["contract_name", "contract name"],
} as const;

type Field = keyof typeof COLUMNS;

export type NormalizedRiderRow = {
  external_user_id: string;
  completed_deliveries: number;
  total_orders: number | null;
  contract_name: string | null;
};

export type ParsedRiderRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: NormalizedRiderRow | null;
  errors: string[];
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveColumns(headers: string[]): Partial<Record<Field, string>> {
  const byNormalized = new Map(headers.map((h) => [normalizeHeader(h), h]));
  const mapping: Partial<Record<Field, string>> = {};
  for (const [field, aliases] of Object.entries(COLUMNS) as [Field, readonly string[]][]) {
    for (const alias of aliases) {
      const actual = byNormalized.get(alias);
      if (actual !== undefined) {
        mapping[field] = actual;
        break;
      }
    }
  }
  return mapping;
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "number" ? String(value) : String(value).trim();
  return text === "" ? null : text;
}

export function parseRiderRows(
  headers: string[],
  rows: { rowNumber: number; cells: Record<string, unknown> }[],
): { rows: ParsedRiderRow[]; missingRequired: string[]; notWorking: number } {
  const mapping = resolveColumns(headers);
  const missingRequired = (["riderId", "workingDays", "completedDeliveries"] as const).filter((f) => !mapping[f]);
  const read = (cells: Record<string, unknown>, field: Field) => (mapping[field] ? cells[mapping[field]!] : undefined);

  let notWorking = 0;
  const seen = new Map<string, number>();
  const parsed: ParsedRiderRow[] = [];

  for (const { rowNumber, cells } of rows) {
    const workingDays = parseCount(read(cells, "workingDays"));
    if (!workingDays) {
      notWorking += 1;
      continue;
    }

    const errors: string[] = [];
    const riderId = cellText(read(cells, "riderId"));
    const deliveries = parseCount(read(cells, "completedDeliveries"));
    const totalOrders = parseCount(read(cells, "totalOrders"));

    if (!riderId) errors.push("rider_id مفقود");
    if (deliveries === null) errors.push("Completed Deliveries مفقود");
    else if (Number.isNaN(deliveries) || deliveries < 0) errors.push("Completed Deliveries غير صالح");

    if (riderId && errors.length === 0) {
      const dup = seen.get(riderId);
      if (dup !== undefined) errors.push(`rider_id مكرر (السطر ${dup})`);
      else seen.set(riderId, rowNumber);
    }

    parsed.push({
      rowNumber,
      raw: cells,
      normalized:
        errors.length === 0
          ? {
              external_user_id: riderId!,
              completed_deliveries: deliveries as number,
              total_orders: totalOrders === null || Number.isNaN(totalOrders) ? null : totalOrders,
              contract_name: cellText(read(cells, "contract")),
            }
          : null,
      errors,
    });
  }

  return { rows: parsed, missingRequired, notWorking };
}
