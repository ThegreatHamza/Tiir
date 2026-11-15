import { describe, expect, it } from "vitest";
import { fitWithin } from "./images";

describe("fitWithin", () => {
  it("scales the longest side down to the limit", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });
  it("never upscales", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("handles empty images", () => {
    expect(fitWithin(0, 10)).toEqual({ width: 0, height: 0 });
  });
});
