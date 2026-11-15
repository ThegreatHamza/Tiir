import { CURRENCY_DECIMALS, roundMoney, type CurrencyCode } from "./calc/money";

export type AppLanguage = "fr" | "en" | "ar" | "so";

export const LANGUAGES: readonly AppLanguage[] = ["fr", "en", "ar", "so"] as const;
export const RTL_LANGUAGES: ReadonlySet<AppLanguage> = new Set<AppLanguage>(["ar"]);
export const DEFAULT_TIME_ZONE = "Africa/Djibouti";

/** BCP-47 locale per language. Arabic keeps Latin digits for figures. */
const LOCALES: Record<AppLanguage, string> = {
  fr: "fr-DJ",
  en: "en-GB",
  ar: "ar-DJ-u-nu-latn",
  so: "so-DJ",
};

export function localeFor(language: AppLanguage): string {
  return LOCALES[language];
}

export function isRtl(language: AppLanguage): boolean {
  return RTL_LANGUAGES.has(language);
}

const numberFormatCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let f = numberFormatCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, options);
    } catch {
      f = new Intl.NumberFormat("fr", options);
    }
    numberFormatCache.set(key, f);
  }
  return f;
}

/** Formats an amount in the project's currency, rounded to its decimals. */
export function formatMoney(amount: number | null | undefined, currency: CurrencyCode, language: AppLanguage): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const d = CURRENCY_DECIMALS[currency];
  return nf(localeFor(language), {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(roundMoney(amount, currency));
}

/** Formats a plain number (no currency) with up to `maxDecimals` decimals. */
export function formatNumber(value: number | null | undefined, language: AppLanguage, maxDecimals = 3, minDecimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return nf(localeFor(language), { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals }).format(value);
}

export function formatPercent(ratePercent: number | null | undefined, language: AppLanguage): string {
  if (ratePercent === null || ratePercent === undefined || !Number.isFinite(ratePercent)) return "—";
  return nf(localeFor(language), { style: "percent", maximumFractionDigits: 3 }).format(ratePercent / 100);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Formats a date as dd/mm/yyyy.
 * - "YYYY-MM-DD" strings (SQL `date`) are shown as-is, with no time zone shift.
 * - Timestamps are shown in the given time zone (default Africa/Djibouti).
 */
export function formatDate(value: string | Date | null | undefined, timeZone: string = DEFAULT_TIME_ZONE): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

/** dd/mm/yyyy hh:mm (24 h) in the given time zone. */
export function formatDateTime(value: string | Date | null | undefined, timeZone: string = DEFAULT_TIME_ZONE): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${formatDate(d, timeZone)} ${get("hour")}:${get("minute")}`;
}

/** Parses dd/mm/yyyy into an ISO "YYYY-MM-DD" string, or null if invalid. */
export function parseDate(input: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(input);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Today's date (YYYY-MM-DD) in a time zone. */
export function todayIso(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
