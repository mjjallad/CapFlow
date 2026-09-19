import type { AppRole } from "./context";

export type Permission = "captains.read" | "captains.import" | "captains.manage";

// Coarse role → permission table. Extend here rather than checking roles inline.
const GRANTS: Record<Permission, readonly AppRole[]> = {
  "captains.read": ["owner", "admin", "accountant", "supervisor", "reviewer", "operator", "viewer"],
  "captains.import": ["owner", "admin", "operator"],
  "captains.manage": ["owner", "admin"],
};

export function can(role: AppRole, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}
