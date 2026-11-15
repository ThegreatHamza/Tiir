import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Diamond, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addDays,
  diffDays,
  finishDate,
  isWorkingDay,
  nextWorkingDay,
  previousWorkingDay,
  workingDaysBetween,
  type Calendar,
} from "@/lib/calc/schedule";
import { formatDate, formatNumber, localeFor, type AppLanguage } from "@/lib/format";
import { EditableCell } from "@/features/estimating/EditableCell";
import type { TaskDependency } from "./api";
import type { PlanRow } from "./model";

export type Zoom = "day" | "week" | "month";
const PX: Record<Zoom, number> = { day: 30, week: 11, month: 3.2 };
const ROW = 36;
const GRID_W = 520;

export type GanttEdit =
  | { kind: "move"; id: string; start: string; finish: string }
  | { kind: "resize"; id: string; finish: string; duration: number }
  | { kind: "link"; from: string; to: string }
  | { kind: "rename"; id: string; name: string }
  | { kind: "duration"; id: string; duration: number }
  | { kind: "progress"; id: string; progress: number }
  | { kind: "start"; id: string; start: string };

type Drag = { id: string; mode: "move" | "resize"; startX: number; deltaDays: number } | null;
type Link = { from: string; x: number; y: number; x0: number; y0: number } | null;

