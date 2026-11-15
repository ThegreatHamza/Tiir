import { describe, expect, it } from "vitest";
import { visibleNav } from "./nav";

const paths = (role: Parameters<typeof visibleNav>[0]) => visibleNav(role).flatMap((s) => s.items.map((i) => i.to));

describe("visibleNav", () => {
  it("shows everything to owners", () => {
    expect(paths("owner")).toEqual([
      "/dashboard",
      "/projects",
      "/price-library",
      "/suppliers",
      "/workers",
      "/payroll",
      "/equipment",
      "/checklists",
      "/calendars",
      "/clients",
      "/members",
      "/settings/company",
      "/account",
    ]);
  });
  it("gives site foremen no prices, no payroll and no company admin", () => {
    expect(paths("site_foreman")).toEqual(["/projects", "/workers", "/equipment", "/calendars", "/account"]);
  });
  it("keeps payroll for owner, admin and accountant only", () => {
    expect(paths("accountant")).toContain("/payroll");
    for (const r of ["project_manager", "estimator", "storekeeper", "site_foreman", "client_viewer"] as const)
      expect(paths(r)).not.toContain("/payroll");
  });
  it("sends clients to their portal only", () => {
    expect(paths("client_viewer")).toEqual(["/portal", "/projects", "/account"]);
  });
  it("shows storekeepers suppliers but not the price library", () => {
    expect(paths("storekeeper")).toEqual(["/projects", "/suppliers", "/equipment", "/calendars", "/account"]);
  });
  it("hides members from estimators but shows clients and prices", () => {
    expect(paths("estimator")).toEqual([
      "/dashboard",
      "/projects",
      "/price-library",
      "/suppliers",
      "/equipment",
      "/calendars",
      "/clients",
      "/account",
    ]);
  });
});
