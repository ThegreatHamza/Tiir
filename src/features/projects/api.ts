import { supabase, type Tables, type TablesInsert, type TablesUpdate, type Views } from "@/lib/supabase";
import { pageRange, safeSort, searchFilter, EXPORT_LIMIT, type ListParams } from "@/lib/list";

export type ProjectRow = Views<"project_list">;
export type Project = Tables<"projects">;
export type ProjectStatus = Project["status"];
export const PROJECT_STATUSES: readonly ProjectStatus[] = ["draft", "tender", "active", "on_hold", "completed", "cancelled"] as const;

const SORTABLE = ["code", "name", "status", "city", "start_date", "end_date", "created_at", "client_name"] as const;
const SEARCH = ["code", "name", "city", "client_name"] as const;

export async function fetchProjects(companyId: string, p: ListParams, opts: { all?: boolean } = {}) {
  const sort = safeSort(p.sort, SORTABLE, { id: "created_at", desc: true });
  let q = supabase.from("project_list").select("*", { count: "exact" }).eq("company_id", companyId);
  if (!p.showDeleted) q = q.is("deleted_at", null);
  const or = searchFilter(SEARCH, p.q);
  if (or) q = q.or(or);
  const status = p.filters.status;
  if (status && (PROJECT_STATUSES as readonly string[]).includes(status)) q = q.eq("status", status as ProjectStatus);
  if (p.filters.client) q = q.eq("client_id", p.filters.client);
  q = q.order(sort.id, { ascending: !sort.desc, nullsFirst: false }).order("id");
  const [from, to] = opts.all ? [0, EXPORT_LIMIT - 1] : pageRange(p.page, p.pageSize);
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchProject(companyId: string, projectId: string) {
  const { data, error } = await supabase.from("project_list").select("*").eq("company_id", companyId).eq("id", projectId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProjectOptions(companyId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, code, name")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("code");
  if (error) throw error;
  return data ?? [];
}

export async function createProject(values: TablesInsert<"projects">) {
  const { data, error } = await supabase.from("projects").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateProject(id: string, values: TablesUpdate<"projects">) {
  const { error } = await supabase.from("projects").update(values).eq("id", id);
  if (error) throw error;
}

export async function setProjectDeleted(id: string, deleted: boolean) {
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchProjectSettings(projectId: string) {
  const { data, error } = await supabase.from("project_settings").select("*").eq("project_id", projectId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProjectSettings(projectId: string, values: TablesUpdate<"project_settings">) {
  const { error } = await supabase.from("project_settings").update(values).eq("project_id", projectId);
  if (error) throw error;
}

export async function fetchProjectMembers(companyId: string, projectId: string) {
  const { data, error } = await supabase
    .from("project_members")
    .select("id, user_id")
    .eq("company_id", companyId)
    .eq("project_id", projectId)
    .is("deleted_at", null);
  if (error) throw error;
  const ids = (data ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];
  const { data: people, error: e2 } = await supabase
    .from("company_member_directory")
    .select("user_id, full_name, email, role")
    .eq("company_id", companyId)
    .in("user_id", ids)
    .is("deleted_at", null);
  if (e2) throw e2;
  const byUser = new Map((people ?? []).map((p) => [p.user_id, p]));
  return (data ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    full_name: byUser.get(m.user_id)?.full_name ?? "",
    email: byUser.get(m.user_id)?.email ?? "",
    role: byUser.get(m.user_id)?.role ?? null,
  }));
}

export async function addProjectMember(companyId: string, projectId: string, userId: string) {
  const { error } = await supabase.from("project_members").insert({ company_id: companyId, project_id: projectId, user_id: userId });
  if (error) throw error;
}

export async function removeProjectMember(memberId: string) {
  const { error } = await supabase.from("project_members").update({ deleted_at: new Date().toISOString() }).eq("id", memberId);
  if (error) throw error;
}
