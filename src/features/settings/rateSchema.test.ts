import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { nonNegativeField, optionalPercentField, percentField, positiveField } from "./rateSchema";

const t = ((k: string) => k) as unknown as TFunction;

describe("rate fields", () => {
  it("accepts comma decimals", () => {
    expect(percentField(t).parse("7,5")).toBe(7.5);
  });
  it("rejects out-of-range percentages", () => {
    expect(percentField(t).safeParse("101").success).toBe(false);
    expect(percentField(t).safeParse("-1").success).toBe(false);
  });
  it("treats empty percent as zero, empty optional as null", () => {
    expect(percentField(t).parse("")).toBe(0);
    expect(optionalPercentField(t).parse("")).toBeNull();
  });
  it("requires a positive coefficient", () => {
    expect(positiveField(t).safeParse("0").success).toBe(false);
    expect(positiveField(t).parse("1.25")).toBe(1.25);
    expect(positiveField(t).safeParse("abc").success).toBe(false);
  });
  it("rejects negative amounts", () => {
    expect(nonNegativeField(t).safeParse("-5").success).toBe(false);
  });
});
