import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";

export function SuppliersPage() {
  const { t } = useTranslation();
  const { role } = useCurrentCompany();
  const kinds = ["supplier", "subcontractor", "both"].map((v) => ({ value: v, label: t(`suppliers.kinds.${v}`) }));
  const config: CrudConfig<"suppliers"> = {
    table: "suppliers",
    scope: "company",
    title: t("suppliers.title"),
    subtitle: t("suppliers.subtitle"),
    singular: t("suppliers.singular"),
    emptyTitle: t("suppliers.empty"),
    emptyHint: t("suppliers.emptyHint"),
    canWrite: ["owner", "admin", "project_manager", "accountant", "storekeeper"].includes(role),
    searchColumns: ["name", "contact_name", "phone", "email"],
    sortable: ["name", "kind"],
    defaultSort: { id: "name", desc: false },
    filters: [{ name: "kind", label: t("suppliers.allKinds"), options: kinds }],
    columns: [
      {
        id: "name",
        header: t("common.name"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.name}</span>,
        exportValue: (r) => r.name,
      },
      {
        id: "kind",
        header: t("suppliers.kind"),
        sortable: true,
        cell: (r) => <Badge variant="secondary">{t(`suppliers.kinds.${r.kind}`)}</Badge>,
        exportValue: (r) => t(`suppliers.kinds.${r.kind}`),
      },
      { id: "contact_name", header: t("suppliers.contact"), cell: (r) => r.contact_name ?? "—", exportValue: (r) => r.contact_name },
      {
        id: "phone",
        header: t("common.phone"),
        cell: (r) => (
          <span className="num" dir="ltr">
            {r.phone ?? "—"}
          </span>
        ),
        exportValue: (r) => r.phone,
      },
      { id: "email", header: t("common.email"), cell: (r) => r.email ?? "—", exportValue: (r) => r.email },
    ],
    fields: [
      { name: "name", label: t("common.name"), type: "text", required: true, span: 2 },
      { name: "kind", label: t("suppliers.kind"), type: "select", options: kinds, required: true, defaultValue: "supplier" },
      { name: "contact_name", label: t("suppliers.contact"), type: "text" },
      { name: "phone", label: t("common.phone"), type: "text" },
      { name: "email", label: t("common.email"), type: "text" },
      { name: "tax_id", label: t("suppliers.taxId"), type: "text" },
      { name: "address", label: t("common.address"), type: "text", span: 2 },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} />;
}
