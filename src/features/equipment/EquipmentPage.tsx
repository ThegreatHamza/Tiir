import * as React from "react";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { currentLanguage } from "@/i18n";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { CURRENCIES, type CurrencyCode } from "@/lib/calc/money";

export const EQ_BADGE: Record<string, BadgeProps["variant"]> = {
  active: "success",
  maintenance: "warning",
  retired: "secondary",
  planned: "accent",
  done: "success",
  cancelled: "secondary",
};
const RATE_ROLES = ["owner", "admin", "project_manager", "estimator", "accountant"];
const WRITE_ROLES = ["owner", "admin", "project_manager", "accountant"];

export function EquipmentPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<"status" | "fleet" | "maintenance">("status");
  const { role } = useCurrentCompany();
  const tabs = (["status", "fleet", "maintenance"] as const).filter((v) => v !== "fleet" || RATE_ROLES.includes(role));
  return (
    <div className="grid gap-3">
      <PageHeader title={t("equipment.title")} description={t("equipment.subtitle")} />
      <TabBar tabs={tabs.map((v) => ({ value: v, label: t(`equipment.tabs.${v}`) }))} value={tab} onChange={setTab} />
      {tab === "status" ? <Status /> : tab === "fleet" ? <Fleet /> : <Maintenance />}
    </div>
  );
}

function Status() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const config: CrudConfig<"equipment", "equipment_status_view"> = {
    table: "equipment",
    view: "equipment_status_view",
    scope: "company",
    title: t("equipment.tabs.status"),
    singular: t("equipment.singular"),
    emptyTitle: t("equipment.empty"),
    emptyHint: t("equipment.emptyHint"),
    canWrite: false,
    softDelete: false,
    searchColumns: ["code", "name"],
    sortable: ["code", "name", "total_hours", "due_date"],
    defaultSort: { id: "code", desc: false },
    filters: [
      {
        name: "due",
        column: "maintenance_due",
        label: t("equipment.allMachines"),
        options: [{ value: "true", label: t("equipment.dueOnly") }],
      },
      {
        name: "status",
        label: t("issues.allStatuses"),
        options: ["active", "maintenance", "retired"].map((v) => ({ value: v, label: t(`equipment.statuses.${v}`) })),
      },
    ],
    columns: [
      {
        id: "code",
        header: t("estimating.code"),
        sortable: true,
        cell: (r) => <span className="font-medium num">{r.code}</span>,
        exportValue: (r) => r.code,
      },
      { id: "name", header: t("common.name"), sortable: true, cell: (r) => r.name, exportValue: (r) => r.name },
      {
        id: "status",
        header: t("common.status"),
        cell: (r) => <Badge variant={EQ_BADGE[r.status]}>{t(`equipment.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`equipment.statuses.${r.status}`),
      },
      {
        id: "total_hours",
        header: t("equipment.hours"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatNumber(r.total_hours, lang, 1)} h</span>,
        exportValue: (r) => r.total_hours,
      },
      {
        id: "due_date",
        header: t("equipment.nextMaintenance"),
        sortable: true,
        cell: (r) =>
          r.next_maintenance ? (
            <span className={r.maintenance_due ? "inline-flex items-center gap-1 font-semibold text-destructive" : "text-sm"}>
              {r.maintenance_due ? <Wrench className="size-4" aria-label={t("equipment.due")} /> : null}
              {r.next_maintenance} · {r.due_date ? formatDate(r.due_date) : `${formatNumber(r.due_hours, lang, 0)} h`}
            </span>
          ) : (
            "—"
          ),
        exportValue: (r) => r.next_maintenance,
      },
    ],
    fields: [],
  };
  return <CrudPage config={config} embedded />;
}

function Fleet() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const ownership = ["owned", "rented"].map((v) => ({ value: v, label: t(`equipment.ownership.${v}`) }));
  const statuses = ["active", "maintenance", "retired"].map((v) => ({ value: v, label: t(`equipment.statuses.${v}`) }));
  const config: CrudConfig<"equipment"> = {
    table: "equipment",
    scope: "company",
    title: t("equipment.tabs.fleet"),
    singular: t("equipment.singular"),
    emptyTitle: t("equipment.empty"),
    emptyHint: t("equipment.emptyHint"),
    canWrite: WRITE_ROLES.includes(role),
    searchColumns: ["code", "name", "category", "registration"],
    sortable: ["code", "name", "hourly_rate", "status"],
    defaultSort: { id: "code", desc: false },
    filters: [
      { name: "ownership", label: t("equipment.allOwnership"), options: ownership },
      { name: "status", label: t("issues.allStatuses"), options: statuses },
    ],
    columns: [
      {
        id: "code",
        header: t("estimating.code"),
        sortable: true,
        cell: (r) => <span className="font-medium num">{r.code}</span>,
        exportValue: (r) => r.code,
      },
      { id: "name", header: t("common.name"), sortable: true, cell: (r) => r.name, exportValue: (r) => r.name },
      {
        id: "ownership",
        header: t("equipment.ownershipLabel"),
        cell: (r) => t(`equipment.ownership.${r.ownership}`),
        exportValue: (r) => t(`equipment.ownership.${r.ownership}`),
      },
      {
        id: "hourly_rate",
        header: t("equipment.hourlyRate"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.hourly_rate, r.currency as CurrencyCode, lang)}</span>,
        exportValue: (r) => r.hourly_rate,
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={EQ_BADGE[r.status]}>{t(`equipment.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`equipment.statuses.${r.status}`),
      },
    ],
    fields: [
      { name: "code", label: t("estimating.code"), type: "text", required: true },
      { name: "name", label: t("common.name"), type: "text", required: true },
      { name: "category", label: t("equipment.category"), type: "text" },
      { name: "registration", label: t("equipment.registration"), type: "text" },
      {
        name: "ownership",
        label: t("equipment.ownershipLabel"),
        type: "select",
        options: ownership,
        required: true,
        defaultValue: "owned",
      },
      {
        name: "supplier_id",
        label: t("equipment.renter"),
        type: "relation",
        relation: { table: "suppliers", label: (r) => String(r.name), order: "name", allowEmpty: true },
        visible: (v) => v.ownership === "rented",
      },
      { name: "hourly_rate", label: t("equipment.hourlyRate"), type: "money", required: true, min: 0 },
      {
        name: "currency",
        label: t("common.currency"),
        type: "select",
        options: CURRENCIES.map((c) => ({ value: c, label: c })),
        required: true,
        defaultValue: company.default_currency,
      },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "active" },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} currency={company.default_currency} embedded />;
}

