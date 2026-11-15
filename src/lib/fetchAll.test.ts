import { describe, expect, it } from "vitest";
import { fetchAllPages } from "./fetchAll";

describe("fetchAllPages", () => {
  it("keeps reading until a short page", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });
  it("throws on error", async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: new Error("x") }))).rejects.toThrow("x");
  });
});
