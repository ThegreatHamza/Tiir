import { supabase, type TablesUpdate } from "@/lib/supabase";

export async function fetchCompany(companyId: string) {
  const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();
  if (error) throw error;
  return data;
}

export async function updateCompany(companyId: string, values: TablesUpdate<"companies">) {
  const { error } = await supabase.from("companies").update(values).eq("id", companyId);
  if (error) throw error;
}

export async function fetchCompanySettings(companyId: string) {
  const { data, error } = await supabase.from("company_settings").select("*").eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCompanySettings(companyId: string, values: TablesUpdate<"company_settings">) {
  const { error } = await supabase.from("company_settings").update(values).eq("company_id", companyId);
  if (error) throw error;
}
