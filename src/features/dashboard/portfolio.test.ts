import { describe, expect, it } from "vitest";
import { portfolio } from "./portfolio";

describe("portfolio", () => {
  it("sums per currency and skips cancelled projects", () => {
    const p = (currency: string, status: string, n: number) => ({
      currency,
      status,
      contract_total: n,
      actual_cost: n / 2,
      earned_value: n / 4,
      claimed_net: n / 5,
      received: n / 10,
    });
    expect(
      portfolio([p("DJF", "active", 1000), p("DJF", "completed", 2000), p("ETB", "active", 10.01), p("DJF", "cancelled", 99999)]),
    ).toEqual([
      { currency: "DJF", contract: 3000, actual: 1500, earned: 750, claimed: 600, received: 300, outstanding: 300 },
      { currency: "ETB", contract: 10.01, actual: 5.01, earned: 2.5, claimed: 2, received: 1, outstanding: 1 },
    ]);
  });
});
