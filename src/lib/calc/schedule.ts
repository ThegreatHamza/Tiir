/**
 * Scheduling — pure functions, unit tested.
 * Dates are ISO "YYYY-MM-DD" strings (no time zone). Durations are in
 * working days of a calendar. A task with duration d that starts on a working
 * day S finishes on the d-th working day counting S (milestone: d = 0, finish = start).
 *
 * Critical path: forward and backward pass over working-day offsets, with
 * FS / SS / FF / SF links and lags (in working days, may be negative).
 */
export type Calendar = { workingDays: ReadonlySet<number>; holidays: ReadonlySet<string> };

export function makeCalendar(workingDays: readonly number[], holidays: readonly string[] = []): Calendar {
  return { workingDays: new Set(workingDays), holidays: new Set(holidays) };
}

const DAY = 86_400_000;
export const toUtc = (iso: string): number => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
export const fromUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => fromUtc(toUtc(iso) + n * DAY);
export const diffDays = (a: string, b: string): number => Math.round((toUtc(b) - toUtc(a)) / DAY);
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const isoWeekday = (iso: string): number => ((new Date(toUtc(iso)).getUTCDay() + 6) % 7) + 1;

export function isWorkingDay(iso: string, cal: Calendar): boolean {
  return cal.workingDays.has(isoWeekday(iso)) && !cal.holidays.has(iso);
}

function assertCalendar(cal: Calendar) {
  if (cal.workingDays.size === 0) throw new RangeError("calendar has no working day");
}

/** Same day if working, otherwise the next working day. */
export function nextWorkingDay(iso: string, cal: Calendar): string {
  assertCalendar(cal);
  let d = iso;
  for (let i = 0; i < 3660 && !isWorkingDay(d, cal); i++) d = addDays(d, 1);
  return d;
}

export function previousWorkingDay(iso: string, cal: Calendar): string {
  assertCalendar(cal);
  let d = iso;
  for (let i = 0; i < 3660 && !isWorkingDay(d, cal); i++) d = addDays(d, -1);
  return d;
}

/** Moves by n working days (n may be negative). */
export function shiftWorkingDays(iso: string, n: number, cal: Calendar): string {
  assertCalendar(cal);
  let d = iso;
  const step = n >= 0 ? 1 : -1;
  let left = Math.abs(n);
  while (left > 0) {
    d = addDays(d, step);
    if (isWorkingDay(d, cal)) left--;
  }
  return d;
}

/** Finish date of a task starting on `start` lasting `duration` working days. */
export function finishDate(start: string, duration: number, cal: Calendar): string {
  const s = nextWorkingDay(start, cal);
  return duration <= 0 ? s : shiftWorkingDays(s, duration - 1, cal);
}

/** Working days from a to b, both included (0 if b < a). */
export function workingDaysBetween(a: string, b: string, cal: Calendar): number {
  if (b < a) return 0;
  let n = 0;
  for (let d = a; d <= b; d = addDays(d, 1)) if (isWorkingDay(d, cal)) n++;
  return n;
}

/** Signed working-day difference: positive when `actual` is later than `planned`. */
export function workingDayVariance(planned: string, actual: string, cal: Calendar): number {
  if (actual === planned) return 0;
  return actual > planned ? workingDaysBetween(addDays(planned, 1), actual, cal) : -workingDaysBetween(addDays(actual, 1), planned, cal);
}

// ---------------------------------------------------------------------------
// Critical path
// ---------------------------------------------------------------------------
export type DependencyType = "FS" | "SS" | "FF" | "SF";
export type SchedTask = { id: string; start: string; duration: number };
export type SchedLink = { predecessorId: string; successorId: string; type: DependencyType; lag: number };

export type SchedResult = {
  id: string;
  start: string;
  finish: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  critical: boolean;
};

export class ScheduleCycleError extends Error {
  constructor(public taskIds: string[]) {
    super("dependency cycle");
  }
}

/** Kahn topological order; throws ScheduleCycleError on a cycle. */
export function topologicalOrder(ids: readonly string[], links: readonly SchedLink[]): string[] {
  const indeg = new Map(ids.map((id) => [id, 0]));
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const l of links) {
    if (!indeg.has(l.predecessorId) || !indeg.has(l.successorId)) continue;
    indeg.set(l.successorId, (indeg.get(l.successorId) ?? 0) + 1);
    out.get(l.predecessorId)?.push(l.successorId);
  }
  const queue = ids.filter((id) => indeg.get(id) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    for (const s of out.get(id) ?? []) {
      indeg.set(s, (indeg.get(s) ?? 0) - 1);
      if (indeg.get(s) === 0) queue.push(s);
    }
  }
  if (order.length !== ids.length) throw new ScheduleCycleError(ids.filter((id) => !order.includes(id)));
  return order;
}

/**
 * Forward and backward pass.
 * - Tasks without predecessors keep their own start (moved to a working day).
 * - Tasks with predecessors start as early as their links allow (ASAP).
 * Offsets are working days from the project start; finish offsets are exclusive.
 */
