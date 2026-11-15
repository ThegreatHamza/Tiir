import { describe, expect, it } from "vitest";
import {
  compareVersions,
  componentAmount,
  diffSummary,
  estimateSummary,
  itemQuantity,
  itemTotal,
  itemUnitPrice,
  moveInList,
  sellingPrice,
  sumTotals,
  takeoffLineResult,
  takeoffQuantity,
  upaDryCost,
  type ComparableItem,
} from "./estimating";

// Same figures as supabase/tests/estimating_test.sql — SQL and TS must agree.
describe("takeoff", () => {
  const lines = [
    { count: 2, length: 4, width: 0.3, height: 0.5 },
    { count: 1, length: 10, width: 0.2, height: 0.4 },
    { count: -1, length: 1, width: 0.2, height: 0.4 },
  ];
  it("multiplies the given dimensions", () => {
    expect(takeoffLineResult(lines[0]!)).toBe(1.2);
    expect(takeoffLineResult({ count: 3 })).toBe(3);
    expect(takeoffLineResult({ count: 1, length: 12.5, width: null })).toBe(12.5);
  });
  it("subtracts deductions and rounds to 3 decimals", () => {
    expect(takeoffQuantity(lines)).toBe(1.92);
    expect(takeoffLineResult({ count: 1, length: 1.0005, width: 1 })).toBe(1.001);
  });
  it("uses takeoff only when the item says so", () => {
    expect(itemQuantity({ quantity_source: "takeoff", quantity: 99 }, lines)).toBe(1.92);
    expect(itemQuantity({ quantity_source: "manual", quantity: 99 }, lines)).toBe(99);
    expect(itemQuantity({ quantity_source: "takeoff", quantity: 5 }, [])).toBe(0);
  });
});

describe("unit price analysis", () => {
  const components = [
    { quantity: 0.35, unit_cost: 25000 },
    { quantity: 0.45, unit_cost: 4000, waste_rate: 5 },
    { quantity: 6, unit_cost: 500 },
  ];
  it("adds waste to a component", () => {
    expect(componentAmount(components[1]!, "DJF")).toBe(1890);
  });
  it("computes the dry cost", () => {
    expect(upaDryCost(components, "DJF")).toBe(13640);
  });
  it("selling price = dry cost × coefficient", () => {
    expect(sellingPrice(13640, 1.25, "DJF")).toBe(17050);
    expect(sellingPrice(1234, 1.25, "DJF")).toBe(1543); // 1542.5 → 1543
    expect(sellingPrice(10.01, 1.3, "ETB")).toBe(13.01);
    expect(() => sellingPrice(10, 0, "DJF")).toThrow(RangeError);
  });
});

describe("BoQ items and totals", () => {
  it("picks override, then analysis, then dry cost × coefficient", () => {
    expect(itemUnitPrice({ unit_price: 999, upaSellingPrice: 17050, unit_cost: 1 }, 1.25, "DJF")).toBe(999);
    expect(itemUnitPrice({ upaSellingPrice: 17050, unit_cost: 1 }, 1.25, "DJF")).toBe(17050);
    expect(itemUnitPrice({ unit_cost: 1234 }, 1.25, "DJF")).toBe(1543);
    expect(itemUnitPrice({}, 1.25, "DJF")).toBeNull();
  });
  it("item total = quantity × unit price", () => {
    expect(itemTotal(1.92, 17050, "DJF")).toBe(32736);
    expect(itemTotal(10.5, 1543, "DJF")).toBe(16202);
    expect(itemTotal(3, 999, "DJF")).toBe(2997);
    expect(itemTotal(2.5, null, "DJF")).toBe(0);
    expect(itemTotal(3.333, 12.34, "ETB")).toBe(41.13);
  });
  it("section and project totals are sums", () => {
    expect(sumTotals([32736, 16202, 2997], "DJF")).toBe(51935);
    expect(sumTotals([0.1, 0.2, null], "USD")).toBe(0.3);
  });
  it("summarises VAT, TTC and margin", () => {
    expect(estimateSummary(51935, 39146, 10, "DJF")).toEqual({
      ht: 51935,
      vat: 5194,
      ttc: 57129,
      dryCost: 39146,
      margin: 12789,
      marginRate: 24.63,
    });
    expect(estimateSummary(0, 0, 10, "DJF").marginRate).toBeNull();
  });
});

describe("compareVersions", () => {
  const item = (code: string, quantity: number, unitPrice: number, description = code): ComparableItem => ({
    id: code + quantity,
    code,
    description,
    unit: "m3",
    quantity,
    unitPrice,
    total: Math.round(quantity * unitPrice),
  });
  it("detects added, removed, changed and unchanged items", () => {
    const a = [item("1.1", 10, 100), item("1.2", 5, 50), item("1.3", 1, 10)];
    const b = [item("1.1", 12, 100), item("1.2", 5, 50), item("1.4", 2, 20)];
    const rows = compareVersions(a, b, "DJF");
    expect(rows.map((r) => [r.key, r.status])).toEqual([
      ["c:1.1", "changed"],
      ["c:1.2", "unchanged"],
      ["c:1.4", "added"],
      ["c:1.3", "removed"],
    ]);
    expect(rows[0]!.deltaQuantity).toBe(2);
    expect(rows[0]!.deltaTotal).toBe(200);
    expect(diffSummary(rows, "DJF")).toEqual({ added: 1, removed: 1, changed: 1, unchanged: 1, deltaTotal: 200 + 40 - 10 });
  });
  it("matches items without a code by description and unit", () => {
    const rows = compareVersions([item("", 1, 10, "Fouilles  en rigole")], [item("", 1, 12, "fouilles en rigole")], "DJF");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("changed");
  });
});

describe("moveInList", () => {
  it("moves without mutating", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveInList(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveInList(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveInList(list, 9, 0)).toEqual(list);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
});
