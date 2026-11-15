import type { Enums } from "./supabase";

export type AppRole = Enums<"app_role">;

export const ROLES: readonly AppRole[] = [
  "owner",
  "admin",
  "project_manager",
  "estimator",
  "site_foreman",
  "storekeeper",
  "accountant",
  "client_viewer",
] as const;

const has = (role: AppRole | null | undefined, allowed: readonly AppRole[]) => role != null && allowed.includes(role);

/**
 * UI permission checks. They mirror the RLS policies so the interface does
 * not offer actions the database would refuse. The database stays the
 * source of truth.
 */
export const can = {
  manageCompany: (r: AppRole | null | undefined) => has(r, ["owner", "admin"]),
  manageMembers: (r: AppRole | null | undefined) => has(r, ["owner", "admin"]),
  /** Only owners grant, change or remove the owner and admin roles. */
  manageRole: (actor: AppRole | null | undefined, target: AppRole) =>
    actor === "owner" || (actor === "admin" && target !== "owner" && target !== "admin"),
  seeAllProjects: (r: AppRole | null | undefined) => has(r, ["owner", "admin"]),
  createProject: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "project_manager"]),
  editProject: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "project_manager"]),
  manageProjectTeam: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "project_manager"]),
  editProjectSettings: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "project_manager", "accountant"]),
  seeClients: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "project_manager", "estimator", "accountant"]),
  /** Unit prices, costs, margins, rates. Never foremen, storekeepers or clients. */
  seeCosts: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "project_manager", "estimator", "accountant"]),
  /** Payroll and company-wide finance. */
  seeFinance: (r: AppRole | null | undefined) => has(r, ["owner", "admin", "accountant"]),
  seeAudit: (r: AppRole | null | undefined) => has(r, ["owner", "admin"]),
  uploadFiles: (r: AppRole | null | undefined) => r != null && r !== "client_viewer",
};

/** Roles an actor may assign when inviting or editing members. */
export function assignableRoles(actor: AppRole | null | undefined): AppRole[] {
  return ROLES.filter((r) => can.manageRole(actor, r));
}
