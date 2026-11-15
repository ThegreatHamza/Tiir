import { supabase, type Tables, type TablesInsert, type TablesUpdate } from "@/lib/supabase";
import { EXPORT_LIMIT, pageRange, safeSort, searchFilter, type ListParams } from "@/lib/list";

export type Client = Tables<"clients">;

const SORTABLE = ["name", "contact_name", "email", "phone", "created_at"] as const;
const SEARCH = ["name", "contact_name", "email", "phone", "tax_id"] as const;

export async function fetchClients(companyId: string, p: ListParams, opts: { all?: boolean } = {}) {
  const sort = safeSort(p.sort, SORTABLE, { id: "name", desc: false });
  let q = supabase.from("clients").select("*", { count: "exact" }).eq("company_id", companyId);
  if (!p.showDeleted) q = q.is("deleted_at", null);
  const or = searchFilter(SEARCH, p.q);
  if (or) q = q.or(or);
  q = q.order(sort.id, { ascending: !sort.desc, nullsFirst: false }).order("id");
  const [from, to] = opts.all ? [0, EXPORT_LIMIT - 1] : pageRange(p.page, p.pageSize);
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchClientOptions(companyId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createClient(values: TablesInsert<"clients">) {
  const { error } = await supabase.from("clients").insert(values);
  if (error) throw error;
}

export async function updateClient(id: string, values: TablesUpdate<"clients">) {
  const { error } = await supabase.from("clients").update(values).eq("id", id);
  if (error) throw error;
}

export async function setClientDeleted(id: string, deleted: boolean) {
  await updateClient(id, { deleted_at: deleted ? new Date().toISOString() : null });
}
