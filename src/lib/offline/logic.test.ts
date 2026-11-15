import { describe, expect, it } from "vitest";
import { isNetworkError, orderQueue, preparePayload, retryDelay, syncOutcome } from "./logic";
import type { QueueItem } from "./store";

const item = (id: string, table: QueueItem["table"], createdAt: number, status: QueueItem["status"] = "pending"): QueueItem => ({
  id,
  table,
  createdAt,
  status,
  payload: {},
  clientUpdatedAt: "",
  attempts: 0,
  label: id,
  companyId: "c",
});

describe("offline queue", () => {
  it("sends parents first, then in creation order, skipping failed items", () => {
    const q = orderQueue([
      item("photo", "photos", 1),
      item("line", "daily_report_labour", 2),
      item("report", "daily_reports", 3),
      item("bad", "daily_reports", 0, "failed"),
    ]);
    expect(q.map((i) => i.id)).toEqual(["report", "line", "photo"]);
  });
  it("tells network errors from rejections", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError({ message: "new row violates row-level security policy" })).toBe(false);
  });
  it("detects that a newer edit from someone else won (last write wins)", () => {
    expect(syncOutcome("2026-11-15T08:00:00Z", "2026-11-15T09:00:00Z")).toBe("overwritten");
    expect(syncOutcome("2026-11-15T09:00:00Z", "2026-11-15T09:00:00Z")).toBe("applied");
    expect(syncOutcome("2026-11-15T09:00:00Z", null)).toBe("applied");
  });
  it("backs off exponentially", () => {
    expect(retryDelay(1)).toBe(5000);
    expect(retryDelay(3)).toBe(20000);
    expect(retryDelay(20)).toBe(600000);
  });
  it("strips server-managed columns and stamps the edit time", () => {
    expect(preparePayload({ id: "x", created_at: "a", updated_at: "b", created_by: "c", quantity: 2 }, "T")).toEqual({
      id: "x",
      quantity: 2,
      client_updated_at: "T",
    });
  });
});
