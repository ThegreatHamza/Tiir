import { supabase, type Tables, type Views } from "@/lib/supabase";
import { EXPORT_LIMIT, pageRange, safeSort, searchFilter, type ListParams } from "@/lib/list";

export type ReportRow = Views<"daily_report_list">;
export type Report = Tables<"daily_reports">;
export type LabourLine = Tables<"daily_report_labour">;
export type EquipmentLine = Tables<"daily_report_equipment">;
export type MaterialLine = Tables<"daily_report_materials">;
export type ProgressEntry = Tables<"progress_entries">;
export type Incident = Tables<"incidents">;
export type Photo = Tables<"photos">;

export const WEATHER: Report["weather"][] = ["sunny", "cloudy", "windy", "heat", "rain", "storm", "sandstorm"];
export const TRADES = [
  "mason",
  "ironworker",
  "carpenter",
  "labourer",
  "electrician",
  "plumber",
  "painter",
  "welder",
  "operator",
  "driver",
  "foreman",
] as const;

export async function fetchReports(projectId: string, p: ListParams, all = false) {
  const sort = safeSort(p.sort, ["report_date", "status", "labour_count", "photo_count"], { id: "report_date", desc: true });
  let q = supabase.from("daily_report_list").select("*", { count: "exact" }).eq("project_id", projectId).is("deleted_at", null);
  const or = searchFilter(["summary", "author_name"], p.q);
  if (or) q = q.or(or);
  if (p.filters.status === "draft" || p.filters.status === "submitted") q = q.eq("status", p.filters.status);
  const [from, to] = all ? [0, EXPORT_LIMIT - 1] : pageRange(p.page, p.pageSize);
  const { data, error, count } = await q.order(sort.id, { ascending: !sort.desc }).order("id").range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchReportForDate(projectId: string, date: string) {
  const { data } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("project_id", projectId)
    .eq("report_date", date)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

export async function fetchReportDetail(id: string) {
  const [report, labour, equipment, materials, progress, incidents, photos] = await Promise.all([
    supabase.from("daily_reports").select("*").eq("id", id).maybeSingle(),
    supabase.from("daily_report_labour").select("*").eq("daily_report_id", id).is("deleted_at", null).order("created_at"),
    supabase.from("daily_report_equipment").select("*").eq("daily_report_id", id).is("deleted_at", null).order("created_at"),
    supabase.from("daily_report_materials").select("*").eq("daily_report_id", id).is("deleted_at", null).order("created_at"),
    supabase.from("progress_entries").select("*").eq("daily_report_id", id).is("deleted_at", null).order("created_at"),
    supabase.from("incidents").select("*").eq("daily_report_id", id).is("deleted_at", null).order("occurred_at"),
    supabase.from("photos").select("*").eq("daily_report_id", id).is("deleted_at", null).order("taken_at"),
  ]);
  for (const r of [report, labour, equipment, materials, progress, incidents, photos]) if (r.error) throw r.error;
  return {
    report: report.data,
    labour: labour.data ?? [],
    equipment: equipment.data ?? [],
    materials: materials.data ?? [],
    progress: progress.data ?? [],
    incidents: incidents.data ?? [],
    photos: photos.data ?? [],
  };
}

export async function fetchLastLabour(projectId: string, beforeDate: string) {
  const { data: prev } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("project_id", projectId)
    .lt("report_date", beforeDate)
    .is("deleted_at", null)
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prev) return [];
  const { data } = await supabase
    .from("daily_report_labour")
    .select("trade, headcount, hours")
    .eq("daily_report_id", prev.id)
    .is("deleted_at", null);
  return data ?? [];
}

export async function fetchSiteItems(projectId: string) {
  const { data, error } = await supabase.from("boq_item_progress").select("*").eq("project_id", projectId).order("code").limit(6000);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSiteResources(companyId: string) {
  const { data } = await supabase
    .from("resources_site")
    .select("id, code, name, unit")
    .eq("company_id", companyId)
    .eq("kind", "material")
    .order("name")
    .limit(2000);
  return data ?? [];
}

export async function fetchPhotos(projectId: string, limit = 120) {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("taken_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await supabase.storage.from("tiir").createSignedUrls(paths, 3600);
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path ?? "", d.signedUrl ?? ""] as [string, string]));
}
