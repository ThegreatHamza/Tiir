import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, FileDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/common/States";
import { StatCard } from "@/components/common/StatCard";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { exportToExcel, moneyNumFmt } from "@/lib/export/excel";
import { makePdfContext, exportTablePdf } from "@/lib/pdf/export";
import { CURRENCY_DECIMALS, roundMoney, sumMoney, type CurrencyCode } from "@/lib/calc/money";
import { supabase, type Views } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";
import { PAYROLL_BADGE } from "./PayrollPage";

type Line = Views<"payroll_line_values">;

export function PayrollPeriodPage() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const qc = useQueryClient();
  const { periodId = "" } = useParams();
  const { company, companyId } = useCurrentCompany();
  const key = ["company", companyId, "payroll", periodId];
  const periodQ = useQuery({
    queryKey: [...key, "period"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_periods").select("*").eq("id", periodId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const linesQ = useQuery({
    queryKey: [...key, "lines"],
    queryFn: () =>
      fetchAllPages<Line>((f, to) =>
        supabase.from("payroll_line_values").select("*").eq("payroll_period_id", periodId).order("full_name").range(f, to),
      ),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success(t("common.saved"));
      refresh();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (periodQ.isLoading || linesQ.isLoading) return <Skeleton className="h-96" />;
  if (periodQ.error || linesQ.error) return <ErrorState message={errorMessage(t, periodQ.error ?? linesQ.error)} onRetry={refresh} />;
  const period = periodQ.data;
  if (!period) return <EmptyState title={t("payroll.notFound")} />;
  const lines = linesQ.data ?? [];
  const currency = period.currency as CurrencyCode;
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang);
  const draft = period.status === "draft";
  const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);
  const totals = {
    gross: sumMoney(
      lines.map((l) => l.gross_pay ?? 0),
      currency,
    ),
    net: sumMoney(
      lines.map((l) => l.net_pay ?? 0),
      currency,
    ),
    adv: sumMoney(
      lines.map((l) => l.advances ?? 0),
      currency,
    ),
  };

  const generate = () =>
    run.mutate(async () => {
      const { data, error } = await supabase.rpc("generate_payroll", { p_period_id: periodId });
      if (error) throw error;
      toast.info(t("payroll.generated", { count: data ?? 0 }));
    });
  const setStatus = (status: "draft" | "approved" | "paid") =>
    run.mutate(async () => {
      const { error } = await supabase.from("payroll_periods").update({ status }).eq("id", periodId);
      if (error) throw error;
    });
  const saveLine = (id: string, patch: { bonus?: number; deduction?: number }) =>
    run.mutate(async () => {
      const { error } = await supabase.from("payroll_lines").update(patch).eq("id", id);
      if (error) throw error;
    });

  async function payslips() {
    const ctx = await makePdfContext({
      company,
      lang,
      currency,
      title: (tt) => tt("payroll.payslips"),
      subtitle: `${period!.name} · ${formatDate(period!.start_date)} – ${formatDate(period!.end_date)}`,
    });
    const L = ctx.lang;
    const mm = (n: number | null | undefined) => formatMoney(n ?? 0, currency, L);
    await exportTablePdf(
      ctx,
      lines.map((l) => ({
        heading: `${l.full_name} — ${ctx.t(`site.trades.${l.trade}`, { defaultValue: l.trade })}`,
        columns: [
          { label: "", width: "60%" },
          { label: ctx.t("common.amount"), width: "40%", align: "right" as const },
        ],
        rows: [
          { cells: [`${ctx.t("labour.days")}: ${formatNumber(l.days_worked, L, 1)} × ${mm(l.daily_rate)}`, mm(l.base_pay)] },
          { cells: [`${ctx.t("labour.overtime")}: ${formatNumber(l.overtime_hours, L, 1)} h`, mm(l.overtime_pay)] },
          { cells: [ctx.t("payroll.bonus"), mm(l.bonus)] },
          { cells: [ctx.t("payroll.gross"), mm(l.gross_pay)], style: "total" as const },
          { cells: [ctx.t("payroll.advances"), mm(-(l.advances ?? 0))] },
          { cells: [ctx.t("payroll.deduction"), mm(-(l.deduction ?? 0))] },
          { cells: [ctx.t("payroll.net"), mm(l.net_pay)], style: "total" as const },
        ],
      })),
      { fileName: `${t("payroll.payslips")}_${period!.name}`, signatures: [ctx.t("payroll.signEmployer"), ctx.t("payroll.signWorker")] },
    );
  }

  return (
    <div className="grid gap-3">
      <Link to="/payroll" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("payroll.title")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {period.name}
            <Badge variant={PAYROLL_BADGE[period.status]}>{t(`payroll.statuses.${period.status}`)}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground num">
            {formatDate(period.start_date)} – {formatDate(period.end_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft ? (
            <Button variant="outline" size="sm" onClick={generate} disabled={run.isPending}>
              <RefreshCw className="size-4" aria-hidden />
              {t("payroll.generate")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={!lines.length}
            onClick={() =>
              void exportToExcel(
                `${t("payroll.title")}_${period.name}`,
                period.name,
                [
                  { header: t("labour.worker"), value: (l: Line) => l.full_name },
                  { header: t("labour.trade"), value: (l) => t(`site.trades.${l.trade}`, { defaultValue: l.trade }) },
                  { header: t("labour.days"), value: (l) => l.days_worked },
                  { header: t("workers.dailyRate"), value: (l) => l.daily_rate, numFmt: fmt },
                  { header: t("labour.overtime"), value: (l) => l.overtime_hours },
                  { header: t("payroll.basePay"), value: (l) => l.base_pay, numFmt: fmt },
                  { header: t("payroll.overtimePay"), value: (l) => l.overtime_pay, numFmt: fmt },
                  { header: t("payroll.bonus"), value: (l) => l.bonus, numFmt: fmt },
                  { header: t("payroll.gross"), value: (l) => l.gross_pay, numFmt: fmt },
                  { header: t("payroll.advances"), value: (l) => l.advances, numFmt: fmt },
                  { header: t("payroll.deduction"), value: (l) => l.deduction, numFmt: fmt },
                  { header: t("payroll.net"), value: (l) => l.net_pay, numFmt: fmt },
                ],
                lines,
              )
            }
          >
            <Download className="size-4" aria-hidden />
            {t("common.exportExcel")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!lines.length}
            onClick={() => void payslips().catch((e) => toast.error(errorMessage(t, e)))}
          >
            <FileDown className="size-4" aria-hidden />
            {t("payroll.payslips")}
          </Button>
          {draft ? (
            <Button size="sm" onClick={() => setStatus("approved")} disabled={!lines.length}>
              {t("billing.approve")}
            </Button>
          ) : null}
          {period.status === "approved" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setStatus("draft")}>
                {t("billing.backToDraft")}
              </Button>
              <Button size="sm" onClick={() => setStatus("paid")}>
                {t("billing.markPaid")}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("payroll.workers")} value={lines.length} />
        <StatCard label={t("payroll.gross")} value={m(totals.gross)} />
        <StatCard label={t("payroll.advances")} value={m(totals.adv)} />
        <StatCard label={t("payroll.net")} value={m(totals.net)} tone="good" />
      </div>
      {lines.length === 0 ? (
        <EmptyState title={t("payroll.noLines")} description={t("payroll.noLinesHint")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("labour.worker")}</th>
                  <th className="px-3 py-2 text-end">{t("labour.days")}</th>
                  <th className="px-3 py-2 text-end">{t("labour.overtime")}</th>
                  <th className="px-3 py-2 text-end">{t("payroll.basePay")}</th>
                  <th className="w-28 px-3 py-2 text-end">{t("payroll.bonus")}</th>
                  <th className="px-3 py-2 text-end">{t("payroll.advances")}</th>
                  <th className="w-28 px-3 py-2 text-end">{t("payroll.deduction")}</th>
                  <th className="px-3 py-2 text-end">{t("payroll.net")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-1.5">
                      <div className="grid">
                        <span className="font-medium">{l.full_name}</span>
                        <span className="text-xs text-muted-foreground num">
                          {m(l.daily_rate)} / {t("units.day")}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-end num">{formatNumber(l.days_worked, lang, 1)}</td>
                    <td className="px-3 py-1.5 text-end num">{formatNumber(l.overtime_hours, lang, 1)}</td>
                    <td className="px-3 py-1.5 text-end num">{m(roundMoney((l.base_pay ?? 0) + (l.overtime_pay ?? 0), currency))}</td>
                    <td className="px-3 py-1">
                      <AmountCell
                        value={l.bonus}
                        disabled={!draft}
                        label={`${t("payroll.bonus")} ${l.full_name}`}
                        onSave={(v) => saveLine(l.id, { bonus: v })}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-end num">{m(l.advances)}</td>
                    <td className="px-3 py-1">
                      <AmountCell
                        value={l.deduction}
                        disabled={!draft}
                        label={`${t("payroll.deduction")} ${l.full_name}`}
                        onSave={(v) => saveLine(l.id, { deduction: v })}
                      />
                    </td>
                    <td className={`px-3 py-1.5 text-end font-semibold num ${(l.net_pay ?? 0) < 0 ? "text-destructive" : ""}`}>
                      {m(l.net_pay)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AmountCell({ value, disabled, label, onSave }: { value: number; disabled: boolean; label: string; onSave: (v: number) => void }) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  if (disabled) return <span className="block text-end num">{text}</span>;
  return (
    <Input
      inputMode="decimal"
      className="h-8 text-end num"
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text.replace(",", "."));
        if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n);
        else setText(String(value));
      }}
    />
  );
}
