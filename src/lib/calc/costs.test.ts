import { describe, expect, it } from "vitest";
import { cashFlow, earnedValue, itemForecast } from "./costs";

describe("earned value", () => {
  it("computes EV, CPI, SPI and EAC", () => {
    const r = earnedValue(
      [
        { budget: 100000, percentComplete: 50, actualCost: 60000, plannedPercent: 60 },
        { budget: 50000, percentComplete: 100, actualCost: 45000, plannedPercent: 100 },
      ],
      "DJF",
    );
    expect(r).toMatchObject({
      bac: 150000,
      ev: 100000,
      ac: 105000,
      pv: 110000,
      cv: -5000,
      sv: -10000,
      cpi: 0.95,
      spi: 0.91,
      percentComplete: 66.67,
    });
    expect(r.eac).toBe(157895); // 150 000 / 0.95
    expect(r.vac).toBe(-7895);
  });
  it("handles a project with no cost yet", () => {
    expect(earnedValue([{ budget: 1000, percentComplete: 0, actualCost: 0 }], "USD")).toMatchObject({ cpi: null, spi: null, eac: 1000 });
  });
  it("forecasts an item at completion", () => {
    expect(itemForecast(1000, 600, 50, "DJF")).toBe(1200);
    expect(itemForecast(1000, 0, 0, "DJF")).toBe(1000);
    expect(itemForecast(1000, 1100, 100, "DJF")).toBe(1100);
  });
});

describe("cash flow", () => {
  it("groups by month with a running balance", () => {
    expect(
      cashFlow(
        [
          { date: "2026-02-28", amount: 85000 },
          { date: "2026-04-30", amount: 50000 },
        ],
        [
          { date: "2026-02-03", amount: 30000 },
          { date: "2026-02-20", amount: 20000 },
          { date: "2026-03-15", amount: 40000 },
        ],
        "DJF",
      ),
    ).toEqual([
      { month: "2026-02", in: 85000, out: 50000, net: 35000, cumulative: 35000 },
      { month: "2026-03", in: 0, out: 40000, net: -40000, cumulative: -5000 },
      { month: "2026-04", in: 50000, out: 0, net: 50000, cumulative: 45000 },
    ]);
  });
});
