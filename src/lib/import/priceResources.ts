/**
 * Price library import: turns spreadsheet rows (array of arrays, as read by
 * SheetJS) into validated resources. Pure, unit tested. Headers can be in
 * French or English; values like "25 000,50", "m²" or "Main d'œuvre" are understood.
 */
import { CURRENCIES, type CurrencyCode } from "@/lib/calc/money";
import { parseUnit, type UnitCode } from "@/lib/units";

export type ResourceKind = "material" | "labour" | "equipment" | "subcontract";
export const RESOURCE_KINDS: readonly ResourceKind[] = ["material", "labour", "equipment", "subcontract"] as const;

export type ParsedResource = {
  code: string;
  name: string;
  kind: ResourceKind;
  unit: UnitCode;
  unit_cost: number;
  currency: CurrencyCode;
  supplier_name: string | null;
};

export type ImportField = "code" | "name" | "kind" | "unit" | "unit_cost" | "currency" | "supplier_name";
export type ImportError = { row: number; field: ImportField | "row"; reason: "missing" | "invalid" | "duplicate" };
export type ImportResult = {
  rows: ParsedResource[];
  errors: ImportError[];
  headerRow: number;
  mapping: Partial<Record<ImportField, number>>;
};

const fold = (s: unknown) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const HEADERS: Record<ImportField, string[]> = {
  code: ["code", "ref", "reference", "ref article", "article"],
  name: ["designation", "libelle", "nom", "name", "description", "resource", "ressource"],
  kind: ["type", "categorie", "category", "nature", "kind", "famille"],
  unit: ["unite", "unit", "u", "uom"],
  unit_cost: ["prix unitaire", "pu", "prix", "cout unitaire", "cout", "unit cost", "unit price", "rate", "cost", "price", "taux"],
  currency: ["devise", "currency", "monnaie"],
  supplier_name: ["fournisseur", "supplier", "vendor"],
};

const KINDS: Record<string, ResourceKind> = {
  material: "material",
  materials: "material",
  materiau: "material",
  materiaux: "material",
  fourniture: "material",
  fournitures: "material",
  mat: "material",
  labour: "labour",
  labor: "labour",
  "main d oeuvre": "labour",
  mo: "labour",
  equipment: "equipment",
  materiel: "equipment",
  engin: "equipment",
  engins: "equipment",
  plant: "equipment",
  subcontract: "subcontract",
  "sous traitance": "subcontract",
  "sous traitant": "subcontract",
  st: "subcontract",
};

export function parseKind(v: unknown): ResourceKind | null {
  return KINDS[fold(v)] ?? null;
}

/** Parses "25 000,50", "25,000.50", "25000" or a number. Comma alone is a decimal separator. */
export function parseAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/[\s  ']/g, "").replace(/(DJF|ETB|USD|FDJ|\$|Br)/gi, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = s.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapHeader(row: readonly unknown[]): Partial<Record<ImportField, number>> {
  const mapping: Partial<Record<ImportField, number>> = {};
  row.forEach((cell, idx) => {
    const h = fold(cell);
    if (!h) return;
    for (const [field, names] of Object.entries(HEADERS) as [ImportField, string[]][]) {
      if (mapping[field] === undefined && names.includes(h)) {
        mapping[field] = idx;
        return;
      }
    }
  });
  return mapping;
}

export function parsePriceResources(sheet: readonly (readonly unknown[])[], defaultCurrency: CurrencyCode): ImportResult {
  let headerRow = -1;
  let mapping: Partial<Record<ImportField, number>> = {};
  for (let r = 0; r < Math.min(sheet.length, 15); r++) {
    const m = mapHeader(sheet[r] ?? []);
    if (m.code !== undefined && m.name !== undefined && m.unit_cost !== undefined) {
      headerRow = r;
      mapping = m;
      break;
    }
  }
  const errors: ImportError[] = [];
  const rows: ParsedResource[] = [];
  if (headerRow < 0) {
    errors.push({ row: 1, field: "row", reason: "missing" });
    return { rows, errors, headerRow, mapping };
  }

  const seen = new Set<string>();
  for (let r = headerRow + 1; r < sheet.length; r++) {
    const line = sheet[r] ?? [];
    const cell = (f: ImportField) => (mapping[f] === undefined ? undefined : line[mapping[f] as number]);
    if (line.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const rowNo = r + 1; // 1-based, as in Excel
    const rowErrors: ImportError[] = [];

    const code = String(cell("code") ?? "").trim();
    const name = String(cell("name") ?? "").trim();
    if (!code) rowErrors.push({ row: rowNo, field: "code", reason: "missing" });
    else if (code.length > 40) rowErrors.push({ row: rowNo, field: "code", reason: "invalid" });
    else if (seen.has(code.toLowerCase())) rowErrors.push({ row: rowNo, field: "code", reason: "duplicate" });
    if (!name) rowErrors.push({ row: rowNo, field: "name", reason: "missing" });

    const kind = parseKind(cell("kind"));
    if (!kind) rowErrors.push({ row: rowNo, field: "kind", reason: cell("kind") ? "invalid" : "missing" });

    const unit = parseUnit(cell("unit"));
    if (!unit) rowErrors.push({ row: rowNo, field: "unit", reason: cell("unit") ? "invalid" : "missing" });

    const cost = parseAmount(cell("unit_cost"));
    if (cost === null || cost < 0)
      rowErrors.push({ row: rowNo, field: "unit_cost", reason: cell("unit_cost") === undefined ? "missing" : "invalid" });

    const rawCurrency = String(cell("currency") ?? "")
      .trim()
      .toUpperCase()
      .replace("FDJ", "DJF");
    const currency = (rawCurrency ? rawCurrency : defaultCurrency) as CurrencyCode;
    if (!CURRENCIES.includes(currency)) rowErrors.push({ row: rowNo, field: "currency", reason: "invalid" });

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }
    seen.add(code.toLowerCase());
    const supplier = String(cell("supplier_name") ?? "").trim();
    rows.push({
      code,
      name: name.slice(0, 300),
      kind: kind as ResourceKind,
      unit: unit as UnitCode,
      unit_cost: Math.round((cost as number) * 100) / 100,
      currency,
      supplier_name: supplier || null,
    });
  }
  return { rows, errors, headerRow, mapping };
}
