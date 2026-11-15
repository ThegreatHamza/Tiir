/**
 * Units used across estimating, site and stock. Must match the `unit_code`
 * enum in the database. Labels come from i18n (units.<code>).
 *   u = unit, ml = linear metre, ff = lump sum (forfait), day = working day.
 */
export const UNITS = ["m", "m2", "m3", "kg", "t", "u", "ml", "ff", "h", "day", "l"] as const;
export type UnitCode = (typeof UNITS)[number];

export function isUnit(value: string): value is UnitCode {
  return (UNITS as readonly string[]).includes(value);
}

const ALIASES: Record<string, UnitCode> = {
  m: "m",
  "m.": "m",
  metre: "m",
  meter: "m",
  m2: "m2",
  "m²": "m2",
  "m^2": "m2",
  m3: "m3",
  "m³": "m3",
  "m^3": "m3",
  kg: "kg",
  kilo: "kg",
  t: "t",
  tonne: "t",
  ton: "t",
  u: "u",
  un: "u",
  unite: "u",
  unit: "u",
  pce: "u",
  piece: "u",
  ens: "u",
  ml: "ml",
  "m.l": "ml",
  "m.l.": "ml",
  lm: "ml",
  ff: "ff",
  forfait: "ff",
  fft: "ff",
  ls: "ff",
  "lump sum": "ff",
  h: "h",
  hr: "h",
  heure: "h",
  hour: "h",
  j: "day",
  jour: "day",
  day: "day",
  d: "day",
  l: "l",
  litre: "l",
  liter: "l",
};

/** Normalises a unit typed in a spreadsheet ("m²", "Forfait", "ML") to a unit code. */
export function parseUnit(input: unknown): UnitCode | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const key = String(input).trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  // NFKD turns ² into 2 and ³ into 3.
  return ALIASES[key] ?? (isUnit(key) ? key : null);
}
