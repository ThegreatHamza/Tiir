import { supabase, type Views } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";
import { fetchProjectCalendar, fetchTasks } from "@/features/planning/api";
import { buildCalendar } from "@/features/planning/model";
import { plannedPercent } from "@/lib/calc/schedule";

export type CostEntry = Views<"project_cost_entries">;

export async function fetchCurrentVersionId(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("boq_versions_site")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Everything the cost screen needs, in one round of parallel queries. */
export async function fetchCostData(companyId: string, projectId: string, country: "DJ" | "ET", today: string) {
  const versionId = await fetchCurrentVersionId(projectId);
  const [items, progress, entries, payments, tasks, cal] = await Promise.all([
    versionId
      ? fetchAllPages<Views<"boq_item_values">>((f, t) =>
          supabase.from("boq_item_values").select("*").eq("version_id", versionId).is("deleted_at", null).order("position").range(f, t),
        )
      : Promise.resolve([] as Views<"boq_item_values">[]),
    fetchAllPages<Views<"boq_item_progress">>((f, t) =>
      supabase.from("boq_item_progress").select("*").eq("project_id", projectId).range(f, t),
    ),
    fetchAllPages<CostEntry>((f, t) =>
      supabase.from("project_cost_entries").select("*").eq("project_id", projectId).order("entry_date").range(f, t),
    ),
    fetchAllPages<{ payment_date: string; amount: number }>((f, t) =>
      supabase.from("client_payments").select("payment_date, amount").eq("project_id", projectId).is("deleted_at", null).range(f, t),
    ),
    fetchTasks(projectId),
    fetchProjectCalendar(companyId, projectId),
  ]);
  const calendar = buildCalendar(cal.calendar?.working_days, cal.holidays, country);
  // Planned % of the whole project today = duration-weighted planned % of leaf tasks.
  const parents = new Set(tasks.map((t) => t.parent_id).filter(Boolean));
  const leaves = tasks.filter((t) => !parents.has(t.id) && t.start_date && t.end_date);
  const weight = leaves.reduce((s, t) => s + Math.max(1, t.duration ?? 1), 0);
  const projectPlanned = weight
    ? leaves.reduce((s, t) => s + Math.max(1, t.duration ?? 1) * plannedPercent(t.start_date, t.end_date, today, calendar), 0) / weight
    : null;
  return { items, progress, entries, payments, projectPlanned };
}
