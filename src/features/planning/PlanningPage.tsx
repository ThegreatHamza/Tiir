import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  IndentDecrease,
  IndentIncrease,
  Loader2,
  Plus,
  Sparkles,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { finishDate, nextWorkingDay } from "@/lib/calc/schedule";
import { formatDate, formatNumber, todayIso } from "@/lib/format";
import { currentLanguage } from "@/i18n";
import { supabase } from "@/lib/supabase";
import {
  addDependency,
  createBaseline,
  fetchActiveBaseline,
  fetchDependencies,
  fetchProjectCalendar,
  fetchTasks,
  insertTask,
  saveSchedule,
  updateTask,
} from "./api";
import { buildCalendar, buildPlan, scheduleChanges } from "./model";
import { Gantt, type GanttEdit, type Zoom } from "./Gantt";
import { TaskDialog } from "./TaskDialog";
import { delayRows, exportDelayReport, exportScheduleExcel, exportSchedulePdf } from "./exports";

const DELAY_VARIANT: Record<string, BadgeProps["variant"]> = {
  ahead: "success",
  on_time: "secondary",
  late: "destructive",
  not_started_late: "warning",
};

export function usePlanningData(companyId: string, projectId: string) {
  const base = ["company", companyId, "planning", projectId] as const;
  const calendar = useQuery({ queryKey: [...base, "calendar"], queryFn: () => fetchProjectCalendar(companyId, projectId) });
  const tasks = useQuery({ queryKey: [...base, "tasks"], queryFn: () => fetchTasks(projectId) });
  const deps = useQuery({ queryKey: [...base, "deps"], queryFn: () => fetchDependencies(projectId) });
  const baseline = useQuery({ queryKey: [...base, "baseline"], queryFn: () => fetchActiveBaseline(projectId) });
  const progress = useQuery({
    queryKey: [...base, "boq-progress"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_progress").select("task_id, progress").eq("project_id", projectId);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.task_id ?? "", Number(r.progress ?? 0)]));
    },
  });
  return { base, calendar, tasks, deps, baseline, progress };
}

