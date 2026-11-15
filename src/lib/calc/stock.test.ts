import { describe, expect, it } from "vitest";
import { receiptStatus, stockBalances } from "./stock";

describe("stock", () => {
  it("sums movements per location and moves transfers", () => {
    const b = stockBalances([
      { kind: "in", location: "A", item: "Ciment", unit: "t", quantity: 10 },
      { kind: "out", location: "A", item: "ciment", unit: "t", quantity: 3.5 },
      { kind: "transfer", location: "A", toLocation: "B", item: "Ciment", unit: "t", quantity: 2 },
      { kind: "adjustment", location: "B", item: "Ciment", unit: "t", quantity: -0.25 },
    ]);
    expect(b.get("A|ciment|t")).toBe(4.5);
    expect(b.get("B|ciment|t")).toBe(1.75);
  });
  it("checks receipts against the order", () => {
    expect(receiptStatus(10, 0)).toBe("not_received");
    expect(receiptStatus(10, 4)).toBe("partial");
    expect(receiptStatus(10, 10)).toBe("received");
    expect(receiptStatus(10, 11)).toBe("over");
  });
});
