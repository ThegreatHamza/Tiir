import type { ListParams } from "./list";

/** Central TanStack Query keys. Everything company-scoped starts with the company id. */
export const qk = {
  profile: (userId: string) => ["profile", userId] as const,
  memberships: (userId: string) => ["memberships", userId] as const,
  invitationsForMe: (userId: string) => ["my-invitations", userId] as const,
  company: (companyId: string) => ["company", companyId] as const,
  companySettings: (companyId: string) => ["company", companyId, "settings"] as const,
  projects: (companyId: string, p?: ListParams) => ["company", companyId, "projects", p ?? null] as const,
  projectOptions: (companyId: string) => ["company", companyId, "project-options"] as const,
  project: (companyId: string, projectId: string) => ["company", companyId, "project", projectId] as const,
  projectSettings: (companyId: string, projectId: string) => ["company", companyId, "project", projectId, "settings"] as const,
  projectMembers: (companyId: string, projectId: string) => ["company", companyId, "project", projectId, "members"] as const,
  clients: (companyId: string, p?: ListParams) => ["company", companyId, "clients", p ?? null] as const,
  clientOptions: (companyId: string) => ["company", companyId, "client-options"] as const,
  members: (companyId: string, p?: ListParams) => ["company", companyId, "members", p ?? null] as const,
  memberOptions: (companyId: string) => ["company", companyId, "member-options"] as const,
  invitations: (companyId: string) => ["company", companyId, "invitations"] as const,
  notifications: (companyId: string, userId: string) => ["company", companyId, "notifications", userId] as const,
};
