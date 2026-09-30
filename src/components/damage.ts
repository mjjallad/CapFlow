/** Vehicle condition sketch: the damage vocabulary shared by the form and the server. */
export type DamageKind = "scratch" | "dent" | "broken" | "rust" | "missing" | "other";

/** One mark on the outline, positioned as a share (0–1) of the drawing. */
export type DamageMark = { x: number; y: number; kind: DamageKind; note: string };

export const DAMAGE_LABELS: Record<DamageKind, string> = {
  scratch: "خدش",
  dent: "انبعاج",
  broken: "كسر",
  rust: "صدأ",
  missing: "قطعة ناقصة",
  other: "أخرى",
};

export const DAMAGE_COLORS: Record<DamageKind, string> = {
  scratch: "#d97706",
  dent: "#dc2626",
  broken: "#7c3aed",
  rust: "#92400e",
  missing: "#0891b2",
  other: "#525252",
};

export const DAMAGE_KINDS = Object.keys(DAMAGE_LABELS) as DamageKind[];

export function isDamageKind(value: unknown): value is DamageKind {
  return typeof value === "string" && value in DAMAGE_LABELS;
}
