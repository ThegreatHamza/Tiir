import { describe, expect, it } from "vitest";
import { percentOf, roundMoney, roundQuantity, roundTo, sumMoney } from "./money";

describe("roundTo", () => {
  it("rounds half away from zero", () => {
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(-2.5, 0)).toBe(-3);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(1.0049, 2)).toBe(1);
  });
  it("never returns negative zero", () => {
    expect(Object.is(roundTo(-0.001, 2), 0)).toBe(true);
  });
  it("rejects bad input", () => {
    expect(() => roundTo(Number.NaN, 2)).toThrow(RangeError);
    expect(() => roundTo(1, -1)).toThrow(RangeError);
    expect(() => roundTo(1, 1.5)).toThrow(RangeError);
  });
  it("handles large construction amounts", () => {
    expect(roundTo(1234567890.125, 2)).toBe(1234567890.13);
  });
});

describe("roundMoney", () => {
  it("rounds DJF to whole francs", () => {
    expect(roundMoney(1500.4, "DJF")).toBe(1500);
    expect(roundMoney(1500.5, "DJF")).toBe(1501);
  });
  it("rounds ETB and USD to two decimals", () => {
    expect(roundMoney(10.555, "ETB")).toBe(10.56);
    expect(roundMoney(10.554, "USD")).toBe(10.55);
  });
});

describe("sumMoney", () => {
  it("sums rounded lines without float drift", () => {
    expect(sumMoney([0.1, 0.2], "USD")).toBe(0.3);
    expect(sumMoney([100.4, 100.4, 100.4], "DJF")).toBe(300);
    expect(sumMoney([], "ETB")).toBe(0);
  });
});

describe("percentOf", () => {
  it("applies a percentage and rounds", () => {
    expect(percentOf(1_000_000, 10, "DJF")).toBe(100_000);
    expect(percentOf(333.33, 5, "ETB")).toBe(16.67);
    expect(percentOf(1001, 7.5, "DJF")).toBe(75);
  });
});

describe("roundQuantity", () => {
  it("keeps three decimals", () => {
    expect(roundQuantity(12.34567)).toBe(12.346);
  });
});
