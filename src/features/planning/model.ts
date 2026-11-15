/** Builds the planner view model from rows: tree, roll-ups, critical path. Pure. */
import {
  criticalPath,
  finishDate,
  makeCalendar,
  rollUp,
  wbsCodes,
  workingDaysBetween,
  type Calendar,
  type SchedResult,
} from "@/lib/calc/schedule";
import type { BaselineTask, Task, TaskDependency } from "./api";

export type PlanRow = {
  task: Task;
  depth: number;
  isSummary: boolean;
  wbs: string;
  start: string;
  finish: string;
  duration: number;
  progress: number;
  cpm: SchedResult | null;
  baseline: { start: string; finish: string } | null;
  childIds: string[];
};

export function defaultWorkingDays(country: "DJ" | "ET"): number[] {
  return country === "ET" ? [1, 2, 3, 4, 5, 6] : [6, 7, 1, 2, 3, 4];
}

export function buildCalendar(
  workingDays: readonly number[] | null | undefined,
  holidays: readonly string[],
  country: "DJ" | "ET",
): Calendar {
  return makeCalendar(workingDays?.length ? workingDays : defaultWorkingDays(country), holidays);
}

export function buildPlan(
  tasks: readonly Task[],
  deps: readonly TaskDependency[],
  baseline: readonly BaselineTask[],
  cal: Calendar,
  progressOverride: ReadonlyMap<string, number> = new Map(),
) {
  const children = new Map<string | null, Task[]>();
  for (const t of tasks) (children.get(t.parent_id) ?? children.set(t.parent_id, []).get(t.parent_id))?.push(t);
  for (const list of children.values()) list.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  const isSummary = (id: string) => (children.get(id)?.length ?? 0) > 0;

  const leaves = tasks.filter((t) => !isSummary(t.id));
  const leafIds = new Set(leaves.map((t) => t.id));
  let cpm = new Map<string, SchedResult>();
  let cycle = false;
  try {
    cpm = criticalPath(
      leaves.map((t) => ({ id: t.id, start: t.start_date, duration: t.duration })),
      deps
        .filter((d) => leafIds.has(d.predecessor_id) && leafIds.has(d.successor_id))
        .map((d) => ({ predecessorId: d.predecessor_id, successorId: d.successor_id, type: d.type, lag: d.lag_days })),
      cal,
    );
  } catch {
    cycle = true;
  }

  const base = new Map(baseline.map((b) => [b.task_id, { start: b.start_date, finish: b.end_date }]));
  const wbs = wbsCodes(tasks.map((t) => ({ id: t.id, parentId: t.parent_id, position: t.position })));
  const rows = new Map<string, PlanRow>();

  const visit = (t: Task, depth: number): PlanRow => {
    const kids = (children.get(t.id) ?? []).map((c) => visit(c, depth + 1));
    let start = t.start_date;
    let finish = t.end_date;
    let duration = t.duration;
    let progress = progressOverride.get(t.id) ?? Number(t.progress);
    if (kids.length) {
      const r = rollUp(kids.map((k) => ({ start: k.start, finish: k.finish, duration: k.duration, progress: k.progress })));
      if (r) {
        start = r.start;
        finish = r.finish;
        progress = r.progress;
        duration = workingDaysBetween(start, finish, cal);
      }
    }
    const row: PlanRow = {
      task: t,
      depth,
      isSummary: kids.length > 0,
      wbs: wbs.get(t.id) ?? "",
      start,
      finish,
      duration,
      progress,
      cpm: cpm.get(t.id) ?? null,
      baseline: base.get(t.id) ?? null,
      childIds: kids.map((k) => k.task.id),
    };
    rows.set(t.id, row);
    return row;
  };
  for (const t of children.get(null) ?? []) visit(t, 0);

  // Display order: depth-first.
  const order: string[] = [];
  const walk = (parent: string | null) => {
    for (const t of children.get(parent) ?? []) {
      order.push(t.id);
      walk(t.id);
    }
  };
  walk(null);
  return { rows, order, cycle };
}

/** Rows to persist after scheduling: leaves take CPM dates, summaries take roll-ups, all take WBS. */
export function scheduleChanges(plan: ReturnType<typeof buildPlan>, autoSchedule: boolean, cal: Calendar) {
  const out: { id: string; start_date: string; end_date: string; duration: number; wbs_code: string }[] = [];
  for (const id of plan.order) {
    const r = plan.rows.get(id);
    if (!r) continue;
    let start = r.start;
    let finish = r.finish;
    if (!r.isSummary && autoSchedule && r.cpm) {
      start = r.cpm.start;
      finish = r.cpm.finish;
    } else if (!r.isSummary) {
      finish = finishDate(start, r.duration, cal);
    }
    const t = r.task;
    if (t.start_date !== start || t.end_date !== finish || t.duration !== r.duration || t.wbs_code !== r.wbs) {
      out.push({ id, start_date: start, end_date: finish, duration: r.duration, wbs_code: r.wbs });
    }
  }
  return out;
}
