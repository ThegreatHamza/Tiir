import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import {
  fetchComponents,
  fetchItem,
  fetchItems,
  fetchSections,
  fetchTakeoff,
  fetchUpas,
  fetchVersions,
  fetchVersionTotals,
  type BoqItemValue,
} from "./api";

export function useEstimateKeys() {
  const { companyId } = useCurrentCompany();
  const base = ["company", companyId, "estimate"] as const;
  return {
    all: base,
    versions: (projectId: string) => [...base, "versions", projectId] as const,
    version: (versionId: string) => [...base, "version", versionId] as const,
    totals: (versionId: string) => [...base, "version", versionId, "totals"] as const,
    sections: (versionId: string) => [...base, "version", versionId, "sections"] as const,
    items: (versionId: string) => [...base, "version", versionId, "items"] as const,
    upas: (versionId: string) => [...base, "version", versionId, "upas"] as const,
    components: (upaId: string) => [...base, "upa", upaId, "components"] as const,
    takeoff: (itemId: string) => [...base, "item", itemId, "takeoff"] as const,
  };
}

export function useVersions(projectId: string) {
  const keys = useEstimateKeys();
  return useQuery({ queryKey: keys.versions(projectId), queryFn: () => fetchVersions(projectId) });
}

export function useVersionData(versionId: string | null) {
  const keys = useEstimateKeys();
  const id = versionId ?? "";
  const enabled = Boolean(versionId);
  const sections = useQuery({ queryKey: keys.sections(id), queryFn: () => fetchSections(id), enabled });
  const items = useQuery({ queryKey: keys.items(id), queryFn: () => fetchItems(id), enabled });
  const upas = useQuery({ queryKey: keys.upas(id), queryFn: () => fetchUpas(id), enabled });
  const totals = useQuery({ queryKey: keys.totals(id), queryFn: () => fetchVersionTotals(id), enabled });
  return { sections, items, upas, totals };
}

export function useComponents(upaId: string | null) {
  const keys = useEstimateKeys();
  return useQuery({ queryKey: keys.components(upaId ?? ""), queryFn: () => fetchComponents(upaId ?? ""), enabled: Boolean(upaId) });
}

export function useTakeoff(itemId: string | null) {
  const keys = useEstimateKeys();
  return useQuery({ queryKey: keys.takeoff(itemId ?? ""), queryFn: () => fetchTakeoff(itemId ?? ""), enabled: Boolean(itemId) });
}

/** Cache helpers so one edit does not reload a 5 000-line BoQ. */
export function useEstimateCache(versionId: string) {
  const keys = useEstimateKeys();
  const qc = useQueryClient();
  return {
    /** Re-reads one item from the value view and patches it in place. */
    async refreshItem(itemId: string) {
      const row = await fetchItem(itemId);
      qc.setQueryData<BoqItemValue[]>(keys.items(versionId), (old) => {
        if (!old) return old;
        if (!row) return old.filter((r) => r.id !== itemId);
        const idx = old.findIndex((r) => r.id === itemId);
        if (idx < 0) return [...old, row];
        const next = old.slice();
        next[idx] = row;
        return next;
      });
      await qc.invalidateQueries({ queryKey: keys.totals(versionId) });
    },
    patchItems(update: (rows: BoqItemValue[]) => BoqItemValue[]) {
      qc.setQueryData<BoqItemValue[]>(keys.items(versionId), (old) => (old ? update(old) : old));
    },
    invalidateItems: () => qc.invalidateQueries({ queryKey: keys.items(versionId) }),
    invalidateSections: () => qc.invalidateQueries({ queryKey: keys.sections(versionId) }),
    invalidateTotals: () => qc.invalidateQueries({ queryKey: keys.totals(versionId) }),
    invalidateUpas: () => qc.invalidateQueries({ queryKey: keys.upas(versionId) }),
    invalidateVersion: () => qc.invalidateQueries({ queryKey: keys.version(versionId) }),
    invalidateAll: () => qc.invalidateQueries({ queryKey: keys.all }),
  };
}
