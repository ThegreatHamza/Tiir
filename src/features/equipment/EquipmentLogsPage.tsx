import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { formatDate, formatNumber, todayIso } from "@/lib/format";
import { supabase } from "@/lib/supabase";

/** Daily hours and fuel per machine on this project (works offline). */
export function EquipmentLogsPage() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const config: CrudConfig<"equipment_logs"> = {
    table: "equipment_logs",
    scope: "project",
    title: t("equipment.logsTitle"),
    subtitle: t("equipment.logsSubtitle"),
    singular: t("equipment.log"),
    emptyTitle: t("equipment.noLogs"),
    emptyHint: t("equipment.noLogsHint"),
    offline: "equipment_logs",
    canWrite: ["owner", "admin", "project_manager", "site_foreman"].includes(role),
    searchColumns: ["operator_name", "notes"],
    sortable: ["log_date", "hours", "fuel_litres"],
    defaultSort: { id: "log_date", desc: true },
    columns: [
      {
        id: "log_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.log_date)}</span>,
        exportValue: (r) => formatDate(r.log_date),
      },
      { id: "equipment_id", header: t("equipment.singular"), cell: (r) => <EquipmentName id={r.equipment_id} /> },
      { id: "operator_name", header: t("equipment.operator"), cell: (r) => r.operator_name ?? "—", exportValue: (r) => r.operator_name },
      {
        id: "hours",
        header: t("equipment.hours"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatNumber(r.hours, lang, 1)} h</span>,
        exportValue: (r) => r.hours,
      },
      {
        id: "fuel_litres",
        header: t("equipment.fuel"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatNumber(r.fuel_litres, lang, 1)} l</span>,
        exportValue: (r) => r.fuel_litres,
      },
    ],
    fields: [
      {
        name: "equipment_id",
        label: t("equipment.singular"),
        type: "relation",
        required: true,
        span: 2,
        relation: {
          table: "equipment_site",
          label: (r) => `${String(r.code)} — ${String(r.name)}`,
          order: "code",
          filter: { status: "active" },
        },
      },
      { name: "log_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "operator_name", label: t("equipment.operator"), type: "text" },
      { name: "hours", label: t("equipment.hours"), type: "number", required: true, min: 0, max: 24 },
      { name: "fuel_litres", label: t("equipment.fuel"), type: "number", min: 0, defaultValue: 0 },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} />;
}

function EquipmentName({ id }: { id: string }) {
  const { companyId } = useCurrentCompany();
  const names = useEquipmentNames(companyId);
  return <span>{names.get(id) ?? "…"}</span>;
}

function useEquipmentNames(companyId: string): Map<string, string> {
  const q = useQuery({
    queryKey: ["company", companyId, "equipment-names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_site").select("id, code, name").eq("company_id", companyId);
      if (error) throw error;
      return new Map((data ?? []).map((e) => [e.id, `${e.code} — ${e.name}`]));
    },
    staleTime: 5 * 60_000,
  });
  return q.data ?? new Map();
}
