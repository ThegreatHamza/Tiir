import type { TFunction } from "i18next";
import { exportToExcel } from "@/lib/export/excel";
import { formatDate, formatNumber, type AppLanguage } from "@/lib/format";
import { delayStatus, type Calendar } from "@/lib/calc/schedule";
import { exportTablePdf, makePdfContext } from "@/lib/pdf/export";
import type { Tables } from "@/lib/supabase";
import type { TaskDependency } from "./api";
import type { PlanRow } from "./model";

type Ctx = {
  t: TFunction;
  lang: AppLanguage;
  company: Tables<"companies">;
  projectLabel: string;
  rows: Map<string, PlanRow>;
  order: string[];
  deps: TaskDependency[];
  cal: Calendar;
};

const predsOf = (ctx: Ctx, id: string) =>
  ctx.deps
    .filter((d) => d.successor_id === id)
    .map(
      (d) => `${ctx.rows.get(d.predecessor_id)?.wbs ?? "?"}${d.type}${d.lag_days ? (d.lag_days > 0 ? `+${d.lag_days}` : d.lag_days) : ""}`,
    )
    .join("; ");

export async function exportScheduleExcel(ctx: Ctx) {
  const { t } = ctx;
  const rows = ctx.order.map((id) => ctx.rows.get(id)).filter((r): r is PlanRow => Boolean(r));
  await exportToExcel(
    `${ctx.projectLabel}_${t("planning.title")}`,
    t("planning.title"),
    [
      { header: t("planning.wbs"), value: (r: PlanRow) => r.wbs },
      { header: t("planning.task"), value: (r) => `${"  ".repeat(r.depth)}${r.task.name}`, width: 40 },
      { header: t("common.startDate"), value: (r) => formatDate(r.start) },
      { header: t("common.endDate"), value: (r) => formatDate(r.finish) },
      { header: t("planning.durationDays"), value: (r) => r.duration },
      { header: t("planning.progress"), value: (r) => r.progress },
      { header: t("planning.predecessors"), value: (r) => predsOf(ctx, r.task.id), width: 18 },
      { header: t("planning.float"), value: (r) => r.cpm?.totalFloat ?? null },
      { header: t("planning.critical"), value: (r) => (r.cpm?.critical ? t("common.yes") : "") },
      { header: t("planning.baselineFinish"), value: (r) => (r.baseline ? formatDate(r.baseline.finish) : "") },
    ],
    rows,
  );
}

