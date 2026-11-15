import { useTranslation } from "react-i18next";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { itemsToText, parseItems } from "./checklist";

export function ChecklistTemplatesPage() {
  const { t } = useTranslation();
  const config: CrudConfig<"checklist_templates"> = {
    table: "checklist_templates",
    scope: "company",
    title: t("quality.templatesTitle"),
    subtitle: t("quality.templatesSubtitle"),
    singular: t("quality.template"),
    emptyTitle: t("quality.noTemplates"),
    emptyHint: t("quality.noTemplatesHint"),
    canWrite: true,
    searchColumns: ["name", "category"],
    sortable: ["name", "category"],
    defaultSort: { id: "name", desc: false },
    columns: [
      {
        id: "name",
        header: t("common.name"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.name}</span>,
        exportValue: (r) => r.name,
      },
      { id: "category", header: t("quality.category"), sortable: true, cell: (r) => r.category ?? "—", exportValue: (r) => r.category },
      {
        id: "items",
        header: t("quality.points"),
        align: "end",
        cell: (r) => <span className="num">{Array.isArray(r.items) ? r.items.length : 0}</span>,
        exportValue: (r) => itemsToText(r.items),
      },
    ],
    fields: [
      { name: "name", label: t("common.name"), type: "text", required: true },
      { name: "category", label: t("quality.category"), type: "text", hint: t("quality.categoryHint") },
      { name: "items", label: t("quality.points"), type: "textarea", required: true, hint: t("quality.pointsHint"), toForm: itemsToText },
    ],
    toPayload: (v) => ({ ...v, items: parseItems(String(v.items ?? "")) }),
  };
  return <CrudPage config={config} />;
}
