import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase, type Views } from "@/lib/supabase";
import { EXPORT_LIMIT, pageRange, safeSort, searchFilter, type ListParams } from "@/lib/list";
import { ROLES, type AppRole } from "@/lib/roles";

export type MemberRow = Views<"company_member_directory">;

const SORTABLE = ["full_name", "email", "role", "status", "created_at", "project_count"] as const;
const SEARCH = ["full_name", "email", "phone"] as const;

export async function fetchMembers(companyId: string, p: ListParams, opts: { all?: boolean } = {}) {
  const sort = safeSort(p.sort, SORTABLE, { id: "full_name", desc: false });
  let q = supabase.from("company_member_directory").select("*", { count: "exact" }).eq("company_id", companyId);
  if (!p.showDeleted) q = q.is("deleted_at", null);
  const or = searchFilter(SEARCH, p.q);
  if (or) q = q.or(or);
  const role = p.filters.role;
  if (role && (ROLES as readonly string[]).includes(role)) q = q.eq("role", role as AppRole);
  const status = p.filters.status;
  if (status === "active" || status === "disabled") q = q.eq("status", status);
  q = q.order(sort.id, { ascending: !sort.desc, nullsFirst: false }).order("id");
  const [from, to] = opts.all ? [0, EXPORT_LIMIT - 1] : pageRange(p.page, p.pageSize);
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchMemberOptions(companyId: string) {
  const { data, error } = await supabase
    .from("company_member_directory")
    .select("user_id, full_name, email, role")
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("full_name");
  if (error) throw error;
  return (data ?? []).flatMap((m) =>
    m.user_id && m.role ? [{ user_id: m.user_id, full_name: m.full_name ?? "", email: m.email ?? "", role: m.role }] : [],
  );
}

export async function fetchInvitations(companyId: string) {
  const { data, error } = await supabase
    .from("company_invitations")
    .select("id, email, role, project_ids, created_at, expires_at")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function revokeInvitation(id: string) {
  const { error } = await supabase.from("company_invitations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export type InviteResult = { delivery: "email" | "in_app" | "failed" };

/**
 * Invites through the `invite-member` Edge Function (sends the email with the
 * service role on the server). If the function is not deployed, the
 * invitation is still created and the person sees it after signing in.
 */
export async function inviteMember(input: {
  companyId: string;
  email: string;
  role: AppRole;
  projectIds: string[];
  language: string;
}): Promise<InviteResult> {
  const { data, error } = await supabase.functions.invoke<InviteResult & { error?: string }>("invite-member", {
    body: {
      company_id: input.companyId,
      email: input.email,
      role: input.role,
      project_ids: input.projectIds,
      language: input.language,
      redirect_to: `${window.location.origin}/accept-invite`,
    },
  });
  if (!error && data) return { delivery: data.delivery };

  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => ({}))) as { error?: string; code?: string };
    throw Object.assign(new Error(body.error ?? "invite failed"), { code: body.code });
  }
  // Function unreachable (not deployed / offline): create the invitation directly.
  const { error: rpcError } = await supabase.rpc("create_invitation", {
    p_company_id: input.companyId,
    p_email: input.email,
    p_role: input.role,
    p_project_ids: input.projectIds,
  });
  if (rpcError) throw rpcError;
  return { delivery: "in_app" };
}

export async function updateMember(memberId: string, patch: { role?: AppRole; status?: "active" | "disabled" }) {
  const { error } = await supabase.from("company_members").update(patch).eq("id", memberId);
  if (error) throw error;
}

export async function removeMember(memberId: string) {
  const { error } = await supabase.from("company_members").update({ deleted_at: new Date().toISOString() }).eq("id", memberId);
  if (error) throw error;
}

export async function setMemberProjects(companyId: string, userId: string, projectIds: string[]) {
  const { error } = await supabase.rpc("set_member_projects", { p_company_id: companyId, p_user_id: userId, p_project_ids: projectIds });
  if (error) throw error;
}
