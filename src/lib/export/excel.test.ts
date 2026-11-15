import { describe, expect, it } from "vitest";
import { buildSheetRows, moneyNumFmt, safeFileName } from "./excel";

describe("buildSheetRows", () => {
  it("puts headers first and maps values", () => {
    const rows = buildSheetRows(
      [
        { header: "Code", value: (r: { code: string; n?: number }) => r.code },
        { header: "N", value: (r: { code: string; n?: number }) => r.n },
      ],
      [{ code: "A", n: 1 }, { code: "B" }],
    );
    expect(rows).toEqual([
      ["Code", "N"],
      ["A", 1],
      ["B", null],
    ]);
  });
});

describe("safeFileName", () => {
  it("strips accents and unsafe characters", () => {
    expect(safeFileName("Projets — École / Balbala")).toBe("Projets_Ecole_Balbala");
    expect(safeFileName("///")).toBe("export");
  });
});

describe("moneyNumFmt", () => {
  it("matches currency decimals", () => {
    expect(moneyNumFmt(0)).toBe("#,##0");
    expect(moneyNumFmt(2)).toBe("#,##0.00");
  });
});
