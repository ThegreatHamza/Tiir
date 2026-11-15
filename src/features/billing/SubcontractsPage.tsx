import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { formatDate, formatMoney, formatPercent, todayIso } from "@/lib/format";
import { moneyNumFmt } from "@/lib/export/excel";
import { CURRENCY_DECIMALS, roundMoney } from "@/lib/calc/money";

const SC_BADGE: Record<string, BadgeProps["variant"]> = {
  active: "accent",
  completed: "success",
  cancelled: "secondary",
  submitted: "accent",
  approved: "success",
  rejected: "destructive",
  paid: "default",
};

export function SubcontractsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<"contracts" | "claims">("contracts");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("subcontracts.title")}</h2>
      <TabBar
        tabs={[
          { value: "contracts", label: t("subcontracts.tabs.contracts") },
          { value: "claims", label: t("subcontracts.tabs.claims") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "contracts" ? <Contracts /> : <Claims />}
    </div>
  );
}

function Contracts() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang);
  const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);
  const statuses = ["active", "completed", "cancelled"].map((v) => ({ value: v, label: t(`subcontracts.statuses.${v}`) }));
  const config: CrudConfig<"subcontracts", "subcontract_values"> = {
    table: "subcontracts",
    view: "subcontract_values",
    scope: "project",
    title: t("subcontracts.tabs.contracts"),
    singular: t("subcontracts.singular"),
    emptyTitle: t("subcontracts.empty"),
    emptyHint: t("subcontracts.emptyHint"),
    canWrite: ["owner", "admin", "project_manager"].includes(role),
    searchColumns: ["title", "scope", "supplier_name"],
    sortable: ["title", "amount", "status", "start_date"],
    defaultSort: { id: "title", desc: false },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    columns: [
      {
        id: "title",
        header: t("subcontracts.contract"),
        sortable: true,
        cell: (r) => (
          <div className="grid">
            <span className="font-medium">{r.title}</span>
            <span className="text-xs text-muted-foreground">{r.supplier_name ?? "—"}</span>
          </div>
        ),
        exportValue: (r) => (r.supplier_name ? `${r.title} — ${r.supplier_name}` : r.title),
      },
      {
        id: "amount",
        header: t("subcontracts.amount"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{m(r.amount)}</span>,
        exportValue: (r) => r.amount,
        numFmt: fmt,
      },
      {
        id: "claimed",
        header: t("subcontracts.claimed"),
        align: "end",
        cell: (r) => (
          <span className="num">
            {m(r.claimed_amount)} · {formatPercent(r.amount ? ((r.claimed_amount ?? 0) / r.amount) * 100 : 0, lang)}
          </span>
        ),
        exportValue: (r) => r.claimed_amount,
        numFmt: fmt,
      },
      {
        id: "paid",
        header: t("billing.paid"),
        align: "end",
        cell: (r) => <span className="num">{m(r.paid_amount)}</span>,
        exportValue: (r) => r.paid_amount,
        numFmt: fmt,
      },
      {
        id: "remaining",
        header: t("subcontracts.remaining"),
        align: "end",
        cell: (r) => <span className="num">{m(roundMoney(r.amount - (r.claimed_amount ?? 0), currency))}</span>,
        exportValue: (r) => roundMoney(r.amount - (r.claimed_amount ?? 0), currency),
        numFmt: fmt,
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={SC_BADGE[r.status]}>{t(`subcontracts.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`subcontracts.statuses.${r.status}`),
      },
    ],
    fields: [
      { name: "title", label: t("subcontracts.contract"), type: "text", required: true, span: 2 },
      {
        name: "supplier_id",
        label: t("subcontracts.subcontractor"),
        type: "relation",
        relation: { table: "suppliers", label: (r) => String(r.name), order: "name", allowEmpty: true },
      },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "active" },
      { name: "amount", label: t("subcontracts.amount"), type: "money", required: true, min: 0 },
      { name: "retention_rate", label: t("billing.retention"), type: "percent", min: 0, max: 100, defaultValue: 0 },
      { name: "start_date", label: t("common.startDate"), type: "date" },
      { name: "end_date", label: t("common.endDate"), type: "date" },
      {
        name: "boq_item_id",
        label: t("costs.boqItem"),
        type: "relation",
        span: 2,
        relation: {
          table: "current_boq_items_site",
          scope: "project",
          label: (r) => `${String(r.code)} — ${String(r.description)}`,
          order: "position",
          allowEmpty: true,
        },
      },
      { name: "scope", label: t("subcontracts.scope"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

function Claims() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const statuses = ["submitted", "approved", "rejected", "paid"].map((v) => ({ value: v, label: t(`billing.statuses.${v}`) }));
  const config: CrudConfig<"subcontractor_claims"> = {
    table: "subcontractor_claims",
    scope: "project",
    title: t("subcontracts.tabs.claims"),
    singular: t("subcontracts.claim"),
    emptyTitle: t("subcontracts.noClaims"),
    canWrite: ["owner", "admin", "project_manager", "accountant"].includes(role),
    searchColumns: ["notes"],
    sortable: ["claim_date", "amount", "number", "status"],
    defaultSort: { id: "claim_date", desc: true },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    columns: [
      { id: "number", header: "N°", sortable: true, cell: (r) => <span className="num">{r.number}</span>, exportValue: (r) => r.number },
      {
        id: "claim_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.claim_date)}</span>,
        exportValue: (r) => formatDate(r.claim_date),
      },
      {
        id: "amount",
        header: t("common.amount"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.amount, currency, lang)}</span>,
        exportValue: (r) => r.amount,
        numFmt: moneyNumFmt(CURRENCY_DECIMALS[currency]),
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={SC_BADGE[r.status]}>{t(`billing.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`billing.statuses.${r.status}`),
      },
    ],
    fields: [
      {
        name: "subcontract_id",
        label: t("subcontracts.singular"),
        type: "relation",
        required: true,
        span: 2,
        relation: { table: "subcontracts", scope: "project", label: (r) => String(r.title), order: "title" },
      },
      { name: "claim_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "amount", label: t("common.amount"), type: "money", required: true, min: 0 },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "submitted" },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}
