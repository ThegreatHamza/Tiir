import { describe, expect, it } from "vitest";
import { parseAmount, parseKind, parsePriceResources } from "./priceResources";

describe("parseAmount", () => {
  it("reads French and English number formats", () => {
    expect(parseAmount("25 000,50")).toBe(25000.5);
    expect(parseAmount("25,000.50")).toBe(25000.5);
    expect(parseAmount("25.000,50")).toBe(25000.5);
    expect(parseAmount("1 234")).toBe(1234);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("4 000 FDJ")).toBe(4000);
    expect(parseAmount(4000)).toBe(4000);
  });
  it("rejects text", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(null)).toBeNull();
  });
});

describe("parseKind", () => {
  it("understands French and English", () => {
    expect(parseKind("Matériau")).toBe("material");
    expect(parseKind("Main d'œuvre")).toBe("labour");
    expect(parseKind("MATERIEL")).toBe("equipment");
    expect(parseKind("Sous-traitance")).toBe("subcontract");
    expect(parseKind("labor")).toBe("labour");
    expect(parseKind("?")).toBeNull();
  });
});

describe("parsePriceResources", () => {
  const sheet = [
    ["Bibliothèque de prix 2026"],
    [],
    ["Code", "Désignation", "Type", "Unité", "Prix unitaire", "Devise", "Fournisseur"],
    ["CIM", "Ciment CPJ 42.5", "Matériau", "t", "25 000", "", "Cimenterie"],
    ["MO-MAC", "Maçon", "Main d'œuvre", "heure", 500, "DJF", ""],
    ["", "", "", "", "", "", ""],
    ["GRUE", "Grue mobile", "Engin", "jour", "1 200,50", "USD", ""],
    ["CIM", "Doublon", "Matériau", "t", "1", "", ""],
    ["X1", "", "Bizarre", "furlong", "abc", "EUR", ""],
  ];
  const res = parsePriceResources(sheet, "DJF");

  it("finds the header row below a title", () => {
    expect(res.headerRow).toBe(2);
  });
  it("parses valid rows and applies the default currency", () => {
    expect(res.rows).toEqual([
      { code: "CIM", name: "Ciment CPJ 42.5", kind: "material", unit: "t", unit_cost: 25000, currency: "DJF", supplier_name: "Cimenterie" },
      { code: "MO-MAC", name: "Maçon", kind: "labour", unit: "h", unit_cost: 500, currency: "DJF", supplier_name: null },
      { code: "GRUE", name: "Grue mobile", kind: "equipment", unit: "day", unit_cost: 1200.5, currency: "USD", supplier_name: null },
    ]);
  });
  it("reports errors with Excel row numbers", () => {
    expect(res.errors).toEqual([
      { row: 8, field: "code", reason: "duplicate" },
      { row: 9, field: "name", reason: "missing" },
      { row: 9, field: "kind", reason: "invalid" },
      { row: 9, field: "unit", reason: "invalid" },
      { row: 9, field: "unit_cost", reason: "invalid" },
      { row: 9, field: "currency", reason: "invalid" },
    ]);
  });
  it("fails clearly when no header is found", () => {
    expect(parsePriceResources([["a", "b"]], "DJF").errors).toEqual([{ row: 1, field: "row", reason: "missing" }]);
  });
});
