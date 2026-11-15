import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/common/DateInput";
import { EmptyState, ErrorState } from "@/components/common/States";
import { TabBar } from "@/components/common/Tabs";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatNumber, todayIso } from "@/lib/format";
import { exportToExcel } from "@/lib/export/excel";
import { addDays } from "@/lib/calc/schedule";
import { normaliseDays } from "@/lib/calc/payroll";
import { supabase, type Tables } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";
import { enqueue } from "@/lib/offline/sync";
import { newId } from "@/lib/offline/logic";
import { cn } from "@/lib/utils";

/** Last day of a "YYYY-MM" month. */
export function monthEnd(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return addDays(next, -1);
}

type Mark = { id: string; days: 0 | 0.5 | 1; ot: string; existing: boolean };

async function fetchWorkers(companyId: string) {
  const { data, error } = await supabase.from("workers_site").select("*").eq("company_id", companyId).eq("active", true).order("full_name");
  if (error) throw error;
  return data ?? [];
}

async function fetchAttendance(projectId: string, from: string, to: string) {
  return fetchAllPages<Tables<"attendance">>((f, t) =>
    supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .gte("work_date", from)
      .lte("work_date", to)
      .range(f, t),
  );
}

export function AttendancePage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<"day" | "month">("day");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("labour.title")}</h2>
      <TabBar
        tabs={[
          { value: "day", label: t("labour.tabs.day") },
          { value: "month", label: t("labour.tabs.month") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "day" ? <DayRegister /> : <MonthSummary />}
    </div>
  );
}

