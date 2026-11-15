import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { TRADES } from "@/features/site/api";
import { currentLanguage } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { CURRENCIES, type CurrencyCode } from "@/lib/calc/money";

const RATE_ROLES = ["owner", "admin", "accountant", "project_manager"];

export function WorkersPage() {
  const { role } = useCurrentCompany();
  return RATE_ROLES.includes(role) ? <WorkersWithRates /> : <WorkersSite />;
}

function useCommon() {
  const { t } = useTranslation();
  const trades = TRADES.map((v) => ({ value: v, label: t(`site.trades.${v}`) }));
  return { t, trades };
}

function WorkersWithRates() {
  const { t, trades } = useCommon();
  const lang = currentLanguage();
  const { company } = useCurrentCompany();
  const config: CrudConfig<"workers"> = {
    table: "workers",
    scope: "company",
    title: t("workers.title"),
    subtitle: t("workers.subtitle"),
    singular: t("workers.singular"),
    emptyTitle: t("labour.noWorkers"),
    emptyHint: t("labour.noWorkersHint"),
    canWrite: true,
    searchColumns: ["full_name", "phone", "trade"],
    sortable: ["full_name", "trade", "daily_rate", "active"],
    defaultSort: { id: "full_name", desc: false },
    filters: [
      { name: "trade", label: t("workers.allTrades"), options: trades },
      {
        name: "active",
        label: t("workers.allStates"),
        options: [
          { value: "true", label: t("workers.active") },
          { value: "false", label: t("workers.inactive") },
        ],
      },
    ],
    columns: [
      {
        id: "full_name",
        header: t("common.name"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.full_name}</span>,
        exportValue: (r) => r.full_name,
      },
      {
        id: "trade",
        header: t("labour.trade"),
        sortable: true,
        cell: (r) => t(`site.trades.${r.trade}`, { defaultValue: r.trade }),
        exportValue: (r) => t(`site.trades.${r.trade}`, { defaultValue: r.trade }),
      },
      {
        id: "phone",
        header: t("common.phone"),
        cell: (r) => (
          <span dir="ltr" className="num">
            {r.phone ?? "—"}
          </span>
        ),
        exportValue: (r) => r.phone,
      },
      {
        id: "daily_rate",
        header: t("workers.dailyRate"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.daily_rate, r.currency as CurrencyCode, lang)}</span>,
        exportValue: (r) => r.daily_rate,
      },
      {
        id: "active",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={r.active ? "success" : "secondary"}>{r.active ? t("workers.active") : t("workers.inactive")}</Badge>,
        exportValue: (r) => (r.active ? t("workers.active") : t("workers.inactive")),
      },
    ],
    fields: [
      { name: "full_name", label: t("common.name"), type: "text", required: true, span: 2 },
      { name: "trade", label: t("labour.trade"), type: "select", options: trades, required: true, defaultValue: "labourer" },
      { name: "phone", label: t("common.phone"), type: "text" },
      { name: "daily_rate", label: t("workers.dailyRate"), type: "money", required: true, min: 0 },
      {
        name: "currency",
        label: t("common.currency"),
        type: "select",
        options: CURRENCIES.map((c) => ({ value: c, label: c })),
        required: true,
        defaultValue: company.default_currency,
      },
      { name: "active", label: t("workers.active"), type: "checkbox", defaultValue: true },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} currency={company.default_currency} />;
}

function WorkersSite() {
  const { t, trades } = useCommon();
  const config: CrudConfig<"workers", "workers_site"> = {
    table: "workers",
    view: "workers_site",
    scope: "company",
    title: t("workers.title"),
    singular: t("workers.singular"),
    emptyTitle: t("labour.noWorkers"),
    canWrite: false,
    softDelete: false,
    where: { active: true },
    searchColumns: ["full_name", "phone"],
    sortable: ["full_name", "trade"],
    defaultSort: { id: "full_name", desc: false },
    filters: [{ name: "trade", label: t("workers.allTrades"), options: trades }],
    columns: [
      {
        id: "full_name",
        header: t("common.name"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.full_name}</span>,
        exportValue: (r) => r.full_name,
      },
      {
        id: "trade",
        header: t("labour.trade"),
        sortable: true,
        cell: (r) => t(`site.trades.${r.trade}`, { defaultValue: r.trade }),
        exportValue: (r) => r.trade,
      },
      {
        id: "phone",
        header: t("common.phone"),
        cell: (r) => (
          <span dir="ltr" className="num">
            {r.phone ?? "—"}
          </span>
        ),
        exportValue: (r) => r.phone,
      },
    ],
    fields: [],
  };
  return <CrudPage config={config} />;
}
