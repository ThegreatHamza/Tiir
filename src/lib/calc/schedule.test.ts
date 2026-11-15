import { describe, expect, it } from "vitest";
import {
  criticalPath,
  delayStatus,
  finishDate,
  isWorkingDay,
  isoWeekday,
  makeCalendar,
  nextWorkingDay,
  plannedPercent,
  rollUp,
  ScheduleCycleError,
  shiftWorkingDays,
  topologicalOrder,
  wbsCodes,
  workingDaysBetween,
  workingDayVariance,
} from "./schedule";

// Djibouti default: Saturday–Thursday, Friday off. 2026-01-01 is a Thursday.
const dj = makeCalendar([6, 7, 1, 2, 3, 4], ["2026-01-04"]);
const monFri = makeCalendar([1, 2, 3, 4, 5]);

describe("calendar", () => {
  it("knows weekdays and holidays", () => {
    expect(isoWeekday("2026-01-01")).toBe(4);
    expect(isWorkingDay("2026-01-02", dj)).toBe(false); // Friday
    expect(isWorkingDay("2026-01-04", dj)).toBe(false); // holiday
    expect(isWorkingDay("2026-01-03", dj)).toBe(true); // Saturday
    expect(nextWorkingDay("2026-01-02", dj)).toBe("2026-01-03");
  });
  it("counts and shifts working days", () => {
    expect(workingDaysBetween("2026-01-01", "2026-01-07", dj)).toBe(5); // Thu, Sat, Mon, Tue, Wed
    expect(shiftWorkingDays("2026-01-01", 2, dj)).toBe("2026-01-05");
    expect(shiftWorkingDays("2026-01-05", -2, dj)).toBe("2026-01-01");
    expect(finishDate("2026-01-01", 3, dj)).toBe("2026-01-05");
    expect(finishDate("2026-01-02", 0, dj)).toBe("2026-01-03");
    expect(() => nextWorkingDay("2026-01-01", makeCalendar([]))).toThrow(RangeError);
  });
  it("signs the variance", () => {
    expect(workingDayVariance("2026-01-05", "2026-01-07", monFri)).toBe(2);
    expect(workingDayVariance("2026-01-07", "2026-01-05", monFri)).toBe(-2);
    expect(workingDayVariance("2026-01-09", "2026-01-12", monFri)).toBe(1); // over a weekend
  });
});

describe("criticalPath", () => {
  // A(3) → B(2) → D(1); A → C(1) → D. Mon–Fri, start Monday 2026-01-05.
  const tasks = [
    { id: "A", start: "2026-01-05", duration: 3 },
    { id: "B", start: "2026-01-05", duration: 2 },
    { id: "C", start: "2026-01-05", duration: 1 },
    { id: "D", start: "2026-01-05", duration: 1 },
  ];
  const links = [
    { predecessorId: "A", successorId: "B", type: "FS" as const, lag: 0 },
    { predecessorId: "A", successorId: "C", type: "FS" as const, lag: 0 },
    { predecessorId: "B", successorId: "D", type: "FS" as const, lag: 0 },
    { predecessorId: "C", successorId: "D", type: "FS" as const, lag: 0 },
  ];
  it("computes dates, float and the critical path", () => {
    const r = criticalPath(tasks, links, monFri);
    expect(r.get("A")).toMatchObject({ start: "2026-01-05", finish: "2026-01-07", totalFloat: 0, critical: true });
    expect(r.get("B")).toMatchObject({ start: "2026-01-08", finish: "2026-01-09", critical: true });
    expect(r.get("C")).toMatchObject({ start: "2026-01-08", finish: "2026-01-08", totalFloat: 1, critical: false });
    expect(r.get("D")).toMatchObject({ start: "2026-01-12", finish: "2026-01-12", critical: true }); // after the weekend
  });
  it("applies lags and link types", () => {
    const r = criticalPath(
      [
        { id: "A", start: "2026-01-05", duration: 5 },
        { id: "B", start: "2026-01-05", duration: 3 },
        { id: "C", start: "2026-01-05", duration: 2 },
        { id: "M", start: "2026-01-05", duration: 0 },
      ],
      [
        { predecessorId: "A", successorId: "B", type: "SS", lag: 2 },
        { predecessorId: "A", successorId: "C", type: "FF", lag: 1 },
        { predecessorId: "B", successorId: "M", type: "FS", lag: -1 },
      ],
      monFri,
    );
    expect(r.get("B")?.start).toBe("2026-01-07"); // A start + 2
    expect(r.get("C")?.finish).toBe("2026-01-12"); // A finish (9th) + 1 working day
    expect(r.get("M")?.start).toBe("2026-01-09"); // B ends on the 9th; FS lag -1 → on B's last day
    expect(r.get("M")?.finish).toBe(r.get("M")?.start);
  });
  it("keeps the start of unlinked tasks", () => {
    const r = criticalPath([{ id: "X", start: "2026-01-10", duration: 2 }], [], monFri);
    expect(r.get("X")).toMatchObject({ start: "2026-01-12", finish: "2026-01-13" });
  });
  it("detects cycles", () => {
    expect(() =>
      topologicalOrder(
        ["A", "B"],
        [
          { predecessorId: "A", successorId: "B", type: "FS", lag: 0 },
          { predecessorId: "B", successorId: "A", type: "FS", lag: 0 },
        ],
      ),
    ).toThrow(ScheduleCycleError);
  });
});

describe("progress and variance", () => {
  it("planned percent is linear over working days", () => {
    expect(plannedPercent("2026-01-05", "2026-01-09", "2026-01-04", monFri)).toBe(0);
    expect(plannedPercent("2026-01-05", "2026-01-09", "2026-01-06", monFri)).toBe(40);
    expect(plannedPercent("2026-01-05", "2026-01-09", "2026-01-09", monFri)).toBe(100);
  });
  it("rolls children up to a summary task", () => {
    expect(
      rollUp([
        { start: "2026-01-05", finish: "2026-01-09", duration: 5, progress: 100 },
        { start: "2026-01-12", finish: "2026-01-16", duration: 15, progress: 0 },
      ]),
    ).toEqual({ start: "2026-01-05", finish: "2026-01-16", progress: 25 });
    expect(rollUp([])).toBeNull();
  });
  it("classifies delays", () => {
    const base = { start: "2026-01-05", finish: "2026-01-09" };
    expect(delayStatus({ start: "2026-01-05", finish: "2026-01-13", progress: 50 }, base, "2026-01-07", monFri)).toMatchObject({
      finishVariance: 2,
      status: "late",
    });
    expect(delayStatus({ start: "2026-01-05", finish: "2026-01-09", progress: 0 }, base, "2026-01-07", monFri).status).toBe(
      "not_started_late",
    );
    expect(delayStatus({ start: "2026-01-05", finish: "2026-01-08", progress: 90 }, base, "2026-01-07", monFri).status).toBe("ahead");
    expect(delayStatus({ start: "2026-01-05", finish: "2026-01-09", progress: 60 }, base, "2026-01-07", monFri).status).toBe("on_time");
  });
  it("numbers the WBS", () => {
    const codes = wbsCodes([
      { id: "a", parentId: null, position: 2 },
      { id: "b", parentId: null, position: 1 },
      { id: "c", parentId: "a", position: 1 },
      { id: "d", parentId: "a", position: 2 },
    ]);
    expect(Object.fromEntries(codes)).toEqual({ b: "1", a: "2", c: "2.1", d: "2.2" });
  });
});