function DayRegister() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { company, companyId, role } = useCurrentCompany();
  const { projectId } = useProject();
  const [date, setDate] = React.useState(todayIso(company.timezone));
  const [marks, setMarks] = React.useState<Record<string, Mark>>({});
  const [saving, setSaving] = React.useState(false);
  const canWrite = ["owner", "admin", "project_manager", "site_foreman"].includes(role);
  const workersQ = useQuery({ queryKey: ["company", companyId, "workers-site"], queryFn: () => fetchWorkers(companyId) });
  const attQ = useQuery({
    queryKey: ["company", companyId, "project", projectId, "attendance", date],
    queryFn: () => fetchAttendance(projectId, date, date),
  });

  React.useEffect(() => {
    const next: Record<string, Mark> = {};
    for (const a of attQ.data ?? [])
      next[a.worker_id] = {
        id: a.id,
        days: normaliseDays(Number(a.days)),
        ot: a.overtime_hours ? String(a.overtime_hours) : "",
        existing: true,
      };
    setMarks(next);
  }, [attQ.data]);

  if (workersQ.isLoading || attQ.isLoading) return <Skeleton className="h-72" />;
  if (workersQ.error || attQ.error)
    return <ErrorState message={errorMessage(t, workersQ.error ?? attQ.error)} onRetry={() => void attQ.refetch()} />;
  const workers = workersQ.data ?? [];
  const present = Object.values(marks).filter((m) => m.days > 0).length;
  const set = (workerId: string, patch: Partial<Mark>) =>
    setMarks((s) => ({ ...s, [workerId]: { id: s[workerId]?.id ?? newId(), days: 0, ot: "", existing: false, ...s[workerId], ...patch } }));

  async function save() {
    setSaving(true);
    try {
      for (const [workerId, m] of Object.entries(marks)) {
        if (!m.existing && m.days === 0 && !m.ot) continue;
        const ot = Math.max(0, Number(m.ot.replace(",", ".")) || 0);
        await enqueue(
          "attendance",
          {
            id: m.id,
            company_id: companyId,
            project_id: projectId,
            worker_id: workerId,
            work_date: date,
            days: m.days,
            overtime_hours: ot,
          },
          { label: `${t("labour.attendance")} ${formatDate(date)}`, companyId },
        );
      }
      toast.success(t("labour.saved", { count: present }));
      void qc.invalidateQueries({ queryKey: ["company", companyId, "project", projectId, "attendance"] });
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label={t("labour.previousDay")}>
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
        <DateInput id="att-date" value={date} onChange={setDate} aria-label={t("common.date")} />
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} aria-label={t("labour.nextDay")}>
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
        <span className="text-sm text-muted-foreground">{t("labour.presentCount", { count: present, total: workers.length })}</span>
        {canWrite ? (
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => workers.forEach((w) => set(w.id, { days: 1 }))}>
              {t("labour.allPresent")}
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              <Save className="size-4" aria-hidden />
              {t("common.save")}
            </Button>
          </div>
        ) : null}
      </div>
      {workers.length === 0 ? <EmptyState title={t("labour.noWorkers")} description={t("labour.noWorkersHint")} /> : null}
      <div className="grid gap-2 md:grid-cols-2">
        {workers.map((w) => {
          const m = marks[w.id];
          return (
            <Card key={w.id}>
              <CardContent className="flex flex-wrap items-center gap-2 p-2">
                <div className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{w.full_name}</span>
                  <span className="text-xs text-muted-foreground">{t(`site.trades.${w.trade}`, { defaultValue: w.trade })}</span>
                </div>
                <div role="radiogroup" aria-label={t("labour.days")} className="flex rounded-md border p-0.5">
                  {([0, 0.5, 1] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={(m?.days ?? 0) === d}
                      disabled={!canWrite}
                      onClick={() => set(w.id, { days: d })}
                      className={cn(
                        "min-h-9 min-w-11 rounded px-2 text-sm num",
                        (m?.days ?? 0) === d
                          ? d === 0
                            ? "bg-muted font-semibold"
                            : "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {d === 0 ? t("labour.absent") : d === 0.5 ? "½" : "1"}
                    </button>
                  ))}
                </div>
                <Input
                  inputMode="decimal"
                  className="h-9 w-20 text-end num"
                  placeholder={t("labour.otShort")}
                  aria-label={`${t("labour.overtime")} ${w.full_name}`}
                  value={m?.ot ?? ""}
                  disabled={!canWrite}
                  onChange={(e) => set(w.id, { ot: e.target.value })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MonthSummary() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, companyId } = useCurrentCompany();
  const { project, projectId } = useProject();
  const [month, setMonth] = React.useState(todayIso(company.timezone).slice(0, 7));
  const from = `${month}-01`;
  const to = monthEnd(month);
  const workersQ = useQuery({ queryKey: ["company", companyId, "workers-site"], queryFn: () => fetchWorkers(companyId) });
  const attQ = useQuery({
    queryKey: ["company", companyId, "project", projectId, "attendance", "month", month],
    queryFn: () => fetchAttendance(projectId, from, to),
  });
  if (workersQ.isLoading || attQ.isLoading) return <Skeleton className="h-72" />;
  if (workersQ.error || attQ.error)
    return <ErrorState message={errorMessage(t, workersQ.error ?? attQ.error)} onRetry={() => void attQ.refetch()} />;
  const names = new Map((workersQ.data ?? []).map((w) => [w.id, w]));
  const sum = new Map<string, { days: number; ot: number }>();
  for (const a of attQ.data ?? []) {
    const s = sum.get(a.worker_id) ?? { days: 0, ot: 0 };
    sum.set(a.worker_id, { days: s.days + Number(a.days), ot: s.ot + Number(a.overtime_hours) });
  }
  const rows = [...sum.entries()]
    .map(([id, s]) => ({ id, name: names.get(id)?.full_name ?? "—", trade: names.get(id)?.trade ?? "", ...s }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="w-44"
          aria-label={t("costs.month")}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!rows.length}
          onClick={() =>
            void exportToExcel(
              `${project.code}_${t("labour.attendance")}_${month}`,
              month,
              [
                { header: t("labour.worker"), value: (r: (typeof rows)[number]) => r.name },
                { header: t("labour.trade"), value: (r) => t(`site.trades.${r.trade}`, { defaultValue: r.trade }) },
                { header: t("labour.days"), value: (r) => r.days },
                { header: t("labour.overtime"), value: (r) => r.ot },
              ],
              rows,
            )
          }
        >
          <Download className="size-4" aria-hidden />
          {t("common.exportExcel")}
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("labour.noAttendance")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("labour.worker")}</th>
                  <th className="px-3 py-2 text-end">{t("labour.days")}</th>
                  <th className="px-3 py-2 text-end">{t("labour.overtime")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-end num">{formatNumber(r.days, lang, 1)}</td>
                    <td className="px-3 py-1.5 text-end num">{formatNumber(r.ot, lang, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
