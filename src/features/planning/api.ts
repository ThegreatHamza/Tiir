import { supabase, type Tables, type TablesUpdate } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";

export type Task = Tables<"tasks">;
export type TaskDependency = Tables<"task_dependencies">;
export type Baseline = Tables<"baselines">;
export type BaselineTask = Tables<"baseline_tasks">;
export type CalendarRow = Tables<"calendars">;

export async function fetchProjectCalendar(companyId: string, projectId: string) {
  const { data: settings } = await supabase.from("project_settings").select("calendar_id").eq("project_id", projectId).maybeSingle();
  let q = supabase.from("calendars").select("*").eq("company_id", companyId).is("deleted_at", null);
  q = settings?.calendar_id ? q.eq("id", settings.calendar_id) : q.eq("is_default", true);
  const { data: cal, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  const holidays = cal
    ? ((await supabase.from("holidays").select("date").eq("calendar_id", cal.id).is("deleted_at", null)).data ?? []).map((h) => h.date)
    : [];
  return { calendar: cal, holidays };
}

export async function fetchTasks(projectId: string) {
  return fetchAllPages<Task>((from, to) =>
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position")
      .order("created_at")
      .range(from, to),
  );
}

export async function fetchDependencies(projectId: string) {
  return fetchAllPages<TaskDependency>((from, to) =>
    supabase.from("task_dependencies").select("*").eq("project_id", projectId).is("deleted_at", null).range(from, to),
  );
}

export async function fetchActiveBaseline(projectId: string) {
  const { data: b, error } = await supabase
    .from("baselines")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!b) return { baseline: null, tasks: [] as BaselineTask[] };
  const tasks = await fetchAllPages<BaselineTask>((from, to) =>
    supabase.from("baseline_tasks").select("*").eq("baseline_id", b.id).range(from, to),
  );
  return { baseline: b, tasks };
}

export async function insertTask(values: {
  company_id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  position: number;
}) {
  const { data, error } = await supabase.from("tasks").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateTask(id: string, values: TablesUpdate<"tasks">) {
  const { error } = await supabase.from("tasks").update(values).eq("id", id);
  if (error) throw error;
}

export async function saveSchedule(
  projectId: string,
  rows: { id: string; start_date: string; end_date: string; duration: number; wbs_code?: string; position?: number }[],
) {
  if (!rows.length) return 0;
  const { data, error } = await supabase.rpc("save_task_schedule", { p_project_id: projectId, p_rows: rows });
  if (error) throw error;
  return data;
}

export async function addDependency(values: {
  company_id: string;
  project_id: string;
  predecessor_id: string;
  successor_id: string;
  type: TaskDependency["type"];
  lag_days: number;
}) {
  const { error } = await supabase.from("task_dependencies").insert(values);
  if (error) throw error;
}

export async function updateDependency(id: string, values: TablesUpdate<"task_dependencies">) {
  const { error } = await supabase.from("task_dependencies").update(values).eq("id", id);
  if (error) throw error;
}

export async function createBaseline(projectId: string, name: string) {
  const { error } = await supabase.rpc("create_baseline", { p_project_id: projectId, p_name: name });
  if (error) throw error;
}

export async function fetchTaskLinks(taskId: string) {
  const { data, error } = await supabase.from("task_boq_links").select("id, boq_item_id").eq("task_id", taskId).is("deleted_at", null);
  if (error) throw error;
  return data ?? [];
}

export async function setTaskLinks(
  scope: { companyId: string; projectId: string },
  taskId: string,
  itemIds: string[],
  existing: { id: string; boq_item_id: string }[],
) {
  const keep = new Set(itemIds);
  const removed = existing.filter((l) => !keep.has(l.boq_item_id));
  for (const l of removed) {
    const { error } = await supabase.from("task_boq_links").update({ deleted_at: new Date().toISOString() }).eq("id", l.id);
    if (error) throw error;
  }
  const have = new Set(existing.map((l) => l.boq_item_id));
  const added = itemIds.filter((id) => !have.has(id));
  if (added.length) {
    const { error } = await supabase
      .from("task_boq_links")
      .insert(added.map((boq_item_id) => ({ company_id: scope.companyId, project_id: scope.projectId, task_id: taskId, boq_item_id })));
    if (error) throw error;
  }
}

export async function fetchCurrentBoqItems(projectId: string) {
  const { data, error } = await supabase
    .from("current_boq_items_site")
    .select("id, code, description, unit, quantity")
    .eq("project_id", projectId)
    .order("position")
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}