export function Gantt({
  rows,
  order,
  deps,
  cal,
  zoom,
  readOnly,
  showBaseline,
  collapsed,
  onToggle,
  selectedId,
  onSelect,
  onOpen,
  onAddChild,
  onEdit,
  lang,
}: {
  rows: Map<string, PlanRow>;
  order: string[];
  deps: TaskDependency[];
  cal: Calendar;
  zoom: Zoom;
  readOnly: boolean;
  showBaseline: boolean;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAddChild: (id: string) => void;
  onEdit: (e: GanttEdit) => void;
  lang: AppLanguage;
}) {
  const { t } = useTranslation();
  const px = PX[zoom];
  const [drag, setDrag] = React.useState<Drag>(null);
  const [link, setLink] = React.useState<Link>(null);
  const timelineRef = React.useRef<HTMLDivElement>(null);

  // Visible rows (collapsed parents hide their subtree).
  const visible = React.useMemo(() => {
    const hidden = new Set<string>();
    const out: PlanRow[] = [];
    for (const id of order) {
      const r = rows.get(id);
      if (!r) continue;
      if (r.task.parent_id && (hidden.has(r.task.parent_id) || collapsed.has(r.task.parent_id))) {
        hidden.add(id);
        continue;
      }
      out.push(r);
    }
    return out;
  }, [rows, order, collapsed]);

  const today = new Date().toISOString().slice(0, 10);
  const all = [...rows.values()];
  const minDate = all.length
    ? all.map((r) => (r.baseline && r.baseline.start < r.start ? r.baseline.start : r.start)).reduce((a, b) => (a < b ? a : b))
    : today;
  const maxDate = all.length
    ? all.map((r) => (r.baseline && r.baseline.finish > r.finish ? r.baseline.finish : r.finish)).reduce((a, b) => (a > b ? a : b))
    : addDays(today, 30);
  const rangeStart = addDays(minDate < today ? minDate : today, zoom === "month" ? -15 : -4);
  const rangeDays = Math.max(30, diffDays(rangeStart, maxDate) + (zoom === "month" ? 45 : 14));
  const width = rangeDays * px;
  const x = (iso: string) => diffDays(rangeStart, iso) * px;
  const indexOf = new Map(visible.map((r, i) => [r.task.id, i]));

  // Header ticks.
  const months: { label: string; left: number; width: number }[] = [];
  const minor: { label: string; left: number; width: number; off: boolean }[] = [];
  const monthFmt = new Intl.DateTimeFormat(localeFor(lang), {
    month: zoom === "month" ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
  for (let i = 0; i < rangeDays; i++) {
    const d = addDays(rangeStart, i);
    if (i === 0 || d.endsWith("-01")) months.push({ label: monthFmt.format(new Date(`${d}T00:00:00Z`)), left: i * px, width: 0 });
    if (zoom === "day") minor.push({ label: d.slice(8, 10), left: i * px, width: px, off: !isWorkingDay(d, cal) });
    else if (zoom === "week" && new Date(`${d}T00:00:00Z`).getUTCDay() === 1)
      minor.push({ label: formatDate(d).slice(0, 5), left: i * px, width: 7 * px, off: false });
  }
  months.forEach((m, i) => (m.width = (months[i + 1]?.left ?? width) - m.left));

  function onPointerDownBar(e: React.PointerEvent, id: string, mode: "move" | "resize") {
    if (readOnly) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ id, mode, startX: e.clientX, deltaDays: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag) setDrag({ ...drag, deltaDays: Math.round((e.clientX - drag.startX) / px) });
    if (link && timelineRef.current) {
      const box = timelineRef.current.getBoundingClientRect();
      setLink({ ...link, x: e.clientX - box.left, y: e.clientY - box.top });
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    if (drag) {
      const r = rows.get(drag.id);
      if (r && drag.deltaDays !== 0) {
        if (drag.mode === "move") {
          const start = nextWorkingDay(addDays(r.start, drag.deltaDays), cal);
          onEdit({ kind: "move", id: drag.id, start, finish: finishDate(start, r.duration, cal) });
        } else {
          const finish = previousWorkingDay(addDays(r.finish, drag.deltaDays), cal);
          const duration = Math.max(1, workingDaysBetween(r.start, finish < r.start ? r.start : finish, cal));
          onEdit({ kind: "resize", id: drag.id, finish: finishDate(r.start, duration, cal), duration });
        }
      }
      setDrag(null);
    }
    if (link) {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-task-bar]")?.getAttribute("data-task-bar");
      if (target && target !== link.from) onEdit({ kind: "link", from: link.from, to: target });
      setLink(null);
    }
  }

  const barGeom = (r: PlanRow) => {
    let start = r.start;
    let finish = r.finish;
    if (drag && drag.id === r.task.id) {
      if (drag.mode === "move") {
        start = addDays(start, drag.deltaDays);
        finish = addDays(finish, drag.deltaDays);
      } else finish = addDays(finish, drag.deltaDays) < start ? start : addDays(finish, drag.deltaDays);
    }
    return { left: x(start), w: (diffDays(start, finish) + 1) * px };
  };

  return (
    <div
      className="relative max-h-[70vh] overflow-auto rounded-lg border bg-card"
      dir="ltr"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="flex" style={{ width: GRID_W + width }}>
        {/* Grid (sticky on the left) */}
        <div className="sticky left-0 z-20 shrink-0 border-e bg-card" style={{ width: GRID_W }} dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="sticky top-0 z-10 grid h-12 grid-cols-[52px_1fr_78px_78px_44px_48px] items-end border-b bg-muted/80 px-1 pb-1 text-[11px] font-semibold uppercase text-muted-foreground backdrop-blur">
            <span>{t("planning.wbs")}</span>
            <span>{t("planning.task")}</span>
            <span>{t("common.startDate")}</span>
            <span>{t("common.endDate")}</span>
            <span className="text-end">{t("planning.durationShort")}</span>
            <span className="text-end">%</span>
          </div>
          {visible.map((r) => (
            <div
              key={r.task.id}
              className={cn(
                "grid grid-cols-[52px_1fr_78px_78px_44px_48px] items-center border-b px-1 text-sm",
                selectedId === r.task.id && "bg-accent/15",
                r.cpm?.critical && !r.isSummary && "text-destructive",
              )}
              style={{ height: ROW }}
              onClick={() => onSelect(r.task.id)}
              onDoubleClick={() => onOpen(r.task.id)}
            >
              <span className="font-mono text-[11px] text-muted-foreground">{r.wbs}</span>
              <div className="flex min-w-0 items-center gap-1" style={{ paddingInlineStart: r.depth * 14 }}>
                {r.isSummary ? (
                  <button
                    type="button"
                    onClick={() => onToggle(r.task.id)}
                    className="rounded p-0.5 hover:bg-muted"
                    aria-label={collapsed.has(r.task.id) ? t("estimating.boq.expand") : t("estimating.boq.collapse")}
                    aria-expanded={!collapsed.has(r.task.id)}
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", collapsed.has(r.task.id) && "-rotate-90")} />
                  </button>
                ) : r.duration === 0 ? (
                  <Diamond className="size-3 shrink-0 text-accent" aria-label={t("planning.milestone")} />
                ) : (
                  <span className="w-4" />
                )}
                <div className={cn("min-w-0 flex-1 truncate", r.isSummary && "font-semibold")}>
                  <EditableCell
                    value={r.task.name}
                    label={t("planning.task")}
                    readOnly={readOnly}
                    allowEmpty={false}
                    onCommit={(v) => onEdit({ kind: "rename", id: r.task.id, name: String(v) })}
                    className="truncate py-0.5"
                  />
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => onAddChild(r.task.id)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 [div:hover>&]:opacity-100"
                    aria-label={t("planning.addSubtask")}
                  >
                    <Plus className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <span className="text-xs num">
                {r.isSummary || readOnly ? (
                  formatDate(r.start)
                ) : (
                  <EditableCell
                    value={formatDate(r.start)}
                    label={t("common.startDate")}
                    onCommit={(v) => {
                      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v ?? "").trim());
                      if (m) onEdit({ kind: "start", id: r.task.id, start: `${m[3]}-${m[2]?.padStart(2, "0")}-${m[1]?.padStart(2, "0")}` });
                    }}
                    className="px-0.5 py-0.5 text-xs"
                  />
                )}
              </span>
              <span className="text-xs num">{formatDate(r.finish)}</span>
              <span className="text-end text-xs">
                {r.isSummary || readOnly ? (
                  r.duration
                ) : (
                  <EditableCell
                    type="number"
                    value={r.duration}
                    label={t("planning.duration")}
                    allowEmpty={false}
                    onCommit={(v) => onEdit({ kind: "duration", id: r.task.id, duration: Math.max(0, Math.round(Number(v))) })}
                    className="px-0.5 py-0.5 text-xs"
                  />
                )}
              </span>
              <span className="text-end text-xs">
                {r.isSummary || readOnly || r.task.progress_source === "boq" ? (
                  formatNumber(r.progress, lang, 0)
                ) : (
                  <EditableCell
                    type="number"
                    value={r.progress}
                    display={formatNumber(r.progress, lang, 0)}
                    label={t("planning.progress")}
                    allowEmpty={false}
                    onCommit={(v) => onEdit({ kind: "progress", id: r.task.id, progress: Math.min(100, Math.max(0, Number(v))) })}
                    className="px-0.5 py-0.5 text-xs"
                  />
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="relative shrink-0" style={{ width }}>
          <div className="sticky top-0 z-10 h-12 border-b bg-muted/80 backdrop-blur">
            {months.map((m) => (
              <div
                key={m.left}
                className="absolute top-0 h-6 truncate border-s px-1 text-xs font-semibold leading-6"
                style={{ left: m.left, width: m.width }}
              >
                {m.label}
              </div>
            ))}
            {minor.map((m) => (
              <div
                key={m.left}
                className={cn("absolute top-6 h-6 border-s text-center text-[10px] leading-6 text-muted-foreground", m.off && "bg-muted")}
                style={{ left: m.left, width: m.width }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="relative" style={{ height: visible.length * ROW }}>
            {zoom !== "month"
              ? Array.from({ length: rangeDays }, (_, i) => addDays(rangeStart, i))
                  .filter((d) => !isWorkingDay(d, cal))
                  .map((d) => <div key={d} className="absolute top-0 h-full bg-muted/50" style={{ left: x(d), width: px }} aria-hidden />)
              : null}
            <div
              className="absolute top-0 h-full w-px bg-accent"
              style={{ left: x(today) + px / 2 }}
              title={t("planning.today")}
              aria-hidden
            />
            {visible.map((r, i) => {
              const { left, w } = barGeom(r);
              const top = i * ROW;
              const critical = r.cpm?.critical && !r.isSummary;
              return (
                <div key={r.task.id} className="absolute inset-x-0 border-b border-border/40" style={{ top, height: ROW }}>
                  {showBaseline && r.baseline ? (
                    <div
                      className="absolute h-1.5 rounded-full bg-muted-foreground/40"
                      style={{ left: x(r.baseline.start), width: (diffDays(r.baseline.start, r.baseline.finish) + 1) * px, top: ROW - 9 }}
                      title={t("planning.baseline")}
                    />
                  ) : null}
                  {r.duration === 0 && !r.isSummary ? (
                    <div
                      data-task-bar={r.task.id}
                      className="absolute size-3.5 rotate-45 cursor-grab bg-accent"
                      style={{ left: left + px / 2 - 7, top: ROW / 2 - 7 }}
                      onPointerDown={(e) => onPointerDownBar(e, r.task.id, "move")}
                      onDoubleClick={() => onOpen(r.task.id)}
                      title={`${r.task.name} — ${formatDate(r.start)}`}
                    />
                  ) : r.isSummary ? (
                    <div
                      data-task-bar={r.task.id}
                      className="absolute h-2 bg-foreground/80"
                      style={{
                        left,
                        width: w,
                        top: ROW / 2 - 4,
                        clipPath: "polygon(0 0,100% 0,100% 100%,calc(100% - 5px) 60%,5px 60%,0 100%)",
                      }}
                      title={r.task.name}
                    />
                  ) : (
                    <div
                      data-task-bar={r.task.id}
                      className={cn(
                        "group absolute flex h-5 cursor-grab items-center overflow-visible rounded text-[10px] text-white shadow-sm active:cursor-grabbing",
                        critical ? "bg-destructive" : "bg-primary",
                        selectedId === r.task.id && "ring-2 ring-ring",
                      )}
                      style={{ left, width: Math.max(w, 4), top: ROW / 2 - 10 }}
                      onPointerDown={(e) => onPointerDownBar(e, r.task.id, "move")}
                      onDoubleClick={() => onOpen(r.task.id)}
                      title={`${r.task.name}: ${formatDate(r.start)} → ${formatDate(r.finish)} · ${r.progress} %${r.cpm ? ` · ${t("planning.float")} ${r.cpm.totalFloat}` : ""}`}
                    >
                      <div className="absolute inset-y-0 left-0 rounded bg-black/25" style={{ width: `${Math.min(100, r.progress)}%` }} />
                      {zoom !== "month" && w > 60 ? <span className="relative truncate px-1.5">{r.task.name}</span> : null}
                      {!readOnly ? (
                        <>
                          <div
                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                            onPointerDown={(e) => onPointerDownBar(e, r.task.id, "resize")}
                            aria-hidden
                          />
                          <button
                            type="button"
                            className="absolute -right-4 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-primary bg-card opacity-0 group-hover:opacity-100"
                            aria-label={t("planning.linkFrom", { name: r.task.name })}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              const box = timelineRef.current?.getBoundingClientRect();
                              if (!box) return;
                              const x0 = left + w + 4;
                              const y0 = top + ROW / 2;
                              setLink({ from: r.task.id, x0, y0, x: e.clientX - box.left, y: e.clientY - box.top });
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
            <svg className="pointer-events-none absolute inset-0" width={width} height={visible.length * ROW} aria-hidden>
              <defs>
                <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" className="fill-muted-foreground" />
                </marker>
              </defs>
              {deps.map((d) => {
                const a = rows.get(d.predecessor_id);
                const b = rows.get(d.successor_id);
                const ia = indexOf.get(d.predecessor_id);
                const ib = indexOf.get(d.successor_id);
                if (!a || !b || ia === undefined || ib === undefined) return null;
                const fromFinish = d.type === "FS" || d.type === "FF";
                const toStart = d.type === "FS" || d.type === "SS";
                const x1 = fromFinish ? x(a.finish) + px : x(a.start);
                const x2 = toStart ? x(b.start) : x(b.finish) + px;
                const y1 = ia * ROW + ROW / 2;
                const y2 = ib * ROW + ROW / 2;
                const mid = Math.max(x1 + 8, Math.min(x2 - 8, x1 + 8));
                const critical = a.cpm?.critical && b.cpm?.critical;
                return (
                  <path
                    key={d.id}
                    d={`M${x1},${y1} H${mid} V${y2} H${x2 - 1}`}
                    fill="none"
                    strokeWidth={1.3}
                    className={critical ? "stroke-destructive" : "stroke-muted-foreground"}
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              {link ? (
                <line
                  x1={link.x0}
                  y1={link.y0}
                  x2={link.x}
                  y2={link.y - 48}
                  className="stroke-ring"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              ) : null}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
