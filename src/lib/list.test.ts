import { describe, expect, it } from "vitest";
import { cycleSort, pageCount, pageRange, parseSort, safeSort, searchFilter, serializeSort } from "./list";

describe("sort helpers", () => {
  it("parses and serializes", () => {
    expect(parseSort("-name")).toEqual({ id: "name", desc: true });
    expect(parseSort("code")).toEqual({ id: "code", desc: false });
    expect(parseSort("bad;drop")).toBeNull();
    expect(serializeSort({ id: "name", desc: true })).toBe("-name");
    expect(serializeSort(null)).toBeNull();
  });
  it("cycles asc → desc → none", () => {
    const a = cycleSort(null, "name");
    expect(a).toEqual({ id: "name", desc: false });
    const b = cycleSort(a, "name");
    expect(b).toEqual({ id: "name", desc: true });
    expect(cycleSort(b, "name")).toBeNull();
    expect(cycleSort(b, "code")).toEqual({ id: "code", desc: false });
  });
  it("whitelists sortable columns", () => {
    expect(safeSort({ id: "secret", desc: false }, ["name"], { id: "name", desc: false })).toEqual({ id: "name", desc: false });
  });
});

describe("pagination", () => {
  it("computes inclusive ranges", () => {
    expect(pageRange(1, 25)).toEqual([0, 24]);
    expect(pageRange(3, 50)).toEqual([100, 149]);
    expect(pageRange(0, 25)).toEqual([0, 24]);
  });
  it("counts pages", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(51, 25)).toBe(3);
  });
});

describe("searchFilter", () => {
  it("builds an or filter over columns", () => {
    expect(searchFilter(["name", "code"], " école ")).toBe('name.ilike."%école%",code.ilike."%école%"');
  });
  it("escapes quotes, wildcards and separators", () => {
    expect(searchFilter(["name"], 'a,"b)%_')).toBe('name.ilike."%a,\\"b)\\%\\_%"');
  });
  it("returns null for empty search", () => {
    expect(searchFilter(["name"], "   ")).toBeNull();
  });
});
