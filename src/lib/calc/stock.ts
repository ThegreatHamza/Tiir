/** Stock and receipts — pure, unit tested. Mirrors stock_balances / purchase_order_lines_site. */
export type Movement = {
  kind: "in" | "out" | "transfer" | "adjustment";
  location: string;
  toLocation?: string | null;
  item: string;
  unit: string;
  quantity: number;
};

export function stockBalances(movements: readonly Movement[]): Map<string, number> {
  const m = new Map<string, number>();
  const add = (loc: string, item: string, unit: string, q: number) => {
    const k = `${loc}|${item.toLowerCase()}|${unit}`;
    m.set(k, Math.round(((m.get(k) ?? 0) + q) * 1000) / 1000);
  };
  for (const mv of movements) {
    const signed = mv.kind === "in" || mv.kind === "adjustment" ? mv.quantity : -mv.quantity;
    add(mv.location, mv.item, mv.unit, signed);
    if (mv.kind === "transfer" && mv.toLocation) add(mv.toLocation, mv.item, mv.unit, mv.quantity);
  }
  return m;
}

export type ReceiptStatus = "not_received" | "partial" | "received" | "over";

export function receiptStatus(ordered: number, received: number): ReceiptStatus {
  if (received <= 0) return "not_received";
  if (received < ordered) return "partial";
  if (received === ordered) return "received";
  return "over";
}
