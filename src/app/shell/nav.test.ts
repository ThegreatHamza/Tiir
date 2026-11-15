import { describe, expect, it } from "vitest";
import { visibleNav } from "./nav";

const paths = (role: Parameters<typeof visibleNav>[0]) => visibleNav(role).flatMap((s) => s.items.map((i) => i.to));

describe("visibleNav", () => {
  it("shows company admin pages to owners", () => {
    expect(paths("owner")).toEqual(["/projects", "/clients", "/members", "/settings/company", "/account"]);
  });
  it("hides clients, members and settings from site foremen", () => {
    expect(paths("site_foreman")).toEqual(["/projects", "/account"]);
  });
  it("hides members from estimators but shows clients", () => {
    expect(paths("estimator")).toEqual(["/projects", "/clients", "/account"]);
  });
});