function Maintenance() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const statuses = ["planned", "done", "cancelled"].map((v) => ({ value: v, label: t(`equipment.mStatuses.${v}`) }));
  const config: CrudConfig<"maintenance_records"> = {
    table: "maintenance_records",
    scope: "company",
    title: t("equipment.tabs.maintenance"),
    singular: t("equipment.maintenance"),
    emptyTitle: t("equipment.noMaintenance"),
    canWrite: WRITE_ROLES.includes(role),
    searchColumns: ["title", "notes"],
    sortable: ["due_date", "title", "status", "done_date"],
    defaultSort: { id: "due_date", desc: false },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    columns: [
      {
        id: "title",
        header: t("equipment.maintenance"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.title}</span>,
        exportValue: (r) => r.title,
      },
      {
        id: "due_date",
        header: t("issues.dueDate"),
        sortable: true,
        cell: (r) => (
          <span className="num">{r.due_date ? formatDate(r.due_date) : r.due_hours ? `${formatNumber(r.due_hours, lang, 0)} h` : "—"}</span>
        ),
        exportValue: (r) => formatDate(r.due_date),
      },
      {
        id: "done_date",
        header: t("equipment.doneDate"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.done_date)}</span>,
        exportValue: (r) => formatDate(r.done_date),
      },
      ...(RATE_ROLES.includes(role)
        ? [
            {
              id: "cost",
              header: t("equipment.cost"),
              align: "end" as const,
              cell: (r: { cost: number }) => <span className="num">{formatMoney(r.cost, company.default_currency, lang)}</span>,
              exportValue: (r: { cost: number }) => r.cost,
            },
          ]
        : []),
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={EQ_BADGE[r.status]}>{t(`equipment.mStatuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`equipment.mStatuses.${r.status}`),
      },
    ],
    fields: [
      {
        name: "equipment_id",
        label: t("equipment.singular"),
        type: "relation",
        required: true,
        span: 2,
        relation: { table: "equipment_site", label: (r) => `${String(r.code)} — ${String(r.name)}`, order: "code" },
      },
      { name: "title", label: t("equipment.maintenance"), type: "text", required: true, span: 2 },
      { name: "due_date", label: t("issues.dueDate"), type: "date" },
      { name: "due_hours", label: t("equipment.dueHours"), type: "number", min: 0 },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "planned" },
      { name: "done_date", label: t("equipment.doneDate"), type: "date" },
      { name: "cost", label: t("equipment.cost"), type: "money", min: 0, defaultValue: 0, visible: () => RATE_ROLES.includes(role) },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} currency={company.default_currency} embedded />;
}
