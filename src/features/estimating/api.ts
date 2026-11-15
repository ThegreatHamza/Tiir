import { supabase, type Tables, type TablesInsert, type TablesUpdate, type Views } from "@/lib/supabase";
import { EXPORT_LIMIT, pageRange, safeSort, searchFilter, type ListParams } from "@/lib/list";
import { fetchAllPages } from "@/lib/fetchAll";
import { CURRENCIES, type CurrencyCode } from "@/lib/calc/money";
import { RESOURCE_KINDS, type ParsedResource, type ResourceKind } from "@/lib/import/priceResources";

export type PriceResource = Tables<"price_resources">;
export type BoqVersion = Tables<"boq_versions">;
export type BoqSection = Tables<"boq_sections">;
export type BoqItemValue = Views<"boq_item_values">;
export type BoqVersionTotals = Views<"boq_version_totals">;
export type UpaValue = Views<"upa_values">;
export type UpaComponentValue = Views<"upa_component_values">;
export type TakeoffLine = Tables<"takeoff_lines">;

// ---------------------------------------------------------------------------
// Price library
// ---------------------------------------------------------------------------
const RES_SORT = ["code", "name", "kind", "unit", "unit_cost", "currency", "updated_at"] as const;
const RES_SEARCH = ["code", "name", "supplier_name"] as const;

