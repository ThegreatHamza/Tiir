import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TabBar } from "@/components/common/Tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { currentLanguage } from "@/i18n";
import { formatDate, formatMoney, todayIso } from "@/lib/format";
import { CURRENCIES } from "@/lib/calc/money";

export const PAYROLL_BADGE: Record<string, BadgeProps["variant"]> = { draft: "secondary", approved: "accent", paid: "success" };

export function PayrollPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<"periods" | "advances">("periods");
  return (
    <div className="grid gap-3">
      <PageHeader title={t("payroll.title")} description={t("payroll.subtitle")} />
      <TabBar
        tabs={[
          { value: "periods", label: t("payroll.tabs.periods") },
          { value: "advances", label: t("payroll.tabs.advances") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "periods" ? <Periods /> : <Advances />}
    </div>
  );
}

function Periods() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { company } = useCurrentCompany();
  const statuses = ["draft", "approved", "paid"].map((v) => ({ value: v, label: t(`payroll.statuses.${v}`) }));
  const today = todayIso(company.timezone);
  const config: CrudConfig<"payroll_periods"> = {
    table: "payroll_periods",
    scope: "company",
    title: t("payroll.tabs.periods"),
    singular: t("payroll.period"),
    emptyTitle: t("payroll.noPeriods"),
    emptyHint: t("payroll.noPeriodsHint"),
    canWrite: true,
    searchColumns: ["name"],
    sortable: ["start_date", "name", "status"],
    defaultSort: { id: "start_date", desc: true },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    onRowClick: (r) => navigate(`/payroll/${r.id}`),
    columns: [
      {
        id: "name",
        header: t("common.name"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.name}</span>,
        exportValue: (r) => r.name,
      },
      {
        id: "start_date",
        header: t("payroll.dates"),
        sortable: true,
        cell: (r) => (
          <span className="num">
            {formatDate(r.start_date)} – {formatDate(r.end_date)}
          </span>
        ),
        exportValue: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`,
      },
      { id: "currency", header: t("common.currency"), cell: (r) => r.currency, exportValue: (r) => r.currency },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={PAYROLL_BADGE[r.status]}>{t(`payroll.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`payroll.statuses.${r.status}`),
      },
    ],
    fields: [
      { name: "name", label: t("common.name"), type: "text", required: true, span: 2, defaultValue: today.slice(0, 7) },
      { name: "start_date", label: t("common.startDate"), type: "date", required: true, defaultValue: `${today.slice(0, 7)}-01` },
      { name: "end_date", label: t("common.endDate"), type: "date", required: true },
      {
        name: "currency",
        label: t("common.currency"),
        type: "select",
        options: CURRENCIES.map((c) => ({ value: c, label: c })),
        required: true,
        defaultValue: company.default_currency,
      },
    ],
  };
  return <CrudPage config={config} embedded />;
}

function Advances() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company } = useCurrentCompany();
  const config: CrudConfig<"advances"> = {
    table: "advances",
    scope: "company",
    title: t("payroll.tabs.advances"),
    singular: t("payroll.advance"),
    emptyTitle: t("payroll.noAdvances"),
    canWrite: true,
    searchColumns: ["note"],
    sortable: ["advance_date", "amount"],
    defaultSort: { id: "advance_date", desc: true },
    columns: [
      {
        id: "advance_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.advance_date)}</span>,
        exportValue: (r) => formatDate(r.advance_date),
      },
      { id: "note", header: t("common.notes"), cell: (r) => r.note ?? "—", exportValue: (r) => r.note },
      {
        id: "amount",
        header: t("common.amount"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.amount, company.default_currency, lang)}</span>,
        exportValue: (r) => r.amount,
      },
    ],
    fields: [
      {
        name: "worker_id",
        label: t("labour.worker"),
        type: "relation",
        required: true,
        span: 2,
        relation: { table: "workers", label: (r) => String(r.full_name), order: "full_name", filter: { active: true } },
      },
      { name: "advance_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "amount", label: t("common.amount"), type: "money", required: true, min: 0 },
      { name: "note", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} currency={company.default_currency} embedded />;
}
