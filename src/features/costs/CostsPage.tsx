import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Bar, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { StatCard } from "@/components/common/StatCard";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber, formatPercent, todayIso } from "@/lib/format";
import { exportToExcel, moneyNumFmt } from "@/lib/export/excel";
import { CURRENCY_DECIMALS, roundMoney, sumMoney } from "@/lib/calc/money";
import { cashFlow, earnedValue, itemForecast } from "@/lib/calc/costs";
import { fetchCostData } from "./api";

const TABS = ["overview", "items", "expenses"] as const;
type Tab = (typeof TABS)[number];
export const EXPENSE_CATEGORIES = [
  "materials",
  "labour",
  "equipment",
  "subcontract",
  "transport",
  "fuel",
  "site_overheads",
  "fees",
  "other",
] as const;

export function CostsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>("overview");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("costs.title")}</h2>
      <TabBar tabs={TABS.map((v) => ({ value: v, label: t(`costs.tabs.${v}`) }))} value={tab} onChange={setTab} />
      {tab === "expenses" ? <ExpensesList /> : <CostAnalysis tab={tab} />}
    </div>
  );
}

function CostAnalysis({ tab }: { tab: Exclude<Tab, "expenses"> }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, companyId } = useCurrentCompany();
  const { project, projectId, currency } = useProject();
  const today = todayIso(company.timezone);
  const q = useQuery({
    queryKey: ["company", companyId, "project", projectId, "costs", today],
    queryFn: () => fetchCostData(companyId, projectId, (project.country ?? company.country) as "DJ" | "ET", today),
  });

  const model = React.useMemo(() => {
    if (!q.data) return null;
    const { items, progress, entries, payments, projectPlanned } = q.data;
    const pct = new Map(progress.map((p) => [p.boq_item_id, Number(p.percent_complete ?? 0)]));
    const actualByItem = new Map<string, number>();
    let unallocated = 0;
    const itemIds = new Set(items.map((i) => i.id));
    for (const e of entries) {
      const a = Number(e.amount ?? 0);
      if (e.boq_item_id && itemIds.has(e.boq_item_id)) actualByItem.set(e.boq_item_id, (actualByItem.get(e.boq_item_id) ?? 0) + a);
      else unallocated += a;
    }
    const rows = items.map((i) => {
      const budget = Number(i.total_dry_cost ?? 0);
      const actual = roundMoney(actualByItem.get(i.id ?? "") ?? 0, currency);
      const percent = pct.get(i.id ?? "") ?? 0;
      const ev = roundMoney((budget * percent) / 100, currency);
      const forecast = itemForecast(budget, actual, percent, currency);
      return {
        id: i.id ?? "",
        code: i.code ?? "",
        description: i.description ?? "",
        budget,
        actual,
        percent,
        ev,
        forecast,
        variance: roundMoney(budget - forecast, currency),
      };
    });
    const ev = earnedValue(
      [
        ...rows.map((r) => ({ budget: r.budget, percentComplete: r.percent, actualCost: r.actual, plannedPercent: projectPlanned ?? 0 })),
        { budget: 0, percentComplete: 0, actualCost: unallocated, plannedPercent: 0 },
      ],
      currency,
    );
    const byCategory = new Map<string, number>();
    for (const e of entries)
      byCategory.set(e.category ?? "other", roundMoney((byCategory.get(e.category ?? "other") ?? 0) + Number(e.amount ?? 0), currency));
    const flow = cashFlow(
      payments.map((p) => ({ date: p.payment_date, amount: Number(p.amount) })),
      entries.filter((e) => e.entry_date).map((e) => ({ date: e.entry_date as string, amount: Number(e.amount ?? 0) })),
      currency,
    );
    return {
      rows,
      ev,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      flow,
      unallocated: roundMoney(unallocated, currency),
      planned: projectPlanned,
    };
  }, [q.data, currency]);

  if (q.isLoading) return <Skeleton className="h-72" />;
  if (q.error || !model) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang);
  const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);

  if (tab === "items") {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("costs.byItem")}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void exportToExcel(
                `${project.code}_${t("costs.byItem")}`,
                t("costs.byItem"),
                [
                  { header: t("estimating.code"), value: (r) => r.code },
                  { header: t("common.description"), value: (r) => r.description },
                  { header: t("costs.budget"), value: (r) => r.budget, numFmt: fmt },
                  { header: t("costs.actual"), value: (r) => r.actual, numFmt: fmt },
                  { header: t("costs.percentDone"), value: (r) => r.percent },
                  { header: t("costs.earned"), value: (r) => r.ev, numFmt: fmt },
                  { header: t("costs.forecast"), value: (r) => r.forecast, numFmt: fmt },
                  { header: t("costs.variance"), value: (r) => r.variance, numFmt: fmt },
                ],
                model.rows,
              )
            }
          >
            <Download className="size-4" aria-hidden />
            {t("common.exportExcel")}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {[
                  "estimating.code",
                  "common.description",
                  "costs.budget",
                  "costs.actual",
                  "costs.percentDone",
                  "costs.forecast",
                  "costs.variance",
                ].map((k, i) => (
                  <th key={k} className={i > 1 ? "px-3 py-2 text-end" : "px-3 py-2 text-start"}>
                    {t(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-1.5 num">{r.code}</td>
                  <td className="px-3 py-1.5">{r.description}</td>
                  <td className="px-3 py-1.5 text-end num">{m(r.budget)}</td>
                  <td className="px-3 py-1.5 text-end num">{m(r.actual)}</td>
                  <td className="px-3 py-1.5 text-end num">{formatNumber(r.percent, lang, 0)} %</td>
                  <td className="px-3 py-1.5 text-end num">{m(r.forecast)}</td>
                  <td className={`px-3 py-1.5 text-end num ${r.variance < 0 ? "text-destructive font-semibold" : ""}`}>{m(r.variance)}</td>
                </tr>
              ))}
              {model.unallocated ? (
                <tr className="border-t text-muted-foreground">
                  <td className="px-3 py-1.5" colSpan={3}>
                    {t("costs.unallocated")}
                  </td>
                  <td className="px-3 py-1.5 text-end num">{m(model.unallocated)}</td>
                  <td colSpan={3} />
                </tr>
              ) : null}
            </tbody>
          </table>
          {model.rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">{t("costs.noBudget")}</p> : null}
        </CardContent>
      </Card>
    );
  }

  const ev = model.ev;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("costs.bac")} value={m(ev.bac)} hint={t("costs.bacHint")} />
        <StatCard label={t("costs.actual")} value={m(ev.ac)} />
        <StatCard
          label={t("costs.earned")}
          value={m(ev.ev)}
          hint={`${formatNumber(ev.percentComplete, lang, 1)} % · ${t("costs.planned")} ${model.planned === null ? "—" : `${formatNumber(model.planned, lang, 0)} %`}`}
        />
        <StatCard label={t("costs.eac")} value={m(ev.eac)} tone={ev.vac < 0 ? "bad" : "good"} hint={`${t("costs.vac")} ${m(ev.vac)}`} />
        <StatCard
          label={t("costs.cpi")}
          value={ev.cpi === null ? "—" : formatNumber(ev.cpi, lang, 2)}
          tone={ev.cpi === null ? undefined : ev.cpi < 1 ? "bad" : "good"}
          hint={t("costs.cpiHint")}
        />
        <StatCard
          label={t("costs.spi")}
          value={ev.spi === null ? "—" : formatNumber(ev.spi, lang, 2)}
          tone={ev.spi === null ? undefined : ev.spi < 1 ? "warn" : "good"}
          hint={t("costs.spiHint")}
        />
        <StatCard label={t("costs.cv")} value={m(ev.cv)} tone={ev.cv < 0 ? "bad" : "good"} />
        <StatCard label={t("costs.sv")} value={m(ev.sv)} tone={ev.sv < 0 ? "warn" : "good"} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("costs.byCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {model.byCategory.length === 0 ? <p className="text-sm text-muted-foreground">{t("costs.noCosts")}</p> : null}
            {model.byCategory.map(([cat, amount]) => (
              <div key={cat} className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span>{t(`costs.categories.${cat}`, { defaultValue: t("costs.categories.other") })}</span>
                  <span className="num">
                    {m(amount)} · {formatPercent(ev.ac ? (amount / ev.ac) * 100 : 0, lang)}
                  </span>
                </div>
                <div className="h-2 rounded bg-muted" aria-hidden>
                  <div className="h-2 rounded bg-primary" style={{ width: `${ev.ac ? Math.min(100, (amount / ev.ac) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t("costs.cashFlow")}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={!model.flow.length}
              onClick={() =>
                void exportToExcel(
                  `${project.code}_${t("costs.cashFlow")}`,
                  t("costs.cashFlow"),
                  [
                    { header: t("costs.month"), value: (r) => r.month },
                    { header: t("costs.in"), value: (r) => r.in, numFmt: fmt },
                    { header: t("costs.out"), value: (r) => r.out, numFmt: fmt },
                    { header: t("costs.net"), value: (r) => r.net, numFmt: fmt },
                    { header: t("costs.cumulative"), value: (r) => r.cumulative, numFmt: fmt },
                  ],
                  model.flow,
                )
              }
            >
              <Download className="size-4" aria-hidden />
              {t("common.exportExcel")}
            </Button>
          </CardHeader>
          <CardContent>
            {model.flow.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("costs.noCosts")}</p>
            ) : (
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={model.flow}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} width={70} tickFormatter={(v: number) => formatNumber(v, lang, 0)} />
                    <Tooltip formatter={(v) => m(Number(v))} />
                    <Legend />
                    <Bar dataKey="in" name={t("costs.in")} fill="hsl(var(--success))" />
                    <Bar dataKey="out" name={t("costs.out")} fill="hsl(var(--destructive))" />
                    <Line dataKey="cumulative" name={t("costs.cumulative")} stroke="hsl(var(--primary))" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("costs.evNote", {
          total: m(
            sumMoney(
              model.rows.map((r) => r.budget),
              currency,
            ),
          ),
        })}
      </p>
    </div>
  );
}

function ExpensesList() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const cats = EXPENSE_CATEGORIES.map((v) => ({ value: v, label: t(`costs.categories.${v}`) }));
  const canWrite = ["owner", "admin", "project_manager", "accountant"].includes(role);
  const config: CrudConfig<"expenses"> = {
    table: "expenses",
    scope: "project",
    title: t("costs.expenses"),
    singular: t("costs.expense"),
    emptyTitle: t("costs.noExpenses"),
    emptyHint: t("costs.noExpensesHint"),
    canWrite,
    searchColumns: ["description", "reference"],
    sortable: ["expense_date", "amount", "category", "description"],
    defaultSort: { id: "expense_date", desc: true },
    filters: [{ name: "category", label: t("costs.allCategories"), options: cats }],
    columns: [
      {
        id: "expense_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.expense_date)}</span>,
        exportValue: (r) => formatDate(r.expense_date),
      },
      {
        id: "description",
        header: t("common.description"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.description}</span>,
        exportValue: (r) => r.description,
      },
      {
        id: "category",
        header: t("costs.category"),
        sortable: true,
        cell: (r) => <Badge variant="secondary">{t(`costs.categories.${r.category}`)}</Badge>,
        exportValue: (r) => t(`costs.categories.${r.category}`),
      },
      { id: "reference", header: t("common.reference"), cell: (r) => r.reference ?? "—", exportValue: (r) => r.reference },
      {
        id: "amount",
        header: t("common.amount"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.amount, currency, lang)}</span>,
        exportValue: (r) => r.amount,
        numFmt: moneyNumFmt(CURRENCY_DECIMALS[currency]),
      },
    ],
    fields: [
      { name: "expense_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "category", label: t("costs.category"), type: "select", options: cats, required: true, defaultValue: "materials" },
      { name: "description", label: t("common.description"), type: "text", required: true, span: 2 },
      { name: "amount", label: t("common.amount"), type: "money", required: true, min: 0 },
      { name: "reference", label: t("common.reference"), type: "text" },
      {
        name: "supplier_id",
        label: t("procurement.supplier"),
        type: "relation",
        relation: { table: "suppliers", label: (r) => String(r.name), order: "name", allowEmpty: true },
      },
      {
        name: "boq_item_id",
        label: t("costs.boqItem"),
        type: "relation",
        relation: {
          table: "current_boq_items_site",
          scope: "project",
          label: (r) => `${String(r.code)} — ${String(r.description)}`,
          order: "position",
          allowEmpty: true,
        },
      },
      { name: "receipt_path", label: t("costs.receipt"), type: "file", module: "expenses", accept: "image/*,application/pdf" },
    ],
    mobileCard: (r) => (
      <div className="flex items-center justify-between gap-2">
        <div className="grid">
          <span className="font-medium">{r.description}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(r.expense_date)} · {t(`costs.categories.${r.category}`)}
          </span>
        </div>
        <span className="num font-semibold">{formatMoney(r.amount, currency, lang)}</span>
      </div>
    ),
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}
