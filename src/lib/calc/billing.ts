/**
 * Progress claims (situations de travaux) — pure, unit tested.
 * Mirrors public.progress_claim_amounts() in SQL.
 *   this period = cumulative amount − previous cumulative amount
 *   net payable = this period − retention − advance recovery + tax
 * Retention stops at the cap; advance recovery stops when the advance is repaid.
 */
import { roundMoney, sumMoney, type CurrencyCode } from "./money";

export type ClaimLineInput = { cumulativeQuantity: number; previousQuantity: number; unitPrice: number };
export type ClaimInput = {
  id: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "paid";
  retentionRate: number;
  advanceRecoveryRate: number;
  vatRate: number;
  lines: ClaimLineInput[];
};
export type ClaimAmounts = {
  id: string;
  grossCumulative: number;
  previousCumulative: number;
  thisPeriod: number;
  retention: number;
  advanceRecovery: number;
  vat: number;
  netPayable: number;
  retentionToDate: number;
  advanceRecoveredToDate: number;
};

export function lineAmounts(l: ClaimLineInput, currency: CurrencyCode) {
  const cumulative = roundMoney(l.cumulativeQuantity * l.unitPrice, currency);
  const previous = roundMoney(l.previousQuantity * l.unitPrice, currency);
  return { cumulative, previous, thisPeriod: roundMoney(cumulative - previous, currency) };
}

/** Claims must be given in claim-number order. */
export function claimAmounts(
  claims: readonly ClaimInput[],
  opts: { currency: CurrencyCode; retentionCap: number | null; advanceAmount: number },
): ClaimAmounts[] {
  const { currency } = opts;
  let retained = 0;
  let recovered = 0;
  return claims.map((c) => {
    const lines = c.lines.map((l) => lineAmounts(l, currency));
    const gross = sumMoney(
      lines.map((l) => l.cumulative),
      currency,
    );
    const prev = sumMoney(
      lines.map((l) => l.previous),
      currency,
    );
    const period = roundMoney(gross - prev, currency);
    let retention = roundMoney((period * c.retentionRate) / 100, currency);
    if (opts.retentionCap !== null) retention = Math.max(0, Math.min(retention, roundMoney(opts.retentionCap - retained, currency)));
    const advance = Math.max(
      0,
      Math.min(roundMoney((period * c.advanceRecoveryRate) / 100, currency), roundMoney(opts.advanceAmount - recovered, currency)),
    );
    const vat = roundMoney((period * c.vatRate) / 100, currency);
    if (c.status !== "rejected") {
      retained = roundMoney(retained + retention, currency);
      recovered = roundMoney(recovered + advance, currency);
    }
    return {
      id: c.id,
      grossCumulative: gross,
      previousCumulative: prev,
      thisPeriod: period,
      retention,
      advanceRecovery: advance,
      vat,
      netPayable: roundMoney(period - retention - advance + vat, currency),
      retentionToDate: retained,
      advanceRecoveredToDate: recovered,
    };
  });
}
