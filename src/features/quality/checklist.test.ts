import { describe, expect, it } from "vitest";
import { inspectionOutcome, itemsToText, mergeResults, parseItems } from "./checklist";

describe("checklists", () => {
  it("parses one item per line, dropping bullets and blanks", () => {
    expect(parseItems("1. Coffrage propre\n- Armatures conformes\n\n  • Enrobage 3 cm ")).toEqual([
      { label: "Coffrage propre" },
      { label: "Armatures conformes" },
      { label: "Enrobage 3 cm" },
    ]);
    expect(itemsToText([{ label: "A" }, { label: "B" }])).toBe("A\nB");
  });
  it("keeps previous answers", () => {
    const rows = mergeResults([{ label: "A" }, { label: "B" }], [{ label: "B", result: "pass", note: "ok" }]);
    expect(rows).toEqual([
      { label: "A", result: null, note: "" },
      { label: "B", result: "pass", note: "ok" },
    ]);
  });
  it("derives the outcome", () => {
    expect(
      inspectionOutcome([
        { label: "A", result: "pass", note: "" },
        { label: "B", result: "na", note: "" },
      ]),
    ).toBe("passed");
    expect(
      inspectionOutcome([
        { label: "A", result: "pass", note: "" },
        { label: "B", result: null, note: "" },
      ]),
    ).toBe("draft");
    expect(
      inspectionOutcome([
        { label: "A", result: "fail", note: "" },
        { label: "B", result: null, note: "" },
      ]),
    ).toBe("failed");
  });
});