export async function fetchResources(companyId: string, p: ListParams, opts: { all?: boolean } = {}) {
  const sort = safeSort(p.sort, RES_SORT, { id: "code", desc: false });
  let q = supabase.from("price_resources").select("*", { count: "exact" }).eq("company_id", companyId);
  if (!p.showDeleted) q = q.is("deleted_at", null);
  const or = searchFilter(RES_SEARCH, p.q);
  if (or) q = q.or(or);
  const kind = p.filters.kind;
  if (kind && (RESOURCE_KINDS as readonly string[]).includes(kind)) q = q.eq("kind", kind as ResourceKind);
  const cur = p.filters.currency;
  if (cur && (CURRENCIES as readonly string[]).includes(cur)) q = q.eq("currency", cur as CurrencyCode);
  q = q.order(sort.id, { ascending: !sort.desc }).order("id");
  const [from, to] = opts.all ? [0, EXPORT_LIMIT - 1] : pageRange(p.page, p.pageSize);
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/** Resources usable in a project (same currency), for pickers. */
export async function searchResources(companyId: string, currency: CurrencyCode, term: string) {
  let q = supabase
    .from("price_resources")
    .select("id, code, name, kind, unit, unit_cost, currency")
    .eq("company_id", companyId)
    .eq("currency", currency)
    .is("deleted_at", null);
  const or = searchFilter(["code", "name"], term);
  if (or) q = q.or(or);
  const { data, error } = await q.order("code").limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function saveResource(id: string | null, values: TablesInsert<"price_resources">) {
  const { error } = id
    ? await supabase.from("price_resources").update(values).eq("id", id)
    : await supabase.from("price_resources").insert(values);
  if (error) throw error;
}

export async function setResourceDeleted(id: string, deleted: boolean) {
  const { error } = await supabase
    .from("price_resources")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function importResources(companyId: string, rows: ParsedResource[]) {
  const { data, error } = await supabase.rpc("import_price_resources", { p_company_id: companyId, p_rows: rows });
  if (error) throw error;
  return data as { inserted: number; updated: number };
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------
export async function fetchVersions(projectId: string) {
  const { data, error } = await supabase
    .from("boq_versions")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("number", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchVersionTotals(versionId: string) {
  const { data, error } = await supabase.from("boq_version_totals").select("*").eq("version_id", versionId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVersion(projectId: string, name: string, sourceId: string | null) {
  const { data, error } = await supabase.rpc("create_boq_version", {
    p_project_id: projectId,
    p_name: name,
    ...(sourceId ? { p_source_id: sourceId } : {}),
  });
  if (error) throw error;
  return data;
}

export async function updateVersion(id: string, values: TablesUpdate<"boq_versions">) {
  const { error } = await supabase.from("boq_versions").update(values).eq("id", id);
  if (error) throw error;
}

export async function setCurrentVersion(id: string) {
  const { error } = await supabase.rpc("set_current_boq_version", { p_version_id: id });
  if (error) throw error;
}

export async function renumber(versionId: string) {
  const { error } = await supabase.rpc("renumber_boq", { p_version_id: versionId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Sections and items
// ---------------------------------------------------------------------------
export async function fetchSections(versionId: string) {
  const { data, error } = await supabase
    .from("boq_sections")
    .select("*")
    .eq("version_id", versionId)
    .is("deleted_at", null)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchItems(versionId: string) {
  return fetchAllPages<BoqItemValue>((from, to) =>
    supabase
      .from("boq_item_values")
      .select("*")
      .eq("version_id", versionId)
      .order("position")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
}

export async function fetchItem(id: string) {
  const { data, error } = await supabase.from("boq_item_values").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Where an estimate row lives. company_id/project_id are re-derived from the version by a trigger. */
export type VersionScope = { companyId: string; projectId: string; versionId: string };

export async function insertSection(scope: VersionScope, title: string, position: number) {
  const { data, error } = await supabase
    .from("boq_sections")
    .insert({ company_id: scope.companyId, project_id: scope.projectId, version_id: scope.versionId, title, position })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSection(id: string, values: TablesUpdate<"boq_sections">) {
  const { error } = await supabase.from("boq_sections").update(values).eq("id", id);
  if (error) throw error;
}

export async function insertItem(values: TablesInsert<"boq_items">) {
  const { data, error } = await supabase.from("boq_items").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateItem(id: string, values: TablesUpdate<"boq_items">) {
  const { error } = await supabase.from("boq_items").update(values).eq("id", id);
  if (error) throw error;
}

export async function reorderSections(versionId: string, ids: string[]) {
  const { error } = await supabase.rpc("reorder_boq_sections", { p_version_id: versionId, p_section_ids: ids });
  if (error) throw error;
}

export async function reorderItems(sectionId: string, ids: string[]) {
  const { error } = await supabase.rpc("reorder_boq_items", { p_section_id: sectionId, p_item_ids: ids });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Takeoff
// ---------------------------------------------------------------------------
export async function fetchTakeoff(itemId: string) {
  const { data, error } = await supabase
    .from("takeoff_lines")
    .select("*")
    .eq("item_id", itemId)
    .is("deleted_at", null)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTakeoffForVersion(versionId: string) {
  return fetchAllPages<TakeoffLine>((from, to) =>
    supabase
      .from("takeoff_lines")
      .select("*")
      .eq("version_id", versionId)
      .is("deleted_at", null)
      .order("item_id")
      .order("position")
      .order("id")
      .range(from, to),
  );
}

export async function insertTakeoff(values: TablesInsert<"takeoff_lines">) {
  const { error } = await supabase.from("takeoff_lines").insert(values);
  if (error) throw error;
}

export async function updateTakeoff(id: string, values: TablesUpdate<"takeoff_lines">) {
  const { error } = await supabase.from("takeoff_lines").update(values).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Unit price analyses
// ---------------------------------------------------------------------------
export async function fetchUpas(versionId: string) {
  const { data, error } = await supabase.from("upa_values").select("*").eq("version_id", versionId).order("code");
  if (error) throw error;
  return data ?? [];
}

export async function fetchComponents(upaId: string) {
  const { data, error } = await supabase.from("upa_component_values").select("*").eq("upa_id", upaId).order("position").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchComponentsForVersion(versionId: string) {
  return fetchAllPages<UpaComponentValue>((from, to) =>
    supabase
      .from("upa_component_values")
      .select("*")
      .eq("version_id", versionId)
      .order("upa_id")
      .order("position")
      .order("id")
      .range(from, to),
  );
}

export async function saveUpa(id: string | null, values: TablesInsert<"unit_price_analyses">) {
  if (id) {
    const { error } = await supabase.from("unit_price_analyses").update(values).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("unit_price_analyses").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function setUpaDeleted(id: string) {
  const { error } = await supabase.from("unit_price_analyses").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function insertComponent(values: TablesInsert<"unit_price_components">) {
  const { error } = await supabase.from("unit_price_components").insert(values);
  if (error) throw error;
}

export async function updateComponent(id: string, values: TablesUpdate<"unit_price_components">) {
  const { error } = await supabase.from("unit_price_components").update(values).eq("id", id);
  if (error) throw error;
}

export async function refreshUpaPrices(upaId: string) {
  const { data, error } = await supabase.rpc("refresh_upa_prices", { p_upa_id: upaId });
  if (error) throw error;
  return data;
}
