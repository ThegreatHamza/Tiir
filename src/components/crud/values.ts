/** Conversions between form strings and database values. Pure, unit tested. */
import { parseAmount } from "@/lib/import/priceResources";
import { roundMoney, roundTo, type CurrencyCode } from "@/lib/calc/money";
import type { FieldDef } from "./types";

export type FormValues = Record<string, string | boolean>;

export function rowToForm(fields: readonly FieldDef[], row: Record<string, unknown> | null): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const v = row ? row[f.name] : f.defaultValue;
    if (f.toForm) out[f.name] = f.toForm(v);
    else if (f.type === "checkbox") out[f.name] = Boolean(v);
    else out[f.name] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

export type FieldError = { field: string; code: "required" | "number" | "min" | "max" };

export function formToPayload(
  fields: readonly FieldDef[],
  values: FormValues,
  currency: CurrencyCode,
): { payload: Record<string, unknown>; errors: FieldError[] } {
  const payload: Record<string, unknown> = {};
  const errors: FieldError[] = [];
  for (const f of fields) {
    if (f.readOnly) continue;
    if (f.visible && !f.visible(values)) continue;
    const raw = values[f.name];
    if (f.type === "checkbox") {
      payload[f.name] = raw === true;
      continue;
    }
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) {
      if (f.required) errors.push({ field: f.name, code: "required" });
      payload[f.name] = f.type === "text" || f.type === "textarea" ? (f.required ? "" : null) : null;
      continue;
    }
    if (f.type === "number" || f.type === "money" || f.type === "percent") {
      const n = parseAmount(s);
      if (n === null) {
        errors.push({ field: f.name, code: "number" });
        continue;
      }
      if (f.min !== undefined && n < f.min) errors.push({ field: f.name, code: "min" });
      if (f.max !== undefined && n > f.max) errors.push({ field: f.name, code: "max" });
      if (f.type === "percent" && (n < 0 || n > 100)) errors.push({ field: f.name, code: "max" });
      payload[f.name] = f.type === "money" ? roundMoney(n, currency) : roundTo(n, 4);
      continue;
    }
    payload[f.name] = s;
  }
  return { payload, errors };
}
