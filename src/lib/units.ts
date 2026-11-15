/** Metric units used across estimating, site and stock. Labels come from i18n (units.<code>). */
export const UNITS = ["m", "m2", "m3", "kg", "t", "u", "ml", "ff"] as const;
export type UnitCode = (typeof UNITS)[number];

export function isUnit(value: string): value is UnitCode {
  return (UNITS as readonly string[]).includes(value);
}
