import { describe, expect, it } from "vitest";
import { assignableRoles, can } from "./roles";

describe("role permissions", () => {
  it("hides costs from foremen, storekeepers and clients", () => {
    expect(can.seeCosts("site_foreman")).toBe(false);
    expect(can.seeCosts("storekeeper")).toBe(false);
    expect(can.seeCosts("client_viewer")).toBe(false);
    expect(can.seeCosts("estimator")).toBe(true);
  });
  it("limits finance to owners, admins and accountants", () => {
    expect(can.seeFinance("accountant")).toBe(true);
    expect(can.seeFinance("project_manager")).toBe(false);
  });
  it("lets only owners manage owners and admins", () => {
    expect(can.manageRole("owner", "admin")).toBe(true);
    expect(can.manageRole("admin", "admin")).toBe(false);
    expect(can.manageRole("admin", "estimator")).toBe(true);
    expect(can.manageRole("project_manager", "estimator")).toBe(false);
    expect(assignableRoles("admin")).not.toContain("owner");
    expect(assignableRoles("owner")).toContain("owner");
    expect(assignableRoles(null)).toEqual([]);
  });
  it("never lets client viewers upload", () => {
    expect(can.uploadFiles("client_viewer")).toBe(false);
    expect(can.uploadFiles(undefined)).toBe(false);
  });
});
