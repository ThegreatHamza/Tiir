/**
 * Builds the BoQ (DQE / bordereau) as a neutral document model used by both
 * the Excel and the PDF exports. Pure and unit tested.
 * Only selling prices appear: dry costs and margins never leave the app.
 */
import { itemTotal, sumTotals, estimateSummary } from "@/lib/calc/estimating";
import type { CurrencyCode } from "@/lib/calc/money";

export type BoqDocItem = {
  id: string;
  section_id: string;
  position: number;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number | null;
};
export type BoqDocSection = { id: string; code: string; title: string; position: number };

export type BoqDocument = {
  priced: boolean;
  currency: CurrencyCode;
  sections: {
    code: string;
    title: string;
    items: { code: string; description: string; unit: string; quantity: number; unitPrice: number | null; total: number | null }[];
    subtotal: number | null;
  }[];
  totalHt: number | null;
  vatRate: number;
  vat: number | null;
  totalTtc: number | null;
};

export function buildBoqDocument(input: {
  sections: readonly BoqDocSection[];
  items: readonly BoqDocItem[];
  currency: CurrencyCode;
  vatRate: number;
  priced: boolean;
}): BoqDocument {
  const { currency, priced } = input;
  const sections = [...input.sections]
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const items = input.items
        .filter((i) => i.section_id === s.id)
        .sort((a, b) => a.position - b.position)
        .map((i) => ({
          code: i.code,
          description: i.description,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: priced ? i.unitPrice : null,
          total: priced ? itemTotal(i.quantity, i.unitPrice, currency) : null,
        }));
      return {
        code: s.code,
        title: s.title,
        items,
        subtotal: priced
          ? sumTotals(
              items.map((i) => i.total),
              currency,
            )
          : null,
      };
    });
  if (!priced) return { priced, currency, sections, totalHt: null, vatRate: input.vatRate, vat: null, totalTtc: null };
  const ht = sumTotals(
    sections.map((s) => s.subtotal),
    currency,
  );
  const summary = estimateSummary(ht, 0, input.vatRate, currency);
  return { priced, currency, sections, totalHt: summary.ht, vatRate: input.vatRate, vat: summary.vat, totalTtc: summary.ttc };
}

// ---------------------------------------------------------------------------
// Spreadsheet layout with live formulas
// ---------------------------------------------------------------------------
export type SheetCell = { v?: string | number | null; f?: string; z?: string };
export type SheetModel = { rows: SheetCell[][]; cols: number[] };

const COL = { code: "A", desc: "B", unit: "C", qty: "D", price: "E", total: "F" } as const;

export function buildBoqSheet(
  doc: BoqDocument,
  labels: {
    title: string;
    lines: string[];
    headers: [string, string, string, string, string, string];
    subtotal: (code: string, title: string) => string;
    totalHt: string;
    vat: string;
    totalTtc: string;
    unitLabel: (u: string) => string;
  },
  moneyFormat: string,
  decimals: number,
): SheetModel {
  const rows: SheetCell[][] = [];
  rows.push([{ v: labels.title }]);
  for (const l of labels.lines) rows.push([{ v: l }]);
  rows.push([]);
  rows.push(labels.headers.map((h) => ({ v: h })));

  const subtotalRefs: string[] = [];
  for (const s of doc.sections) {
    rows.push([{ v: s.code }, { v: s.title }]);
    const first = rows.length + 1; // 1-based row of the first item
    for (const it of s.items) {
      const r = rows.length + 1;
      rows.push([
        { v: it.code },
        { v: it.description },
        { v: labels.unitLabel(it.unit) },
        { v: it.quantity, z: "#,##0.000" },
        doc.priced ? { v: it.unitPrice, z: moneyFormat } : { v: null, z: moneyFormat },
        { f: `ROUND(${COL.qty}${r}*${COL.price}${r},${decimals})`, v: it.total, z: moneyFormat },
      ]);
    }
    const last = rows.length;
    const r = rows.length + 1;
    rows.push([
      {},
      { v: labels.subtotal(s.code, s.title) },
      {},
      {},
      {},
      { f: s.items.length ? `SUM(${COL.total}${first}:${COL.total}${last})` : "0", v: s.subtotal, z: moneyFormat },
    ]);
    subtotalRefs.push(`${COL.total}${r}`);
    rows.push([]);
  }

  const htRow = rows.length + 1;
  rows.push([
    {},
    { v: labels.totalHt },
    {},
    {},
    {},
    { f: subtotalRefs.length ? subtotalRefs.join("+") : "0", v: doc.totalHt, z: moneyFormat },
  ]);
  const vatRow = rows.length + 1;
  rows.push([
    {},
    { v: labels.vat },
    {},
    {},
    { v: doc.vatRate / 100, z: "0.00%" },
    { f: `ROUND(${COL.total}${htRow}*${COL.price}${vatRow},${decimals})`, v: doc.vat, z: moneyFormat },
  ]);
  rows.push([{}, { v: labels.totalTtc }, {}, {}, {}, { f: `${COL.total}${htRow}+${COL.total}${vatRow}`, v: doc.totalTtc, z: moneyFormat }]);
  return { rows, cols: [10, 60, 10, 12, 16, 18] };
}
