import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { Camera, CloudUpload, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState, ErrorState } from "@/components/common/States";
import { useListState } from "@/hooks/useListState";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { offlineDb } from "@/lib/offline/store";
import { enqueuePhoto } from "@/lib/offline/sync";
import { exportToExcel } from "@/lib/export/excel";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { currentLanguage } from "@/i18n";
import { fetchPhotos, fetchReports, fetchSiteItems, signPhotos, type ReportRow } from "./api";

const TABS = ["reports", "progress", "photos"] as const;

export function SitePage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("reports");
  return (
    <div className="grid gap-3">
      <div role="tablist" className="flex w-fit rounded-md border p-0.5">
        {TABS.map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn("min-h-9 rounded px-3 text-sm", tab === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {t(`site.tabs.${v}`)}
          </button>
        ))}
      </div>
      {tab === "reports" ? <ReportsList /> : tab === "progress" ? <ProgressList /> : <PhotoGallery />}
    </div>
  );
}

function ReportsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companyId, role } = useCurrentCompany();
  const { projectId, project } = useProject();
  const list = useListState({ id: "report_date", desc: true });
  const query = useQuery({
    queryKey: ["company", companyId, "site", "reports", projectId, list.state],
    queryFn: () => fetchReports(projectId, list.state),
    placeholderData: keepPreviousData,
  });
  const pending = useLiveQuery(() => offlineDb.queue.where("table").equals("daily_reports").toArray(), [], []);
  const localReports = pending.filter((p) => p.payload.project_id === projectId);
  const canWrite = ["owner", "admin", "project_manager", "site_foreman"].includes(role);

  const columns: Column<ReportRow>[] = [
    {
      id: "report_date",
      header: t("common.date"),
      sortable: true,
      cell: (r) => <span className="font-medium num">{formatDate(r.report_date)}</span>,
    },
    { id: "weather", header: t("site.weather"), cell: (r) => (r.weather ? t(`site.weathers.${r.weather}`) : "—") },
    { id: "labour_count", header: t("site.labour"), sortable: true, align: "end", cell: (r) => r.labour_count ?? 0 },
    { id: "progress_count", header: t("site.workDone"), align: "end", cell: (r) => r.progress_count ?? 0 },
    { id: "photo_count", header: t("site.photos"), sortable: true, align: "end", cell: (r) => r.photo_count ?? 0 },
    {
      id: "incident_count",
      header: t("site.incidents"),
      align: "end",
      cell: (r) => (r.incident_count ? <Badge variant="destructive">{r.incident_count}</Badge> : 0),
    },
    { id: "author_name", header: t("site.author"), cell: (r) => r.author_name },
    {
      id: "status",
      header: t("common.status"),
      sortable: true,
      cell: (r) => <Badge variant={r.status === "submitted" ? "success" : "secondary"}>{t(`site.statuses.${r.status ?? "draft"}`)}</Badge>,
    },
  ];

  return (
    <div className="grid gap-3">
      {localReports.length ? (
        <div className="grid gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CloudUpload className="size-4" /> {t("site.waitingToSync", { count: localReports.length })}
          </p>
          {localReports.map((r) => (
            <p key={r.id} className="text-sm">
              {r.label} {r.status === "failed" ? <Badge variant="destructive">{t("sync.failedShort")}</Badge> : null}
            </p>
          ))}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={query.data?.rows}
        total={query.data?.total}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        list={list}
        rowKey={(r) => r.id ?? ""}
        onRowClick={(r) => navigate(`/projects/${projectId}/site/report/${r.id}`)}
        onExport={async () => {
          const { rows } = await fetchReports(projectId, list.state, true);
          await exportToExcel(
            `${project.code}_${t("site.reportsTitle")}`,
            t("site.reportsTitle"),
            [
              { header: t("common.date"), value: (r: ReportRow) => formatDate(r.report_date) },
              { header: t("site.weather"), value: (r) => (r.weather ? t(`site.weathers.${r.weather}`) : "") },
              { header: t("site.temperature"), value: (r) => r.temperature_c },
              { header: t("site.labour"), value: (r) => r.labour_count },
              { header: t("site.photos"), value: (r) => r.photo_count },
              { header: t("site.incidents"), value: (r) => r.incident_count },
              { header: t("site.summary"), value: (r) => r.summary, width: 60 },
              { header: t("site.author"), value: (r) => r.author_name },
              { header: t("common.status"), value: (r) => t(`site.statuses.${r.status ?? "draft"}`) },
            ],
            rows,
          );
        }}
        filters={
          <NativeSelect
            aria-label={t("common.status")}
            className="md:w-40"
            value={list.state.filters.status ?? ""}
            onChange={(e) => list.setFilter("status", e.target.value)}
          >
            <option value="">{t("projects.allStatuses")}</option>
            <option value="draft">{t("site.statuses.draft")}</option>
            <option value="submitted">{t("site.statuses.submitted")}</option>
          </NativeSelect>
        }
        actions={
          canWrite ? (
            <Button asChild size="touch">
              <Link to={`/projects/${projectId}/site/report/new`}>
                <Plus /> {t("site.newReport")}
              </Link>
            </Button>
          ) : null
        }
        emptyTitle={t("site.noReports")}
        emptyDescription={canWrite ? t("site.noReportsHint") : undefined}
        mobileCard={(r) => (
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold num">{formatDate(r.report_date)}</p>
              <p className="text-xs text-muted-foreground">
                {r.weather ? t(`site.weathers.${r.weather}`) : ""} · {t("site.peopleCount", { count: r.labour_count ?? 0 })} ·{" "}
                {t("site.photoCount", { count: r.photo_count ?? 0 })}
              </p>
            </div>
            <Badge variant={r.status === "submitted" ? "success" : "secondary"}>{t(`site.statuses.${r.status ?? "draft"}`)}</Badge>
          </div>
        )}
      />
    </div>
  );
}

function ProgressList() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { companyId } = useCurrentCompany();
  const { projectId, project } = useProject();
  const [q, setQ] = React.useState("");
  const query = useQuery({ queryKey: ["company", companyId, "site", "items", projectId], queryFn: () => fetchSiteItems(projectId) });
  if (query.isLoading) return <Skeleton className="h-64" />;
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;
  const rows = (query.data ?? []).filter((r) => !q || `${r.code} ${r.description}`.toLowerCase().includes(q.toLowerCase()));
  if (!query.data?.length) return <EmptyState title={t("site.noBoq")} description={t("site.noBoqHint")} />;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          className="h-9 rounded-md border bg-card px-3 text-sm md:w-72"
        />
        <Button
          variant="outline"
          className="ms-auto"
          onClick={() =>
            void exportToExcel(
              `${project.code}_${t("site.tabs.progress")}`,
              t("site.tabs.progress"),
              [
                { header: t("common.code"), value: (r: (typeof rows)[number]) => r.code },
                { header: t("estimating.designation"), value: (r) => r.description, width: 50 },
                { header: t("estimating.unit"), value: (r) => t(`units.${r.unit ?? "u"}`) },
                { header: t("site.planned"), value: (r) => r.planned_quantity },
                { header: t("site.done"), value: (r) => r.done_quantity },
                { header: "%", value: (r) => r.percent_complete },
                { header: t("site.lastEntry"), value: (r) => formatDate(r.last_date) },
              ],
              rows,
            )
          }
        >
          {t("common.exportExcel")}
        </Button>
      </div>
      <ul className="grid gap-1.5">
        {rows.map((r) => (
          <li key={r.boq_item_id} className="rounded-md border bg-card p-2.5">
            <div className="flex items-start justify-between gap-2 text-sm">
              <span>
                <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.description}
              </span>
              <span className="shrink-0 font-semibold num">{formatNumber(r.percent_complete, lang, 0)} %</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={Number(r.percent_complete ?? 0)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={r.description ?? ""}
            >
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, Number(r.percent_complete ?? 0))}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground num">
              {t("site.doneOf", {
                done: formatNumber(r.done_quantity, lang, 3),
                planned: formatNumber(r.planned_quantity, lang, 3),
                unit: t(`units.${r.unit ?? "u"}`),
              })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotoGallery() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { companyId, role } = useCurrentCompany();
  const { projectId } = useProject();
  const canShare = ["owner", "admin", "project_manager"].includes(role);
  const canUpload = ["owner", "admin", "project_manager", "site_foreman", "storekeeper"].includes(role);
  const key = ["company", companyId, "site", "photos", projectId];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const photos = await fetchPhotos(projectId);
      const urls = await signPhotos(photos.map((p) => p.storage_path));
      return photos.map((p) => ({ ...p, url: urls.get(p.storage_path) ?? null }));
    },
    staleTime: 30 * 60 * 1000,
  });
  if (query.isLoading) return <Skeleton className="h-64" />;
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;
  return (
    <div className="grid gap-3">
      {canUpload ? (
        <label className="flex min-h-touch w-fit cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          <Camera className="size-5" /> {t("site.addPhotos")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              for (const f of files)
                await enqueuePhoto(
                  f,
                  { company_id: companyId, project_id: projectId, taken_at: new Date().toISOString() },
                  t("site.photo"),
                );
              toast.success(navigator.onLine ? t("site.savedSyncing") : t("site.savedOffline"));
            }}
          />
        </label>
      ) : null}
      {(query.data ?? []).length === 0 ? (
        <EmptyState title={t("site.noPhotos")} />
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(query.data ?? []).map((p) => (
            <li key={p.id} className="overflow-hidden rounded-md border bg-card">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <img src={p.url} alt={p.caption ?? t("site.photo")} loading="lazy" className="aspect-square w-full object-cover" />
                </a>
              ) : (
                <div className="aspect-square bg-muted" />
              )}
              <div className="grid gap-1 p-2 text-xs">
                <span className="truncate">{p.caption || formatDateTime(p.taken_at)}</span>
                {canShare ? (
                  <label className="flex items-center gap-1.5">
                    <Checkbox
                      checked={p.shared_with_client}
                      onCheckedChange={async (c) => {
                        const { error } = await supabase
                          .from("photos")
                          .update({ shared_with_client: c === true })
                          .eq("id", p.id);
                        if (error) toast.error(errorMessage(t, error));
                        else void qc.invalidateQueries({ queryKey: key });
                      }}
                    />
                    {t("site.shareWithClient")}
                  </label>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
