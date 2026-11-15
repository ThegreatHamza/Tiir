import type { TFunction } from "i18next";
import type { Tables } from "@/lib/supabase";
import { formatDate, formatMoney, formatNumber, formatPercent, type AppLanguage } from "@/lib/format";
import { exportToExcel, moneyNumFmt } from "@/lib/export/excel";
import { makePdfContext, exportTablePdf } from "@/lib/pdf/export";
import { CURRENCY_DECIMALS, type CurrencyCode } from "@/lib/calc/money";
import { lineAmounts } from "@/lib/calc/billing";
import type { ClaimLine, ClaimValues } from "./api";

export type ClaimLineLike = Pick<ClaimLine, "code" | "description" | "unit" | "previous_quantity" | "cumulative_quantity" | "unit_price">;
type Ctx = { company: Tables<"companies">; lang: AppLanguage; projectLabel: string; claim: ClaimValues; lines: ClaimLineLike[] };

export async function exportClaimPdf({ company, lang, projectLabel, claim, lines }: Ctx) {
  const currency = claim.currency as CurrencyCode;
  const ctx = await makePdfContext({
    company,
    lang,
    currency,
    title: (t) => t("billing.claimTitle", { number: claim.number }),
    subtitle: projectLabel,
    meta: (t) => [
      [t("billing.period"), `${formatDate(claim.period_start)} – ${formatDate(claim.period_end)}`],
      [t("common.status"), t(`billing.statuses.${claim.status}`)],
    ],
  });
  const { t } = ctx;
  const L = ctx.lang;
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, L);
  const q = (n: number) => formatNumber(n, L, 3);
  const rows = lines.map((l) => {
    const a = lineAmounts(
      { cumulativeQuantity: Number(l.cumulative_quantity), previousQuantity: Number(l.previous_quantity), unitPrice: Number(l.unit_price) },
      currency,
    );
    return {
      cells: [
        l.code,
        l.description,
        t(`units.${l.unit}`),
        q(Number(l.previous_quantity)),
        q(Number(l.cumulative_quantity)),
        m(Number(l.unit_price)),
        m(a.previous),
        m(a.cumulative),
        m(a.thisPeriod),
      ],
    };
  });
  const sum = (label: string, v: number | null, style: "total" | "normal" = "normal") => ({ cells: [label, m(v)], style });
  await exportTablePdf(
    ctx,
    [
      {
        columns: [
          { label: t("estimating.code"), width: "7%" },
          { label: t("common.description"), width: "25%" },
          { label: t("estimating.unit"), width: "6%" },
          { label: t("billing.prevQty"), width: "8%", align: "right" },
          { label: t("billing.cumQty"), width: "8%", align: "right" },
          { label: t("estimating.unitPrice"), width: "10%", align: "right" },
          { label: t("billing.previous"), width: "12%", align: "right" },
          { label: t("billing.cumulative"), width: "12%", align: "right" },
          { label: t("billing.thisPeriod"), width: "12%", align: "right" },
        ],
        rows,
      },
      {
        heading: t("billing.summary"),
        columns: [
          { label: "", width: "70%" },
          { label: t("common.amount"), width: "30%", align: "right" },
        ],
        rows: [
          sum(t("billing.cumulative"), claim.gross_cumulative),
          sum(t("billing.previous"), claim.previous_cumulative),
          sum(t("billing.thisPeriod"), claim.this_period, "total"),
          sum(`${t("billing.retention")} (${formatPercent(claim.retention_rate, L)})`, -(claim.retention ?? 0)),
          sum(`${t("billing.advanceRecovery")} (${formatPercent(claim.advance_recovery_rate, L)})`, -(claim.advance_recovery ?? 0)),
          sum(`${t("billing.vat")} (${formatPercent(claim.vat_rate, L)})`, claim.vat),
          sum(t("billing.netPayable"), claim.net_payable, "total"),
        ],
      },
    ],
    {
      fileName: `${projectLabel}_${t("billing.claimTitle", { number: claim.number })}`,
      landscape: true,
      signatures: [t("billing.signContractor"), t("billing.signClient")],
    },
  );
}

export async function exportClaimExcel(t: TFunction, { projectLabel, claim, lines }: Omit<Ctx, "company" | "lang">) {
  const currency = claim.currency as CurrencyCode;
  const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);
  await exportToExcel(
    `${projectLabel}_${t("billing.claimTitle", { number: claim.number })}`,
    t("billing.claimTitle", { number: claim.number }),
    [
      { header: t("estimating.code"), value: (l: ClaimLineLike) => l.code },
      { header: t("common.description"), value: (l) => l.description },
      { header: t("estimating.unit"), value: (l) => t(`units.${l.unit}`) },
      { header: t("billing.prevQty"), value: (l) => Number(l.previous_quantity) },
      { header: t("billing.cumQty"), value: (l) => Number(l.cumulative_quantity) },
      { header: t("estimating.unitPrice"), value: (l) => Number(l.unit_price), numFmt: fmt },
      {
        header: t("billing.thisPeriod"),
        value: (l) =>
          lineAmounts(
            {
              cumulativeQuantity: Number(l.cumulative_quantity),
              previousQuantity: Number(l.previous_quantity),
              unitPrice: Number(l.unit_price),
            },
            currency,
          ).thisPeriod,
        numFmt: fmt,
      },
    ],
    lines,
  );
}
