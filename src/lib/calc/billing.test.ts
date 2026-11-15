import { describe, expect, it } from "vitest";
import { claimAmounts, lineAmounts } from "./billing";

describe("progress claims", () => {
  it("this period = cumulative − previous", () => {
    expect(lineAmounts({ cumulativeQuantity: 10.5, previousQuantity: 4, unitPrice: 1543 }, "DJF")).toEqual({
      cumulative: 16202,
      previous: 6172,
      thisPeriod: 10030,
    });
  });
  it("applies retention, advance recovery and tax from settings", () => {
    const [c1, c2, c3] = claimAmounts(
      [
        {
          id: "1",
          status: "approved",
          retentionRate: 5,
          advanceRecoveryRate: 20,
          vatRate: 10,
          lines: [{ cumulativeQuantity: 100, previousQuantity: 0, unitPrice: 1000 }],
        },
        {
          id: "2",
          status: "rejected",
          retentionRate: 5,
          advanceRecoveryRate: 20,
          vatRate: 10,
          lines: [{ cumulativeQuantity: 300, previousQuantity: 100, unitPrice: 1000 }],
        },
        {
          id: "3",
          status: "submitted",
          retentionRate: 5,
          advanceRecoveryRate: 20,
          vatRate: 10,
          lines: [{ cumulativeQuantity: 300, previousQuantity: 100, unitPrice: 1000 }],
        },
      ],
      { currency: "DJF", retentionCap: 12000, advanceAmount: 50000 },
    );
    // 100 000 this period: retention 5 000, advance 20 000, VAT 10 000 → net 85 000
    expect(c1).toMatchObject({ thisPeriod: 100000, retention: 5000, advanceRecovery: 20000, vat: 10000, netPayable: 85000 });
    // rejected claim is computed but does not consume the cap
    expect(c2).toMatchObject({ thisPeriod: 200000, retention: 7000, advanceRecovery: 30000, retentionToDate: 5000 });
    // cap 12 000 − 5 000 already retained → 7 000; advance 50 000 − 20 000 → 30 000
    expect(c3).toMatchObject({
      retention: 7000,
      advanceRecovery: 30000,
      vat: 20000,
      netPayable: 183000,
      retentionToDate: 12000,
      advanceRecoveredToDate: 50000,
    });
  });
  it("has no cap when none is set", () => {
    const [c] = claimAmounts(
      [
        {
          id: "x",
          status: "draft",
          retentionRate: 10,
          advanceRecoveryRate: 0,
          vatRate: 0,
          lines: [{ cumulativeQuantity: 1, previousQuantity: 0, unitPrice: 999.99 }],
        },
      ],
      { currency: "USD", retentionCap: null, advanceAmount: 0 },
    );
    expect(c).toMatchObject({ thisPeriod: 999.99, retention: 100, netPayable: 899.99 });
  });
});
