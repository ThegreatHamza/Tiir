import { z } from "zod";
import type { TFunction } from "i18next";

/** Text input → number. Accepts "," or "." as the decimal separator. Empty → `empty`. */
const toNumber = (empty: number | null) => (s: string) => {
  const v = s.replace(",", ".").trim();
  return v === "" ? empty : Number(v);
};

/** Percent field (0–100). Empty means 0. */
export const percentField = (t: TFunction) =>
  z
    .string()
    .transform(toNumber(0))
    .pipe(
      z
        .number({ invalid_type_error: t("validation.number") })
        .min(0, t("validation.percentRange"))
        .max(100, t("validation.percentRange")),
    );

/** Strictly positive number (coefficients, multipliers, hours). */
export const positiveField = (t: TFunction) =>
  z
    .string()
    .transform(toNumber(Number.NaN))
    .pipe(z.number({ invalid_type_error: t("validation.number") }).gt(0, t("validation.positive")));

/** Zero or more (amounts). Empty means 0. */
export const nonNegativeField = (t: TFunction) =>
  z
    .string()
    .transform(toNumber(0))
    .pipe(z.number({ invalid_type_error: t("validation.number") }).min(0, t("validation.nonNegative")));

/** Optional percent: empty → null (e.g. "no retention cap"). */
export const optionalPercentField = (t: TFunction) =>
  z
    .string()
    .transform(toNumber(null))
    .pipe(
      z
        .number({ invalid_type_error: t("validation.number") })
        .min(0, t("validation.percentRange"))
        .max(100, t("validation.percentRange"))
        .nullable(),
    );
