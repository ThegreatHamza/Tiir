import { describe, expect, it } from "vitest";
import { parseUnit } from "./units";

describe("parseUnit", () => {
  it("reads common French and English spellings", () => {
    expect(parseUnit("m²")).toBe("m2");
    expect(parseUnit("M3")).toBe("m3");
    expect(parseUnit("Forfait")).toBe("ff");
    expect(parseUnit("ML")).toBe("ml");
    expect(parseUnit("Unité")).toBe("u");
    expect(parseUnit("heure")).toBe("h");
    expect(parseUnit("jour")).toBe("day");
    expect(parseUnit("tonne")).toBe("t");
  });
  it("rejects unknown units", () => {
    expect(parseUnit("furlong")).toBeNull();
    expect(parseUnit(null)).toBeNull();
  });
});
