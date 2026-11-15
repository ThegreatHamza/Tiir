import { describe, expect, it } from "vitest";
import { pdfText } from "./pdf";

describe("pdfText", () => {
  it("keeps only characters the standard PDF fonts can draw", () => {
    expect(pdfText("1 234 DJF")).toBe("1 234 DJF");
    expect(pdfText("Béton 350 kg/m³ — 12 m²")).toBe("Béton 350 kg/m3 — 12 m2");
    expect(pdfText("−5")).toBe("-5");
  });
});
