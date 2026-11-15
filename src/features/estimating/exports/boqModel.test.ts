import { describe, expect, it } from "vitest";
import { buildBoqDocument, buildBoqSheet } from "./boqModel";

const sections = [
  { id: "s2", code: "2", title: "Finitions", position: 2 },
  { id: "s1", code: "1", title: "Gros œuvre", position: 1 },
];
const items = [
  { id: "a", section_id: "s1", position: 1, code: "1.1", description: "Béton", unit: "m3", quantity: 1.92, unitPrice: 17050 },
  { id: "b", section_id: "s1", position: 2, code: "1.2", description: "Enduit", unit: "m2", quantity: 10.5, unitPrice: 1543 },
  { id: "c", section_id: "s2", position: 1, code: "2.1", description: "Forfait", unit: "ff", quantity: 3, unitPrice: 999 },
];

describe("buildBoqDocument", () => {
  it("orders sections and items and computes totals like the database", () => {
    const doc = buildBoqDocument({ sections, items, currency: "DJF", vatRate: 10, priced: true });
    expect(doc.sections.map((s) => s.code)).toEqual(["1", "2"]);
    expect(doc.sections[0]!.subtotal).toBe(32736 + 16202);
    expect(doc.totalHt).toBe(51935);
    expect(doc.vat).toBe(5194);
    expect(doc.totalTtc).toBe(57129);
  });
  it("strips every price from the unpriced (tender) version", () => {
    const doc = buildBoqDocument({ sections, items, currency: "DJF", vatRate: 10, priced: false });
    expect(doc.sections.flatMap((s) => s.items.map((i) => [i.unitPrice, i.total]))).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(doc.totalHt).toBeNull();
    expect(doc.sections[0]!.items[0]!.quantity).toBe(1.92);
  });
});

describe("buildBoqSheet", () => {
  it("writes live formulas that point at the right cells", () => {
    const doc = buildBoqDocument({ sections, items, currency: "DJF", vatRate: 10, priced: true });
    const sheet = buildBoqSheet(
      doc,
      {
        title: "DQE",
        lines: ["Projet"],
        headers: ["N°", "Désignation", "U", "Qté", "PU", "Montant"],
        subtotal: (c) => `Sous-total ${c}`,
        totalHt: "Total HT",
        vat: "TVA",
        totalTtc: "Total TTC",
        unitLabel: (u) => u,
      },
      "#,##0",
      0,
    );
    // rows: 1 title, 2 line, 3 blank, 4 header, 5 section 1, 6-7 items, 8 subtotal, 9 blank, 10 section 2, 11 item, 12 subtotal, 13 blank, 14 HT, 15 VAT, 16 TTC
    expect(sheet.rows[5]![5]).toEqual({ f: "ROUND(D6*E6,0)", v: 32736, z: "#,##0" });
    expect(sheet.rows[7]![5]!.f).toBe("SUM(F6:F7)");
    expect(sheet.rows[11]![5]!.f).toBe("SUM(F11:F11)");
    expect(sheet.rows[13]![5]).toMatchObject({ f: "F8+F12", v: 51935 });
    expect(sheet.rows[14]![5]).toMatchObject({ f: "ROUND(F14*E15,0)", v: 5194 });
    expect(sheet.rows[15]![5]).toMatchObject({ f: "F14+F15", v: 57129 });
  });
});
