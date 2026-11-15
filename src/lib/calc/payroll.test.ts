import { describe, expect, it } from "vitest";
import { normaliseDays, payslip } from "./payroll";

describe("payslip", () => {
  it("pays days, overtime and bonus, minus advances", () => {
    // 22 days × 2 000 = 44 000; 6 h OT × (2 000 / 8) × 1.5 = 2 250; + 1 000 bonus = 47 250; − 5 000 advance
    expect(
      payslip(
        { days: 22, overtimeHours: 6, dailyRate: 2000, bonus: 1000, advances: 5000 },
        { hoursPerDay: 8, overtimeMultiplier: 1.5 },
        "DJF",
      ),
    ).toEqual({
      base: 44000,
      overtime: 2250,
      gross: 47250,
      net: 42250,
    });
  });
  it("rounds ETB to cents", () => {
    expect(payslip({ days: 1.5, overtimeHours: 1, dailyRate: 333.33 }, { hoursPerDay: 8, overtimeMultiplier: 1.25 }, "ETB")).toEqual({
      base: 500,
      overtime: 52.08,
      gross: 552.08,
      net: 552.08,
    });
  });
  it("normalises days", () => {
    expect([0.1, 0.4, 0.6, 0.9].map(normaliseDays)).toEqual([0, 0.5, 0.5, 1]);
  });
});
