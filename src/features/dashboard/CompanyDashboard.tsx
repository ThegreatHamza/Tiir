import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ClipboardList, Package, ReceiptText, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState } from "@/components/common/States";
import { StatCard } from "@/components/common/StatCard";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatNumber, todayIso } from "@/lib/format";
import type { CurrencyCode } from "@/lib/calc/money";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";
import type { Views } from "@/lib/supabase";
import { portfolio } from "./portfolio";

async function fetchDashboard(companyId: string, today: string) {
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: c, error } = await q;
    if (error) throw error;
    return c ?? 0;
  };
  const [projects, lowStock, maintenance, overdueIssues, claims] = await Promise.all([
    fetchAllPages<Views<"project_financials">>((f, t) =>
      supabase.from("project_financials").select("*").eq("company_id", companyId).order("code").range(f, t),
    ),
    count(
      supabase.from("stock_balances").select("item_name", { count: "exact", head: true }).eq("company_id", companyId).eq("low_stock", true),
    ),
    count(
      supabase
        .from("equipment_status_view")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("maintenance_due", true),
    ),
    count(
      supabase
        .from("site_issues")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .in("status", ["open", "in_progress"])
        .lt("due_date", today),
    ),
    count(
      supabase
        .from("progress_claims")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .eq("status", "submitted"),
    ),
  ]);
  return { projects, alerts: { lowStock, maintenance, overdueIssues, claims } };
}

export function CompanyDashboard() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, companyId } = useCurrentCompany();
  const today = todayIso(company.timezone);
  const q = useQuery({ queryKey: ["company", companyId, "dashboard", today], queryFn: () => fetchDashboard(companyId, today) });

  if (q.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-8 w-60" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (q.error || !q.data) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const { projects, alerts } = q.data;
  const active = projects.filter((p) => p.status === "active");
  const byCurrency = portfolio(projects);

  const alertCards = [
    { n: alerts.claims, label: t("dashboard.claimsWaiting"), icon: ReceiptText },
    { n: alerts.overdueIssues, label: t("dashboard.overdueIssues"), icon: AlertTriangle },
    { n: alerts.lowStock, label: t("dashboard.lowStock"), icon: Package },
    { n: alerts.maintenance, label: t("dashboard.maintenanceDue"), icon: Wrench },
  ];

  return (
    <div className="grid gap-4">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle", { count: active.length })} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {alertCards.map((a) => (
          <Card key={a.label} className={a.n ? "border-warning/60" : undefined}>
            <CardContent className="flex items-center gap-3 p-4">
              <a.icon className={a.n ? "size-6 text-warning" : "size-6 text-muted-foreground"} aria-hidden />
              <div className="grid">
                <span className="text-xl font-semibold num">{a.n}</span>
                <span className="text-xs text-muted-foreground">{a.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {byCurrency.map((c) => {
        const m = (n: number) => formatMoney(n, c.currency, lang);
        return (
          <div key={c.currency} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label={`${t("dashboard.contracts")} (${c.currency})`} value={m(c.contract)} />
            <StatCard
              label={t("costs.actual")}
              value={m(c.actual)}
              hint={`${t("costs.earned")} ${m(c.earned)}`}
              tone={c.actual > c.earned ? "bad" : undefined}
            />
            <StatCard label={t("billing.netToDate")} value={m(c.claimed)} />
            <StatCard label={t("billing.received")} value={m(c.received)} />
            <StatCard label={t("dashboard.toCollect")} value={m(c.outstanding)} tone={c.outstanding > 0 ? "warn" : undefined} />
          </div>
        );
      })}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" aria-hidden />
            {t("dashboard.projects")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {projects.length === 0 ? (
            <EmptyState title={t("projects.emptyTitle")} />
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("common.name")}</th>
                  <th className="px-3 py-2 text-end">{t("dashboard.progress")}</th>
                  <th className="px-3 py-2 text-end">{t("dashboard.contract")}</th>
                  <th className="px-3 py-2 text-end">{t("costs.budget")}</th>
                  <th className="px-3 py-2 text-end">{t("costs.actual")}</th>
                  <th className="px-3 py-2 text-end">{t("costs.cpi")}</th>
                  <th className="px-3 py-2 text-end">{t("billing.netToDate")}</th>
                  <th className="px-3 py-2 text-end">{t("billing.received")}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const cur = p.currency as CurrencyCode;
                  const m = (n: number | null) => formatMoney(n ?? 0, cur, lang);
                  const pct = p.budget_cost ? ((p.earned_value ?? 0) / p.budget_cost) * 100 : 0;
                  const cpi = p.actual_cost ? (p.earned_value ?? 0) / p.actual_cost : null;
                  return (
                    <tr key={p.project_id} className="border-t">
                      <td className="px-3 py-2">
                        <Link to={`/projects/${p.project_id}/reports`} className="font-medium hover:underline">
                          <span className="num">{p.code}</span> · {p.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{t(`projects.statuses.${p.status}`)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-20 rounded bg-muted" aria-hidden>
                            <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="w-10 text-end num">{formatNumber(pct, lang, 0)} %</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-end num">{m(p.contract_total)}</td>
                      <td className="px-3 py-2 text-end num">{m(p.budget_cost)}</td>
                      <td className="px-3 py-2 text-end num">{m(p.actual_cost)}</td>
                      <td className={`px-3 py-2 text-end num ${cpi !== null && cpi < 1 ? "font-semibold text-destructive" : ""}`}>
                        {cpi === null ? "—" : formatNumber(cpi, lang, 2)}
                      </td>
                      <td className="px-3 py-2 text-end num">{m(p.claimed_net)}</td>
                      <td className="px-3 py-2 text-end num">{m(p.received)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{t("dashboard.note")}</p>
    </div>
  );
}
