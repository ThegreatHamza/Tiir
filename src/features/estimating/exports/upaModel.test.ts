import { describe, expect, it } from "vitest";
import { buildUpaDocs } from "./upaModel";

describe("buildUpaDocs", () => {
  it("groups components by kind and matches the SQL totals", () => {
    const [doc] = buildUpaDocs(
      [
        {
          id: "u",
          code: "BA25",
          title: "Béton armé",
          unit: "m3",
          coefficient: 1.25,
          components: [
            { kind: "labour", designation: "Maçon", unit: "h", quantity: 6, unit_cost: 500, waste_rate: 0, position: 3 },
            { kind: "material", designation: "Ciment", unit: "t", quantity: 0.35, unit_cost: 25000, waste_rate: 0, position: 1 },
            { kind: "material", designation: "Sable", unit: "m3", quantity: 0.45, unit_cost: 4000, waste_rate: 5, position: 2 },
          ],
        },
      ],
      "DJF",
    );
    expect(doc!.groups.map((g) => [g.kind, g.subtotal])).toEqual([
      ["material", 10640],
      ["labour", 3000],
    ]);
    expect(doc!.dryCost).toBe(13640);
    expect(doc!.sellingPrice).toBe(17050);
  });
  it("sorts analyses by code, numbers naturally", () => {
    const docs = buildUpaDocs(
      ["A10", "A2", "A1"].map((code) => ({ id: code, code, title: code, unit: "u", coefficient: 1, components: [] })),
      "DJF",
    );
    expect(docs.map((d) => d.code)).toEqual(["A1", "A2", "A10"]);
    expect(docs[0]!.dryCost).toBe(0);
  });
});
