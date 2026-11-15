/**
 * Cost control and earned value — pure, unit tested.
 * BAC = budget at completion (dry cost of the current BoQ), EV = budget × % complete,
 * AC = actual cost, PV = budget × planned % on the date.
 */
import { roundMoney, sumMoney, type CurrencyCode } from "./money";

export type EvInput = { budget: number; percentComplete: number; actualCost: number; plannedPercent?: number };

export function earnedValue(rows: readonly EvInput[], currency: CurrencyCode) {
  const bac = sumMoney(
    rows.map((r) => r.budget),
    currency,
  );
  const ev = sumMoney(
    rows.map((r) => (r.budget * Math.min(100, Math.max(0, r.percentComplete))) / 100),
    currency,
  );
  const ac = sumMoney(
    rows.map((r) => r.actualCost),
    currency,
  );
  const pv = sumMoney(
    rows.map((r) => (r.budget * Math.min(100, Math.max(0, r.plannedPercent ?? 0))) / 100),
    currency,
  );
  const cpi = ac > 0 ? round2(ev / ac) : null;
  const spi = pv > 0 ? round2(ev / pv) : null;
  const eac = cpi && cpi > 0 ? roundMoney(bac / cpi, currency) : roundMoney(ac + (bac - ev), currency);
  return {
    bac,
    ev,
    ac,
    pv,
    cv: roundMoney(ev - ac, currency),
    sv: roundMoney(ev - pv, currency),
    cpi,
    spi,
    eac,
    vac: roundMoney(bac - eac, currency),
    percentComplete: bac > 0 ? round2((ev / bac) * 100) : 0,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Item-level forecast at completion: actual ÷ progress (CPI method), budget when not started. */
export function itemForecast(budget: number, actual: number, percentComplete: number, currency: CurrencyCode): number {
  if (percentComplete <= 0) return Math.max(budget, actual);
  if (percentComplete >= 100) return actual;
  return roundMoney(Math.max(actual, (actual / percentComplete) * 100), currency);
}

export type MonthAmount = { month: string; amount: number };

/** Groups dated amounts by month "YYYY-MM". */
export function byMonth(entries: readonly { date: string; amount: number }[], currency: CurrencyCode): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    const k = e.date.slice(0, 7);
    m.set(k, roundMoney((m.get(k) ?? 0) + e.amount, currency));
  }
  return m;
}

/** Cash flow by month: money in (claims), money out (costs), net and cumulative. */
export function cashFlow(
  inflows: readonly { date: string; amount: number }[],
  outflows: readonly { date: string; amount: number }[],
  currency: CurrencyCode,
) {
  const inn = byMonth(inflows, currency);
  const out = byMonth(outflows, currency);
  const months = [...new Set([...inn.keys(), ...out.keys()])].sort();
  let cumulative = 0;
  return months.map((month) => {
    const i = inn.get(month) ?? 0;
    const o = out.get(month) ?? 0;
    cumulative = roundMoney(cumulative + i - o, currency);
    return { month, in: i, out: o, net: roundMoney(i - o, currency), cumulative };
  });
}
