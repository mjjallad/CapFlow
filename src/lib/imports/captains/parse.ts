import { normalizeJordanPhone } from "@/lib/phone";

// Header aliases as they appear in the operator's sheets (case/space-insensitive).
// Unknown columns are ignored so the daily COD template can be reused as-is.
const COLUMN_ALIASES: Record<keyof CaptainRowInput, string[]> = {
  externalUserId: ["userid", "user id", "user_id", "id", "رقم الكابتن", "المعرف"],
  fullName: ["name", "full name", "full_name", "captain", "الاسم", "اسم الكابتن"],
  phone: ["po.number", "po number", "phone", "mobile", "الهاتف", "رقم الهاتف", "الجوال"],
  city: ["city", "المدينة"],
  serviceCenter: ["s.c name", "sc name", "service center", "service_center", "مركز الخدمة"],
  groupLabel: ["dip.s.c", "dip s.c", "group", "المجموعة"],
  teamLeader: ["team leader", "team_leader", "team", "الفريق", "قائد الفريق"],
  status: ["status", "الحالة"],
};

export type CaptainRowInput = {
  externalUserId: string | null;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  serviceCenter: string | null;
  groupLabel: string | null;
  teamLeader: string | null;
  status: string | null;
};

export type NormalizedCaptain = {
  external_user_id: string;
  full_name: string;
  phone: string;
  city: string | null;
  service_center_name: string | null;
  group_label: string | null;
  team_name: string | null;
  team_leader_name: string | null;
  status: "active" | "inactive" | "suspended";
};

export type ParsedRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: NormalizedCaptain | null;
  errors: string[];
};

export type ColumnMapping = Partial<Record<keyof CaptainRowInput, string>>;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve which sheet column feeds each captain field. Returns null for missing fields. */
export function resolveColumns(headers: string[]): ColumnMapping {
  const byNormalized = new Map(headers.map((h) => [normalizeHeader(h), h]));
  const mapping: ColumnMapping = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof CaptainRowInput, string[]][]) {
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
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toString();
  if (typeof value === "object" && "text" in (value as object)) {
    // exceljs rich text / hyperlink cells
    return cellText((value as { text: unknown }).text);
  }
  const text = String(value).trim();
  return text === "" ? null : text;
}

const STATUS_VALUES: Record<string, NormalizedCaptain["status"]> = {
  active: "active",
  inactive: "inactive",
  suspended: "suspended",
  نشط: "active",
  فعال: "active",
  "غير نشط": "inactive",
  موقوف: "suspended",
};

export function parseCaptainRows(
  headers: string[],
  rows: { rowNumber: number; cells: Record<string, unknown> }[],
): { mapping: ColumnMapping; rows: ParsedRow[]; missingRequired: string[] } {
  const mapping = resolveColumns(headers);
  const missingRequired = (["externalUserId", "fullName", "phone"] as const).filter((f) => !mapping[f]);

  const read = (cells: Record<string, unknown>, field: keyof CaptainRowInput) => {
    const col = mapping[field];
    return col ? cellText(cells[col]) : null;
  };

  const parsed: ParsedRow[] = rows.map(({ rowNumber, cells }) => {
    const errors: string[] = [];
    const externalUserId = read(cells, "externalUserId");
    const fullName = read(cells, "fullName");
    const phoneRaw = read(cells, "phone");
    const phone = normalizeJordanPhone(phoneRaw);
    const statusRaw = read(cells, "status");
    const status = statusRaw ? STATUS_VALUES[statusRaw.toLowerCase()] : "active";

    if (!externalUserId) errors.push("المعرّف (UserID) مفقود");
    if (!fullName) errors.push("الاسم مفقود");
    if (!phoneRaw) errors.push("رقم الهاتف مفقود");
    else if (!phone) errors.push(`رقم الهاتف غير صالح: ${phoneRaw}`);
    if (statusRaw && !status) errors.push(`الحالة غير معروفة: ${statusRaw}`);

    const normalized: NormalizedCaptain | null =
      errors.length === 0
        ? {
            external_user_id: externalUserId!,
            full_name: fullName!,
            phone: phone!,
            city: read(cells, "city"),
            service_center_name: read(cells, "serviceCenter"),
            group_label: read(cells, "groupLabel"),
            team_name: read(cells, "teamLeader"),
            team_leader_name: read(cells, "teamLeader"),
            status: status ?? "active",
          }
        : null;

    return { rowNumber, raw: cells, normalized, errors };
  });

  // Duplicates inside the file are rejected on every occurrence after the first,
  // so the operator sees exactly which rows collide.
  const seenPhone = new Map<string, number>();
  const seenId = new Map<string, number>();
  for (const row of parsed) {
    if (!row.normalized) continue;
    const { phone, external_user_id } = row.normalized;
    const dupPhone = seenPhone.get(phone);
    const dupId = seenId.get(external_user_id);
    if (dupPhone !== undefined) row.errors.push(`رقم الهاتف مكرر (السطر ${dupPhone})`);
    if (dupId !== undefined) row.errors.push(`المعرّف مكرر (السطر ${dupId})`);
    if (row.errors.length) {
      row.normalized = null;
      continue;
    }
    seenPhone.set(phone, row.rowNumber);
    seenId.set(external_user_id, row.rowNumber);
  }

  return { mapping, rows: parsed, missingRequired };
}
