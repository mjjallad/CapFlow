import { parseAmount, parseSheetDate, shiftIsoDate } from "@/lib/imports/amounts";

// Morning "Rider details" export from the parent platform. Header row:
// Date | Country | 3PL | rider_id | Last wallet balance | cod_collected_amount_lc | paid_at_pickup_amount_lc | actual_amount
// Date/Country/3PL are filled on the first row of each group only.

const COLUMNS = {
  riderId: ["rider_id", "rider id", "userid", "user id"],
  actualAmount: ["actual_amount", "actual amount"],
  codCollected: ["cod_collected_amount_lc", "cod collected amount", "cod_collected_amount"],
  paidAtPickup: ["paid_at_pickup_amount_lc", "paid at pickup amount", "paid_at_pickup_amount"],
  walletBalance: ["last wallet balance", "wallet balance", "wallet_balance"],
  date: ["date"],
} as const;

type Field = keyof typeof COLUMNS;

export type NormalizedCodRow = {
  external_user_id: string;
  collected_amount: number;
  cod_collected_amount: number | null;
  paid_at_pickup_amount: number | null;
  wallet_balance: number | null;
};

export type ParsedCodRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: NormalizedCodRow | null;
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

export function parseCodRows(
  headers: string[],
  rows: { rowNumber: number; cells: Record<string, unknown> }[],
): {
  rows: ParsedCodRow[];
  missingRequired: string[];
  /** Date printed in the file (the pull date, i.e. business date + 1). */
  fileDate: string | null;
  /** Business date the file belongs to: the day before the pull date. */
  suggestedBusinessDate: string | null;
} {
  const mapping = resolveColumns(headers);
  const missingRequired = (["riderId", "actualAmount"] as const).filter((f) => !mapping[f]);

  const read = (cells: Record<string, unknown>, field: Field) => (mapping[field] ? cells[mapping[field]!] : undefined);

  let fileDate: string | null = null;
  const seen = new Map<string, number>();

  const parsed: ParsedCodRow[] = rows.map(({ rowNumber, cells }) => {
    const errors: string[] = [];
    if (!fileDate) fileDate = parseSheetDate(read(cells, "date"));

    const riderId = cellText(read(cells, "riderId"));
    const collected = parseAmount(read(cells, "actualAmount"));
    const codCollected = parseAmount(read(cells, "codCollected"));
    const paidAtPickup = parseAmount(read(cells, "paidAtPickup"));
    const wallet = parseAmount(read(cells, "walletBalance"));

    if (!riderId) errors.push("rider_id مفقود");
    if (collected === null) errors.push("actual_amount مفقود");
    else if (Number.isNaN(collected)) errors.push(`actual_amount غير صالح: ${String(read(cells, "actualAmount"))}`);
    else if (collected < 0) errors.push("actual_amount سالب");

    if (riderId && errors.length === 0) {
      const dup = seen.get(riderId);
      if (dup !== undefined) errors.push(`rider_id مكرر (السطر ${dup})`);
      else seen.set(riderId, rowNumber);
    }

    const normalized: NormalizedCodRow | null =
      errors.length === 0
        ? {
            external_user_id: riderId!,
            collected_amount: collected as number,
            cod_collected_amount: Number.isNaN(codCollected as number) ? null : codCollected,
            paid_at_pickup_amount: Number.isNaN(paidAtPickup as number) ? null : paidAtPickup,
            wallet_balance: Number.isNaN(wallet as number) ? null : wallet,
          }
        : null;

    return { rowNumber, raw: cells, normalized, errors };
  });

  return {
    rows: parsed,
    missingRequired,
    fileDate,
    suggestedBusinessDate: fileDate ? shiftIsoDate(fileDate, -1) : null,
  };
}
