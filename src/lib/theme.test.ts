import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("defaults to the explicit mode", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("follows the system when asked", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
