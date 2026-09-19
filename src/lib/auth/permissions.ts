import type { AppRole } from "./context";

export type Permission =
  | "captains.read"
  | "captains.import"
  | "captains.manage"
  | "days.read"
  | "days.import"
  | "deposits.record";

const ALL: readonly AppRole[] = ["owner", "admin", "accountant", "supervisor", "reviewer", "operator", "viewer"];

// Coarse role → permission table. Extend here rather than checking roles inline.
const GRANTS: Record<Permission, readonly AppRole[]> = {
  "captains.read": ALL,
  "captains.import": ["owner", "admin", "operator"],
  "captains.manage": ["owner", "admin", "supervisor"],
  "days.read": ALL,
  "days.import": ["owner", "admin", "operator", "accountant"],
  "deposits.record": ["owner", "admin", "operator", "accountant", "supervisor"],
};

export function can(role: AppRole, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}
