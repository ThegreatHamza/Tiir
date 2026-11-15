import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { StatCard } from "@/components/common/StatCard";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber, todayIso } from "@/lib/format";
import { makePdfContext, exportTablePdf } from "@/lib/pdf/export";
import { addDays } from "@/lib/calc/schedule";
import { supabase } from "@/lib/supabase";

async function fetchProjectReport(projectId: string, since: string) {
  const [fin, claims, issues, reports, incidents] = await Promise.all([
    supabase.from("project_financials").select("*").eq("project_id", projectId).maybeSingle(),
    supabase
      .from("progress_claim_values")
      .select("number, period_end, status, this_period, net_payable, paid_amount")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("number"),
    supabase
      .from("site_issues")
      .select("title, status, priority, due_date")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .in("status", ["open", "in_progress"])
      .order("due_date", { nullsFirst: false }),
    supabase
      .from("daily_report_list")
      .select("report_date, labour_count")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .gte("report_date", since)
      .order("report_date"),
    supabase
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .gte("occurred_at", since),
  ]);
  for (const r of [fin, claims, issues, reports, incidents]) if (r.error) throw r.error;
  return {
    fin: fin.data,
    claims: claims.data ?? [],
    issues: issues.data ?? [],
    reports: reports.data ?? [],
    incidents: incidents.count ?? 0,
  };
}

/** Project report: key figures, claims, open issues, last 30 days on site; monthly PDF. */
export function ProjectDashboard() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, companyId } = useCurrentCompany();
  const { project, projectId, currency } = useProject();
  const today = todayIso(company.timezone);
  const since = addDays(today, -30);
  const q = useQuery({
    queryKey: ["company", companyId, "project", projectId, "report", today],
    queryFn: () => fetchProjectReport(projectId, since),
  });
  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.error || !q.data) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const { fin, claims, issues, reports, incidents } = q.data;
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang);
  const progress = fin?.budget_cost ? ((fin.earned_value ?? 0) / fin.budget_cost) * 100 : 0;
  const cpi = fin?.actual_cost ? (fin.earned_value ?? 0) / fin.actual_cost : null;
  const avgLabour = reports.length ? reports.reduce((s, r) => s + (r.labour_count ?? 0), 0) / reports.length : 0;
  const claimChart = claims.filter((c) => c.status !== "rejected").map((c) => ({ name: `N° ${c.number}`, value: c.this_period ?? 0 }));

  async function pdf() {
    const ctx = await makePdfContext({
      company,
      lang,
      currency,
      title: (tt) => tt("reports.monthlyTitle"),
      subtitle: `${project.code} ${project.name}`,
      meta: (tt) => [[tt("reports.period"), `${formatDate(since)} – ${formatDate(today)}`]],
    });
    const L = ctx.lang;
    const mm = (n: number | null | undefined) => formatMoney(n ?? 0, currency, L);
    const kv = (k: string, v: string) => ({ cells: [k, v] });
    await exportTablePdf(
      ctx,
      [
        {
          heading: ctx.t("reports.keyFigures"),
          columns: [
            { label: "", width: "60%" },
            { label: "", width: "40%", align: "right" },
          ],
          rows: [
            kv(ctx.t("dashboard.progress"), `${formatNumber(progress, L, 1)} %`),
            kv(ctx.t("dashboard.contract"), mm(fin?.contract_total)),
            kv(ctx.t("costs.budget"), mm(fin?.budget_cost)),
            kv(ctx.t("costs.actual"), mm(fin?.actual_cost)),
            kv(ctx.t("costs.earned"), mm(fin?.earned_value)),
            kv("CPI", cpi === null ? "-" : formatNumber(cpi, L, 2)),
            kv(ctx.t("billing.netToDate"), mm(fin?.claimed_net)),
            kv(ctx.t("billing.received"), mm(fin?.received)),
            kv(ctx.t("reports.reports30"), String(reports.length)),
            kv(ctx.t("reports.avgLabour"), formatNumber(avgLabour, L, 1)),
            kv(ctx.t("reports.incidents30"), String(incidents)),
          ],
        },
        {
          heading: ctx.t("billing.tabs.claims"),
          columns: [
            { label: "N°", width: "10%" },
            { label: ctx.t("billing.periodEnd"), width: "20%" },
            { label: ctx.t("common.status"), width: "20%" },
            { label: ctx.t("billing.thisPeriod"), width: "25%", align: "right" },
            { label: ctx.t("billing.netPayable"), width: "25%", align: "right" },
          ],
          rows: claims.map((c) => ({
            cells: [
              String(c.number),
              formatDate(c.period_end),
              ctx.t(`billing.statuses.${c.status}`),
              mm(c.this_period),
              mm(c.net_payable),
            ],
          })),
        },
        {
          heading: ctx.t("reports.openIssues"),
          columns: [
            { label: ctx.t("issues.issue"), width: "55%" },
            { label: ctx.t("issues.priority"), width: "20%" },
            { label: ctx.t("issues.dueDate"), width: "25%" },
          ],
          rows: issues.map((i) => ({ cells: [i.title, ctx.t(`site.severities.${i.priority}`), formatDate(i.due_date)] })),
        },
      ],
      { fileName: `${project.code}_${ctx.t("reports.monthlyTitle")}_${today}` },
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("reports.title")}</h2>
        <Button variant="outline" size="sm" onClick={() => void pdf().catch((e) => toast.error(errorMessage(t, e)))}>
          <FileDown className="size-4" aria-hidden />
          {t("reports.monthlyPdf")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("dashboard.progress")} value={`${formatNumber(progress, lang, 1)} %`} />
        <StatCard label={t("dashboard.contract")} value={m(fin?.contract_total)} hint={`${t("costs.budget")} ${m(fin?.budget_cost)}`} />
        <StatCard
          label={t("costs.actual")}
          value={m(fin?.actual_cost)}
          hint={`CPI ${cpi === null ? "—" : formatNumber(cpi, lang, 2)}`}
          tone={cpi !== null && cpi < 1 ? "bad" : undefined}
        />
        <StatCard label={t("billing.received")} value={m(fin?.received)} hint={`${t("billing.netToDate")} ${m(fin?.claimed_net)}`} />
        <StatCard
          label={t("reports.reports30")}
          value={reports.length}
          hint={`${t("reports.avgLabour")} ${formatNumber(avgLabour, lang, 1)}`}
        />
        <StatCard label={t("reports.openIssues")} value={issues.length} tone={issues.length ? "warn" : undefined} />
        <StatCard label={t("reports.incidents30")} value={incidents} tone={incidents ? "bad" : undefined} />
        <StatCard label={t("dashboard.claimsWaiting")} value={claims.filter((c) => c.status === "submitted").length} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("reports.claimsChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          {claimChart.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("billing.noClaims")}</p>
          ) : (
            <div className="h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={claimChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} width={70} tickFormatter={(v: number) => formatNumber(v, lang, 0)} />
                  <Tooltip formatter={(v) => m(Number(v))} />
                  <Bar dataKey="value" name={t("billing.thisPeriod")} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
