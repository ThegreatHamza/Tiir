/**
 * Estimating calculations — pure functions, unit tested.
 * They mirror the SQL views (supabase/migrations/…_estimating.sql) exactly:
 * the database is the source of truth for stored totals, these functions
 * give instant feedback in the editor and drive the exports.
 */
import { roundMoney, roundQuantity, roundTo, sumMoney, percentOf, type CurrencyCode } from "./money";

export type TakeoffInput = { count: number; length?: number | null; width?: number | null; height?: number | null };

/** count × length × width × height, missing dimensions count as 1; 3 decimals. Negative count = deduction. */
export function takeoffLineResult(l: TakeoffInput): number {
  const dim = (v: number | null | undefined) => (v === null || v === undefined ? 1 : v);
  return roundQuantity(l.count * dim(l.length) * dim(l.width) * dim(l.height));
}

/** Item quantity = sum of its takeoff lines (each already rounded to 3 decimals). */
export function takeoffQuantity(lines: readonly TakeoffInput[]): number {
  return roundTo(
    lines.reduce((s, l) => s + takeoffLineResult(l), 0),
    3,
  );
}

export function itemQuantity(item: { quantity_source: "manual" | "takeoff"; quantity: number }, lines: readonly TakeoffInput[]): number {
  return item.quantity_source === "takeoff" ? takeoffQuantity(lines) : item.quantity;
}

export type ComponentInput = { quantity: number; unit_cost: number; waste_rate?: number | null };

/** One resource in a unit price analysis: quantity × unit cost × (1 + waste %), rounded. */
export function componentAmount(c: ComponentInput, currency: CurrencyCode): number {
  return roundMoney(c.quantity * c.unit_cost * (1 + (c.waste_rate ?? 0) / 100), currency);
}

/** Dry cost (déboursé sec) of one unit of work = sum of component amounts. */
export function upaDryCost(components: readonly ComponentInput[], currency: CurrencyCode): number {
  return sumMoney(
    components.map((c) => componentAmount(c, currency)),
    currency,
  );
}

/** Selling price = dry cost × coefficient. */
export function sellingPrice(dryCost: number, coefficient: number, currency: CurrencyCode): number {
  if (!(coefficient > 0)) throw new RangeError("coefficient must be > 0");
  return roundMoney(dryCost * coefficient, currency);
}

/**
 * Unit selling price of a BoQ item, in priority order:
 * explicit override → linked analysis selling price → manual dry cost × coefficient.
 */
export function itemUnitPrice(
  item: { unit_price?: number | null; unit_cost?: number | null; upaSellingPrice?: number | null },
  coefficient: number,
  currency: CurrencyCode,
): number | null {
  if (item.unit_price !== null && item.unit_price !== undefined) return item.unit_price;
  if (item.upaSellingPrice !== null && item.upaSellingPrice !== undefined) return item.upaSellingPrice;
  if (item.unit_cost !== null && item.unit_cost !== undefined) return sellingPrice(item.unit_cost, coefficient, currency);
  return null;
}

/** Item total = quantity × unit price. */
export function itemTotal(quantity: number, unitPrice: number | null, currency: CurrencyCode): number {
  return roundMoney(quantity * (unitPrice ?? 0), currency);
}

/** Section and project totals are sums of item totals. */
export function sumTotals(totals: readonly (number | null | undefined)[], currency: CurrencyCode): number {
  return sumMoney(
    totals.map((t) => t ?? 0),
    currency,
  );
}

export type EstimateSummary = { ht: number; vat: number; ttc: number; dryCost: number; margin: number; marginRate: number | null };

export function estimateSummary(totalHt: number, totalDry: number, vatRatePercent: number, currency: CurrencyCode): EstimateSummary {
  const vat = percentOf(totalHt, vatRatePercent, currency);
  const margin = roundMoney(totalHt - totalDry, currency);
  return {
    ht: totalHt,
    vat,
    ttc: roundMoney(totalHt + vat, currency),
    dryCost: totalDry,
    margin,
    marginRate: totalHt > 0 ? roundTo((margin / totalHt) * 100, 2) : null,
  };
}

// ---------------------------------------------------------------------------
// Version comparison
// ---------------------------------------------------------------------------
export type ComparableItem = {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number | null;
  total: number;
};

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export type DiffRow = {
  key: string;
  status: DiffStatus;
  a: ComparableItem | null;
  b: ComparableItem | null;
  deltaQuantity: number;
  deltaUnitPrice: number;
  deltaTotal: number;
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Items are matched by code when they have one, otherwise by description + unit. */
export function itemKey(i: Pick<ComparableItem, "code" | "description" | "unit">): string {
  return i.code.trim() ? `c:${norm(i.code)}` : `d:${norm(i.description)}|${i.unit}`;
}

/** Compares version A (before) with version B (after). Keeps B's order, removed items last. */
export function compareVersions(a: readonly ComparableItem[], b: readonly ComparableItem[], currency: CurrencyCode): DiffRow[] {
  const byKeyA = new Map<string, ComparableItem>();
  for (const it of a) if (!byKeyA.has(itemKey(it))) byKeyA.set(itemKey(it), it);
  const seen = new Set<string>();
  const rows: DiffRow[] = [];
  const d = (x: number, y: number) => roundMoney(y - x, currency);

  for (const ib of b) {
    const key = itemKey(ib);
    if (seen.has(key)) continue;
    seen.add(key);
    const ia = byKeyA.get(key) ?? null;
    if (!ia) {
      rows.push({
        key,
        status: "added",
        a: null,
        b: ib,
        deltaQuantity: ib.quantity,
        deltaUnitPrice: ib.unitPrice ?? 0,
        deltaTotal: ib.total,
      });
      continue;
    }
    const changed =
      ia.quantity !== ib.quantity ||
      (ia.unitPrice ?? 0) !== (ib.unitPrice ?? 0) ||
      ia.total !== ib.total ||
      norm(ia.description) !== norm(ib.description) ||
      ia.unit !== ib.unit;
    rows.push({
      key,
      status: changed ? "changed" : "unchanged",
      a: ia,
      b: ib,
      deltaQuantity: roundQuantity(ib.quantity - ia.quantity),
      deltaUnitPrice: d(ia.unitPrice ?? 0, ib.unitPrice ?? 0),
      deltaTotal: d(ia.total, ib.total),
    });
  }
  for (const [key, ia] of byKeyA) {
    if (seen.has(key)) continue;
    rows.push({
      key,
      status: "removed",
      a: ia,
      b: null,
      deltaQuantity: -ia.quantity,
      deltaUnitPrice: -(ia.unitPrice ?? 0),
      deltaTotal: -ia.total,
    });
  }
  return rows;
}

export function diffSummary(rows: readonly DiffRow[], currency: CurrencyCode) {
  const count = (s: DiffStatus) => rows.filter((r) => r.status === s).length;
  return {
    added: count("added"),
    removed: count("removed"),
    changed: count("changed"),
    unchanged: count("unchanged"),
    deltaTotal: sumMoney(
      rows.map((r) => r.deltaTotal),
      currency,
    ),
  };
}

/** Moves an element of a list (drag and drop). Pure. */
export function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x as T);
  return next;
}
