import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/lib/db";
import type { FieldDef } from "./types";

export function useRelationOptions(field: FieldDef, companyId: string, projectId: string | undefined, enabled = true) {
  const rel = field.relation;
  return useQuery({
    queryKey: ["company", companyId, "relation", rel?.table, rel?.scope ?? "company", projectId ?? null, rel?.filter ?? null],
    enabled: Boolean(rel) && enabled,
    queryFn: async () => {
      if (!rel) return [];
      let q = db.from(rel.table).select("*").eq("company_id", companyId);
      if (rel.scope === "project" && projectId) q = q.eq("project_id", projectId);
      for (const [k, v] of Object.entries(rel.filter ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
      const { data, error } = await q.order(rel.order ?? "created_at").limit(2000);
      if (error) throw error;
      return (data ?? []).filter((r) => !r.deleted_at).map((r) => ({ value: String(r[rel.valueKey ?? "id"]), label: rel.label(r) }));
    },
  });
}

export function RelationSelect({
  field,
  companyId,
  projectId,
  value,
  onChange,
  id,
  disabled,
}: {
  field: FieldDef;
  companyId: string;
  projectId?: string;
  value: string;
  onChange: (v: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const options = useRelationOptions(field, companyId, projectId);
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || options.isLoading}>
      <option value="">{field.relation?.allowEmpty === false ? t("common.choose") : t("common.none")}</option>
      {(options.data ?? []).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
