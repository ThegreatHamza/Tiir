import { describe, expect, it } from "vitest";
import { makeCalendar } from "@/lib/calc/schedule";
import { buildPlan, scheduleChanges } from "./model";
import type { Task, TaskDependency } from "./api";

const cal = makeCalendar([1, 2, 3, 4, 5]);
const task = (id: string, parent: string | null, position: number, start: string, duration: number, progress = 0): Task => ({
  id,
  parent_id: parent,
  position,
  name: id,
  start_date: start,
  end_date: start,
  duration,
  progress,
  progress_source: "manual",
  wbs_code: "",
  notes: null,
  company_id: "c",
  project_id: "p",
  created_at: `2026-01-01T00:00:0${position}Z`,
  updated_at: "",
  created_by: null,
  deleted_at: null,
});
const dep = (p: string, s: string): TaskDependency => ({
  id: p + s,
  predecessor_id: p,
  successor_id: s,
  type: "FS",
  lag_days: 0,
  company_id: "c",
  project_id: "p",
  created_at: "",
  updated_at: "",
  created_by: null,
  deleted_at: null,
});

describe("buildPlan", () => {
  const tasks = [
    task("G", null, 1, "2026-01-05", 0),
    task("A", "G", 1, "2026-01-05", 3, 100),
    task("B", "G", 2, "2026-01-05", 2, 0),
    task("C", null, 2, "2026-01-05", 1),
  ];
  const plan = buildPlan(tasks, [dep("A", "B"), dep("B", "C")], [], cal);

  it("orders rows depth-first with WBS codes", () => {
    expect(plan.order).toEqual(["G", "A", "B", "C"]);
    expect(plan.order.map((id) => plan.rows.get(id)?.wbs)).toEqual(["1", "1.1", "1.2", "2"]);
    expect(plan.rows.get("A")?.depth).toBe(1);
  });
  it("rolls up summary tasks and schedules leaves", () => {
    const changes = scheduleChanges(plan, true, cal);
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    expect(byId.A).toMatchObject({ start_date: "2026-01-05", end_date: "2026-01-07" });
    expect(byId.B).toMatchObject({ start_date: "2026-01-08", end_date: "2026-01-09" });
    expect(byId.C).toMatchObject({ start_date: "2026-01-12", end_date: "2026-01-12" });
    expect(plan.rows.get("G")?.isSummary).toBe(true);
    expect(plan.rows.get("G")?.progress).toBe(60); // (100×3 + 0×2) / 5
  });
  it("flags cycles instead of crashing", () => {
    expect(
      buildPlan([task("X", null, 1, "2026-01-05", 1), task("Y", null, 2, "2026-01-05", 1)], [dep("X", "Y"), dep("Y", "X")], [], cal).cycle,
    ).toBe(true);
  });
});