export function PlanningPage() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const qc = useQueryClient();
  const { company, companyId, role } = useCurrentCompany();
  const { project, projectId, currency } = useProject();
  const canEdit = role === "owner" || role === "admin" || role === "project_manager";
  const readOnly = !canEdit || Boolean(project.deleted_at);
  const data = usePlanningData(companyId, projectId);
  const [zoom, setZoom] = React.useState<Zoom>("week");
  const [auto, setAuto] = React.useState(true);
  const [showBaseline, setShowBaseline] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"gantt" | "delay">("gantt");
  const [busy, setBusy] = React.useState(false);

  const cal = React.useMemo(
    () => buildCalendar(data.calendar.data?.calendar?.working_days, data.calendar.data?.holidays ?? [], company.country),
    [data.calendar.data, company.country],
  );
  const boqProgress = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const tk of data.tasks.data ?? []) if (tk.progress_source === "boq") m.set(tk.id, data.progress.data?.get(tk.id) ?? 0);
    return m;
  }, [data.tasks.data, data.progress.data]);
  const plan = React.useMemo(
    () => buildPlan(data.tasks.data ?? [], data.deps.data ?? [], data.baseline.data?.tasks ?? [], cal, boqProgress),
    [data.tasks.data, data.deps.data, data.baseline.data, cal, boqProgress],
  );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: data.base });
  };

  /** After any change: re-read, recompute the schedule and save the dates that moved. */
  async function reschedule() {
    const [tasks, deps] = await Promise.all([fetchTasks(projectId), fetchDependencies(projectId)]);
    const next = buildPlan(tasks, deps, data.baseline.data?.tasks ?? [], cal, boqProgress);
    if (next.cycle) toast.error(t("planning.cycle"));
    const changes = scheduleChanges(next, auto, cal);
    if (changes.length) await saveSchedule(projectId, changes);
    // Summary dates depend on the saved children: one more pass.
    if (changes.length) {
      const again = buildPlan(await fetchTasks(projectId), deps, data.baseline.data?.tasks ?? [], cal, boqProgress);
      const more = scheduleChanges(again, auto, cal);
      if (more.length) await saveSchedule(projectId, more);
    }
    await refresh();
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await reschedule();
    } catch (e) {
      toast.error(errorMessage(t, e));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addTask(parentId: string | null) {
    const siblings = (data.tasks.data ?? []).filter((x) => x.parent_id === parentId);
    const parentRow = parentId ? plan.rows.get(parentId) : null;
    const start = nextWorkingDay(parentRow?.start ?? project.start_date ?? todayIso(company.timezone), cal);
    await run(async () => {
      const id = await insertTask({
        company_id: companyId,
        project_id: projectId,
        parent_id: parentId,
        name: t("planning.newTask"),
        start_date: start,
        end_date: finishDate(start, 5, cal),
        duration: 5,
        position: siblings.length + 1,
      });
      setSelected(id);
    });
  }

  async function indent(direction: "in" | "out") {
    if (!selected) return;
    const row = plan.rows.get(selected);
    if (!row) return;
    const parentId = row.task.parent_id;
    const siblings = plan.order.filter((id) => plan.rows.get(id)?.task.parent_id === parentId);
    if (direction === "in") {
      const idx = siblings.indexOf(selected);
      const newParent = siblings[idx - 1];
      if (!newParent) return;
      const kids = (data.tasks.data ?? []).filter((x) => x.parent_id === newParent).length;
      await run(() => updateTask(selected, { parent_id: newParent, position: kids + 1 }));
    } else {
      if (!parentId) return;
      const parent = plan.rows.get(parentId);
      await run(() =>
        updateTask(selected, {
          parent_id: parent?.task.parent_id ?? null,
          position: (parent?.task.position ?? 0) + 0.5 > 0 ? (parent?.task.position ?? 0) + 1 : 1,
        }),
      );
    }
  }

  function onEdit(e: GanttEdit) {
    const row = "id" in e ? plan.rows.get(e.id) : null;
    switch (e.kind) {
      case "move":
        return void run(() => updateTask(e.id, { start_date: e.start, end_date: e.finish }));
      case "start":
        return void run(() =>
          updateTask(e.id, { start_date: nextWorkingDay(e.start, cal), end_date: finishDate(e.start, row?.duration ?? 1, cal) }),
        );
      case "resize":
        return void run(() => updateTask(e.id, { end_date: e.finish, duration: e.duration }));
      case "duration":
        return void run(() =>
          updateTask(e.id, { duration: e.duration, end_date: finishDate(row?.start ?? row?.task.start_date ?? "", e.duration, cal) }),
        );
      case "rename":
        return void updateTask(e.id, { name: e.name })
          .then(refresh)
          .catch((err: unknown) => toast.error(errorMessage(t, err)));
      case "progress":
        return void updateTask(e.id, { progress: e.progress })
          .then(refresh)
          .catch((err: unknown) => toast.error(errorMessage(t, err)));
      case "link":
        if (plan.rows.get(e.from)?.isSummary || plan.rows.get(e.to)?.isSummary) return void toast.error(t("planning.noSummaryLinks"));
        return void run(() =>
          addDependency({
            company_id: companyId,
            project_id: projectId,
            predecessor_id: e.from,
            successor_id: e.to,
            type: "FS",
            lag_days: 0,
          }),
        );
    }
  }

  const loading = data.tasks.isLoading || data.deps.isLoading || data.calendar.isLoading || data.baseline.isLoading;
  const error = data.tasks.error ?? data.deps.error ?? data.calendar.error ?? data.baseline.error;
  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={errorMessage(t, error)} onRetry={() => void refresh()} />;

  const projectLabel = `${project.code} — ${project.name}`;
  const ctx = { t, lang, company, projectLabel, rows: plan.rows, order: plan.order, deps: data.deps.data ?? [], cal };
  const today = todayIso(company.timezone);
  const leafRows = [...plan.rows.values()].filter((r) => !r.isSummary);
  const finish = leafRows.length ? leafRows.map((r) => r.finish).reduce((a, b) => (a > b ? a : b)) : null;
  const critical = leafRows.filter((r) => r.cpm?.critical).length;
  const delays = delayRows(ctx, today);
  const late = delays.filter((d) => d.status === "late" || d.status === "not_started_late").length;
  const baselineFinish = data.baseline.data?.tasks.length
    ? data.baseline.data.tasks.map((b) => b.end_date).reduce((a, b) => (a > b ? a : b))
    : null;

  const exportAs = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          [t("planning.projectFinish"), finish ? formatDate(finish) : "—"],
          [t("planning.baselineFinish"), baselineFinish ? formatDate(baselineFinish) : t("planning.noBaseline")],
          [t("planning.criticalTasks"), String(critical)],
          [t("planning.lateTasks"), String(late)],
        ].map(([k, v]) => (
          <Card key={k}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="font-semibold num">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex rounded-md border p-0.5">
          {(["gantt", "delay"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn("rounded px-3 py-1.5 text-sm", view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {v === "gantt" ? t("planning.gantt") : t("planning.delayReport")}
            </button>
          ))}
        </div>
        {view === "gantt" ? (
          <>
            <div className="flex rounded-md border p-0.5" role="group" aria-label={t("planning.zoom")}>
              {(["day", "week", "month"] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-pressed={zoom === z}
                  onClick={() => setZoom(z)}
                  className={cn("rounded px-2.5 py-1.5 text-sm", zoom === z ? "bg-secondary font-semibold" : "hover:bg-muted")}
                >
                  {t(`planning.zooms.${z}`)}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={showBaseline} onCheckedChange={(v) => setShowBaseline(v === true)} /> {t("planning.showBaseline")}
            </label>
            {!readOnly ? (
              <>
                <label className="flex items-center gap-2 text-sm" title={t("planning.autoHint")}>
                  <Checkbox checked={auto} onCheckedChange={(v) => setAuto(v === true)} /> {t("planning.autoSchedule")}
                </label>
                <Button size="sm" onClick={() => void addTask(null)} disabled={busy}>
                  <Plus /> {t("planning.addTask")}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => void indent("out")}
                  disabled={!selected || busy}
                  aria-label={t("planning.outdent")}
                  title={t("planning.outdent")}
                >
                  <IndentDecrease />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => void indent("in")}
                  disabled={!selected || busy}
                  aria-label={t("planning.indent")}
                  title={t("planning.indent")}
                >
                  <IndentIncrease />
                </Button>
                <Button size="sm" variant="outline" onClick={() => void run(async () => undefined)} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {t("planning.scheduleNow")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !leafRows.length}
                  onClick={() =>
                    void exportAs(async () => {
                      await createBaseline(projectId, `${t("planning.baseline")} ${formatDate(today)}`);
                      toast.success(t("planning.baselineSaved"));
                      await refresh();
                    })
                  }
                >
                  <Flag /> {t("planning.setBaseline")}
                </Button>
              </>
            ) : null}
          </>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="ms-auto" disabled={busy}>
              <Download /> {t("estimating.exports.button")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("planning.title")}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => void exportAs(() => exportScheduleExcel(ctx))}>
              <FileSpreadsheet /> {t("estimating.exports.formats.xlsx")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportAs(() => exportSchedulePdf(ctx, currency))}>
              <FileText /> {t("estimating.exports.formats.pdf")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("planning.delayReport")}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => void exportAs(() => exportDelayReport(ctx, today, "xlsx", currency))}>
              <FileSpreadsheet /> {t("estimating.exports.formats.xlsx")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportAs(() => exportDelayReport(ctx, today, "pdf", currency))}>
              <FileText /> {t("estimating.exports.formats.pdf")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {plan.cycle ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">{t("planning.cycle")}</p> : null}

      {plan.order.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-8" aria-hidden />}
          title={t("planning.emptyTitle")}
          description={readOnly ? undefined : t("planning.emptyHint")}
          action={
            !readOnly ? (
              <Button onClick={() => void addTask(null)}>
                <Plus /> {t("planning.addTask")}
              </Button>
            ) : null
          }
        />
      ) : view === "gantt" ? (
        <>
          <Gantt
            rows={plan.rows}
            order={plan.order}
            deps={data.deps.data ?? []}
            cal={cal}
            zoom={zoom}
            readOnly={readOnly || busy}
            showBaseline={showBaseline}
            collapsed={collapsed}
            onToggle={(id) =>
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            selectedId={selected}
            onSelect={setSelected}
            onOpen={setOpen}
            onAddChild={(id) => void addTask(id)}
            onEdit={onEdit}
            lang={lang}
          />
          <p className="text-xs text-muted-foreground">{t("planning.legend")}</p>
        </>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  t("planning.wbs"),
                  t("planning.task"),
                  t("planning.baselineFinish"),
                  t("planning.currentFinish"),
                  t("planning.variance"),
                  t("planning.planned"),
                  t("planning.actual"),
                  t("common.status"),
                ].map((h) => (
                  <th key={h} className="px-2 py-2 text-start">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {delays.map((d) => (
                <tr key={d.row.task.id} className="border-t">
                  <td className="px-2 py-1.5 font-mono text-xs">{d.row.wbs}</td>
                  <td className="px-2 py-1.5">{d.row.task.name}</td>
                  <td className="px-2 py-1.5 num">{d.row.baseline ? formatDate(d.row.baseline.finish) : "—"}</td>
                  <td className="px-2 py-1.5 num">{formatDate(d.row.finish)}</td>
                  <td className={cn("px-2 py-1.5 text-end num", d.finishVariance > 0 && "font-semibold text-destructive")}>
                    {d.finishVariance > 0 ? `+${d.finishVariance}` : d.finishVariance}
                  </td>
                  <td className="px-2 py-1.5 text-end num">{formatNumber(d.planned, lang, 0)} %</td>
                  <td className="px-2 py-1.5 text-end num">{formatNumber(d.row.progress, lang, 0)} %</td>
                  <td className="px-2 py-1.5">
                    <Badge variant={DELAY_VARIANT[d.status]}>{t(`planning.delay.${d.status}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.baseline.data?.baseline ? <p className="p-3 text-xs text-muted-foreground">{t("planning.delayNoBaseline")}</p> : null}
        </div>
      )}

      {open && plan.rows.get(open) ? (
        <TaskDialog
          row={plan.rows.get(open) as NonNullable<ReturnType<typeof plan.rows.get>>}
          rows={plan.rows}
          order={plan.order}
          deps={data.deps.data ?? []}
          cal={cal}
          scope={{ companyId, projectId }}
          readOnly={readOnly}
          lang={lang}
          onClose={() => setOpen(null)}
          onChanged={reschedule}
        />
      ) : null}
    </div>
  );
}
