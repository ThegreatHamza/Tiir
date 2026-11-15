/** Company totals per currency (projects in different currencies are never added together). Pure, unit tested. */
import { roundMoney, type CurrencyCode } from "@/lib/calc/money";

export type ProjectFigures = {
  currency: string;
  status: string;
  contract_total: number | null;
  actual_cost: number | null;
  earned_value: number | null;
  claimed_net: number | null;
  received: number | null;
};

export function portfolio(projects: readonly ProjectFigures[]) {
  const out = new Map<
    CurrencyCode,
    { currency: CurrencyCode; contract: number; actual: number; earned: number; claimed: number; received: number; outstanding: number }
  >();
  for (const p of projects) {
    if (p.status === "cancelled") continue;
    const c = p.currency as CurrencyCode;
    const s = out.get(c) ?? { currency: c, contract: 0, actual: 0, earned: 0, claimed: 0, received: 0, outstanding: 0 };
    s.contract = roundMoney(s.contract + (p.contract_total ?? 0), c);
    s.actual = roundMoney(s.actual + (p.actual_cost ?? 0), c);
    s.earned = roundMoney(s.earned + (p.earned_value ?? 0), c);
    s.claimed = roundMoney(s.claimed + (p.claimed_net ?? 0), c);
    s.received = roundMoney(s.received + (p.received ?? 0), c);
    s.outstanding = roundMoney(s.claimed - s.received, c);
    out.set(c, s);
  }
  return [...out.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
