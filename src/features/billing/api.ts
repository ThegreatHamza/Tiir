import { supabase, type Tables, type Views } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";

export type ClaimValues = Views<"progress_claim_values">;
export type ClaimLine = Tables<"progress_claim_lines"> & { code: string; description: string; unit: string; position: number };

export async function fetchClaims(projectId: string) {
  const { data, error } = await supabase
    .from("progress_claim_values")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("number", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClaim(claimId: string) {
  const { data, error } = await supabase.from("progress_claim_values").select("*").eq("id", claimId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Claim lines with their BoQ code/description (site view: no prices there, prices are on the line). */
export async function fetchClaimLines(claimId: string, projectId: string): Promise<ClaimLine[]> {
  const [lines, items] = await Promise.all([
    fetchAllPages<Tables<"progress_claim_lines">>((f, t) =>
      supabase.from("progress_claim_lines").select("*").eq("claim_id", claimId).is("deleted_at", null).range(f, t),
    ),
    fetchAllPages<Views<"boq_items_site">>((f, t) => supabase.from("boq_items_site").select("*").eq("project_id", projectId).range(f, t)),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  return lines
    .map((l) => {
      const i = byId.get(l.boq_item_id);
      return { ...l, code: i?.code ?? "", description: i?.description ?? "", unit: i?.unit ?? "u", position: i?.position ?? 0 };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }) || a.position - b.position);
}

export async function createClaim(projectId: string, periodEnd: string) {
  const { data, error } = await supabase.rpc("create_progress_claim", { p_project_id: projectId, p_period_end: periodEnd });
  if (error) throw error;
  return data;
}

export async function setClaimStatus(claimId: string, status: Tables<"progress_claims">["status"]) {
  const { error } = await supabase.from("progress_claims").update({ status }).eq("id", claimId);
  if (error) throw error;
}

export async function decideClaim(claimId: string, approve: boolean, comment: string) {
  const { error } = await supabase.rpc("decide_progress_claim", { p_claim_id: claimId, p_approve: approve, p_comment: comment });
  if (error) throw error;
}

export async function updateClaimLine(id: string, cumulative: number) {
  const { error } = await supabase.from("progress_claim_lines").update({ cumulative_quantity: cumulative }).eq("id", id);
  if (error) throw error;
}

export async function updateClaim(
  id: string,
  values: { period_end?: string; notes?: string | null; retention_rate?: number; advance_recovery_rate?: number; vat_rate?: number },
) {
  const { error } = await supabase.from("progress_claims").update(values).eq("id", id);
  if (error) throw error;
}
