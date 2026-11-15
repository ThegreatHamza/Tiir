/**
 * Money arithmetic for Tiir. Pure functions, unit tested.
 * DJF has no minor unit (whole francs); ETB and USD have two decimals.
 */
export type CurrencyCode = "DJF" | "ETB" | "USD";

export const CURRENCIES: readonly CurrencyCode[] = ["DJF", "ETB", "USD"] as const;

export const CURRENCY_DECIMALS: Record<CurrencyCode, number> = {
  DJF: 0,
  ETB: 2,
  USD: 2,
};

/**
 * Rounds half away from zero to the currency's decimals.
 * Uses exponent notation to avoid binary floating point drift
 * (e.g. 1.005 → 1.01, not 1.00).
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) throw new RangeError("value must be a finite number");
  if (!Number.isInteger(decimals) || decimals < 0) throw new RangeError("decimals must be a non-negative integer");
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const shifted = Math.round(Number(`${abs}e${decimals}`));
  const result = sign * Number(`${shifted}e-${decimals}`);
  return Object.is(result, -0) ? 0 : result;
}

export function roundMoney(amount: number, currency: CurrencyCode): number {
  return roundTo(amount, CURRENCY_DECIMALS[currency]);
}

/** Sums amounts after rounding each one, so totals equal the sum of printed lines. */
export function sumMoney(amounts: readonly number[], currency: CurrencyCode): number {
  const d = CURRENCY_DECIMALS[currency];
  const factor = 10 ** d;
  let cents = 0;
  for (const a of amounts) cents += Math.round(roundMoney(a, currency) * factor);
  return roundTo(cents / factor, d);
}

/** Applies a percentage rate (e.g. 10 for 10 %) and rounds to the currency. */
export function percentOf(amount: number, ratePercent: number, currency: CurrencyCode): number {
  if (!Number.isFinite(ratePercent)) throw new RangeError("rate must be a finite number");
  return roundMoney((amount * ratePercent) / 100, currency);
}

/** Rounds a quantity to 3 decimals (numeric(18,3) in the database). */
export function roundQuantity(q: number): number {
  return roundTo(q, 3);
}