export async function exportSchedulePdf(ctx: Ctx, currency: Parameters<typeof makePdfContext>[0]["currency"]) {
  const rows = ctx.order.map((id) => ctx.rows.get(id)).filter((r): r is PlanRow => Boolean(r));
  const pdf = await makePdfContext({
    company: ctx.company,
    lang: ctx.lang,
    title: (t) => t("planning.title"),
    subtitle: ctx.projectLabel,
    currency,
  });
  const t = pdf.t;
  // Mini Gantt: one column per month over the project span.
  const minD = rows.length ? rows.map((r) => r.start).reduce((a, b) => (a < b ? a : b)) : "";
  const maxD = rows.length ? rows.map((r) => r.finish).reduce((a, b) => (a > b ? a : b)) : "";
  const months: string[] = [];
  if (minD)
    for (let m = minD.slice(0, 7); m <= maxD.slice(0, 7);) {
      months.push(m);
      const [y, mo] = m.split("-").map(Number) as [number, number];
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
  const shown = months.slice(0, 18);
  const colW = shown.length ? `${(40 / shown.length).toFixed(2)}%` : "0%";
  await exportTablePdf(
    pdf,
    [
      {
        columns: [
          { label: t("planning.wbs"), width: "6%" },
          { label: t("planning.task"), width: "28%" },
          { label: t("common.startDate"), width: "9%" },
          { label: t("common.endDate"), width: "9%" },
          { label: "%", width: "4%", align: "right" },
          { label: t("planning.float"), width: "4%", align: "right" },
          ...shown.map((m) => ({ label: m.slice(5) + "/" + m.slice(2, 4), width: colW })),
        ],
        rows: rows.map((r) => ({
          style: r.isSummary ? ("section" as const) : ("normal" as const),
          cells: [
            r.wbs,
            `${"  ".repeat(r.depth)}${r.task.name}`,
            formatDate(r.start),
            formatDate(r.finish),
            formatNumber(r.progress, pdf.lang, 0),
            r.cpm ? String(r.cpm.totalFloat) : "",
            ...shown.map((m) =>
              r.start.slice(0, 7) <= m && r.finish.slice(0, 7) >= m ? (r.cpm?.critical && !r.isSummary ? "=====" : "—————") : "",
            ),
          ],
        })),
      },
    ],
    { fileName: `${ctx.projectLabel}_${t("planning.title")}`, landscape: true, note: t("planning.pdfLegend") },
  );
}

export function delayRows(ctx: Ctx, today: string) {
  return ctx.order
    .map((id) => ctx.rows.get(id))
    .filter((r): r is PlanRow => Boolean(r) && !r?.isSummary)
    .map((r) => ({ row: r, ...delayStatus({ start: r.start, finish: r.finish, progress: r.progress }, r.baseline, today, ctx.cal) }));
}

export async function exportDelayReport(
  ctx: Ctx,
  today: string,
  format: "xlsx" | "pdf",
  currency: Parameters<typeof makePdfContext>[0]["currency"],
) {
  const data = delayRows(ctx, today);
  if (format === "xlsx") {
    const { t } = ctx;
    await exportToExcel(
      `${ctx.projectLabel}_${t("planning.delayReport")}`,
      t("planning.delayReport"),
      [
        { header: t("planning.wbs"), value: (r: (typeof data)[number]) => r.row.wbs },
        { header: t("planning.task"), value: (r) => r.row.task.name, width: 40 },
        { header: t("planning.baselineFinish"), value: (r) => (r.row.baseline ? formatDate(r.row.baseline.finish) : "") },
        { header: t("planning.currentFinish"), value: (r) => formatDate(r.row.finish) },
        { header: t("planning.variance"), value: (r) => r.finishVariance },
        { header: t("planning.planned"), value: (r) => r.planned },
        { header: t("planning.actual"), value: (r) => r.row.progress },
        { header: t("common.status"), value: (r) => t(`planning.delay.${r.status}`), width: 18 },
      ],
      data,
    );
    return;
  }
  const pdf = await makePdfContext({
    company: ctx.company,
    lang: ctx.lang,
    title: (t) => t("planning.delayReport"),
    subtitle: ctx.projectLabel,
    currency,
  });
  const t = pdf.t;
  await exportTablePdf(
    pdf,
    [
      {
        columns: [
          { label: t("planning.wbs"), width: "7%" },
          { label: t("planning.task"), width: "33%" },
          { label: t("planning.baselineFinish"), width: "11%" },
          { label: t("planning.currentFinish"), width: "11%" },
          { label: t("planning.variance"), width: "9%", align: "right" },
          { label: t("planning.planned"), width: "8%", align: "right" },
          { label: t("planning.actual"), width: "8%", align: "right" },
          { label: t("common.status"), width: "13%" },
        ],
        rows: data.map((r) => ({
          cells: [
            r.row.wbs,
            r.row.task.name,
            r.row.baseline ? formatDate(r.row.baseline.finish) : "—",
            formatDate(r.row.finish),
            String(r.finishVariance),
            formatNumber(r.planned, pdf.lang, 0),
            formatNumber(r.row.progress, pdf.lang, 0),
            t(`planning.delay.${r.status}`),
          ],
        })),
      },
    ],
    { fileName: `${ctx.projectLabel}_${t("planning.delayReport")}`, landscape: true },
  );
}