export function criticalPath(tasks: readonly SchedTask[], links: readonly SchedLink[], cal: Calendar): Map<string, SchedResult> {
  const result = new Map<string, SchedResult>();
  if (tasks.length === 0) return result;
  assertCalendar(cal);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const valid = links.filter((l) => byId.has(l.predecessorId) && byId.has(l.successorId));
  const order = topologicalOrder(
    tasks.map((t) => t.id),
    valid,
  );

  const origin = nextWorkingDay(
    tasks.map((t) => t.start).reduce((a, b) => (a < b ? a : b)),
    cal,
  );
  const offsetOf = (iso: string) => {
    const d = nextWorkingDay(iso, cal);
    return d <= origin ? 0 : workingDaysBetween(origin, d, cal) - 1;
  };
  const dateAt = (offset: number) => shiftWorkingDays(origin, offset, cal);

  const preds = new Map<string, SchedLink[]>();
  const succs = new Map<string, SchedLink[]>();
  for (const l of valid) {
    (preds.get(l.successorId) ?? preds.set(l.successorId, []).get(l.successorId))?.push(l);
    (succs.get(l.predecessorId) ?? succs.set(l.predecessorId, []).get(l.predecessorId))?.push(l);
  }

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const t = byId.get(id) as SchedTask;
    const d = Math.max(0, t.duration);
    const incoming = preds.get(id) ?? [];
    let start = incoming.length ? Number.NEGATIVE_INFINITY : offsetOf(t.start);
    for (const l of incoming) {
      const pES = es.get(l.predecessorId) as number;
      const pEF = ef.get(l.predecessorId) as number;
      const bound = l.type === "FS" ? pEF + l.lag : l.type === "SS" ? pES + l.lag : l.type === "FF" ? pEF + l.lag - d : pES + l.lag - d;
      start = Math.max(start, bound);
    }
    start = Math.max(0, start);
    es.set(id, start);
    ef.set(id, start + d);
  }

  const projectFinish = Math.max(...[...ef.values()]);
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const d = Math.max(0, (byId.get(id) as SchedTask).duration);
    const outgoing = succs.get(id) ?? [];
    let finish = outgoing.length ? Number.POSITIVE_INFINITY : projectFinish;
    for (const l of outgoing) {
      const sLS = ls.get(l.successorId) as number;
      const sLF = lf.get(l.successorId) as number;
      const bound = l.type === "FS" ? sLS - l.lag : l.type === "SS" ? sLS - l.lag + d : l.type === "FF" ? sLF - l.lag : sLF - l.lag + d;
      finish = Math.min(finish, bound);
    }
    lf.set(id, finish);
    ls.set(id, finish - d);
  }

  for (const t of tasks) {
    const d = Math.max(0, t.duration);
    const e = es.get(t.id) as number;
    const totalFloat = (ls.get(t.id) as number) - e;
    const start = dateAt(e);
    result.set(t.id, {
      id: t.id,
      start,
      finish: d === 0 ? start : dateAt(e + d - 1),
      earlyStart: e,
      earlyFinish: e + d,
      lateStart: ls.get(t.id) as number,
      lateFinish: lf.get(t.id) as number,
      totalFloat,
      critical: totalFloat <= 0,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Progress and variance
// ---------------------------------------------------------------------------

/** Planned % complete on a date, linear over working days. */
export function plannedPercent(start: string, finish: string, on: string, cal: Calendar): number {
  if (on < start) return 0;
  if (on >= finish) return 100;
  const total = workingDaysBetween(start, finish, cal);
  if (total === 0) return 100;
  return Math.round((workingDaysBetween(start, on, cal) / total) * 10000) / 100;
}

/** Roll-up of children into a summary task: span of dates, progress weighted by duration. */
export function rollUp(
  children: readonly { start: string; finish: string; duration: number; progress: number }[],
): { start: string; finish: string; progress: number } | null {
  if (children.length === 0) return null;
  const start = children.map((c) => c.start).reduce((a, b) => (a < b ? a : b));
  const finish = children.map((c) => c.finish).reduce((a, b) => (a > b ? a : b));
  const weight = children.reduce((s, c) => s + Math.max(1, c.duration), 0);
  const progress = children.reduce((s, c) => s + c.progress * Math.max(1, c.duration), 0) / weight;
  return { start, finish, progress: Math.round(progress * 100) / 100 };
}

export type DelayStatus = "ahead" | "on_time" | "late" | "not_started_late";

/** Delay status of a task on a date, from its baseline and progress. */
export function delayStatus(
  t: { start: string; finish: string; progress: number },
  baseline: { start: string; finish: string } | null,
  today: string,
  cal: Calendar,
): { finishVariance: number; planned: number; status: DelayStatus } {
  const finishVariance = baseline ? workingDayVariance(baseline.finish, t.finish, cal) : 0;
  const planned = plannedPercent(baseline?.start ?? t.start, baseline?.finish ?? t.finish, today, cal);
  let status: DelayStatus = "on_time";
  if (t.progress < 100 && planned > 0 && t.progress === 0 && (baseline?.start ?? t.start) < today) status = "not_started_late";
  else if (finishVariance > 0 || t.progress + 0.001 < planned - 10) status = "late";
  else if (finishVariance < 0 || t.progress > planned + 10) status = "ahead";
  return { finishVariance, planned, status };
}

/** WBS codes from a tree order: 1, 1.1, 1.2, 2 … */
export function wbsCodes(nodes: readonly { id: string; parentId: string | null; position: number }[]): Map<string, string> {
  const children = new Map<string | null, { id: string; position: number }[]>();
  for (const n of nodes) (children.get(n.parentId) ?? children.set(n.parentId, []).get(n.parentId))?.push(n);
  const out = new Map<string, string>();
  const walk = (parent: string | null, prefix: string) => {
    const list = (children.get(parent) ?? []).slice().sort((a, b) => a.position - b.position);
    list.forEach((n, i) => {
      const code = prefix ? `${prefix}.${i + 1}` : String(i + 1);
      out.set(n.id, code);
      walk(n.id, code);
    });
  };
  walk(null, "");
  return out;
}
