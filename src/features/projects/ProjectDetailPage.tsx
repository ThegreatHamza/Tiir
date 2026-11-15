import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calculator, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { qk } from "@/lib/queryKeys";
import { can } from "@/lib/roles";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchProject, setProjectDeleted, updateProject } from "./api";
import { ProjectFormDialog, type ProjectFormValues } from "./ProjectFormDialog";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { ProjectTeam } from "./ProjectTeam";
import { ProjectSettingsCard } from "./ProjectSettingsCard";
import { toProjectPayload } from "./ProjectsPage";

const TABS = ["overview", "team", "settings"] as const;
type Tab = (typeof TABS)[number];

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { projectId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { companyId, role } = useCurrentCompany();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({ queryKey: qk.project(companyId, projectId), queryFn: () => fetchProject(companyId, projectId) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["company", companyId] });

  const update = useMutation({
    mutationFn: (v: ProjectFormValues) => updateProject(projectId, toProjectPayload(v)),
    onSuccess: async () => {
      toast.success(t("common.saved"));
      setEditing(false);
      await invalidate();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  const visibleTabs: Tab[] = TABS.filter((tab) =>
    tab === "settings" ? can.seeCosts(role) : tab === "team" ? role !== "client_viewer" : true,
  );
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && visibleTabs.includes(requested) ? requested : "overview";

  if (query.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;
  const project = query.data;
  if (!project) {
    return (
      <EmptyState
        title={t("projects.notFound")}
        description={t("projects.notFoundHint")}
        action={
          <Button asChild variant="outline">
            <Link to="/projects">{t("projects.backToList")}</Link>
          </Button>
        }
      />
    );
  }

  const deleted = Boolean(project.deleted_at);
  const editable = can.editProject(role) && !deleted;

  return (
    <div className="grid gap-4">
      <div>
        <Link to="/projects" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("projects.backToList")}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground ltr-nums">{project.code}</p>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              {project.name}
              <ProjectStatusBadge status={project.status} />
              {deleted ? <Badge variant="destructive">{t("common.deletedLabel")}</Badge> : null}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {can.seeCosts(role) ? (
              <Button asChild>
                <Link to={`/projects/${projectId}/estimate`}>
                  <Calculator /> {t("estimating.open")}
                </Link>
              </Button>
            ) : null}
            {editable ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> {t("common.edit")}
              </Button>
            ) : null}
            {can.seeAllProjects(role) ? (
              deleted ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await setProjectDeleted(projectId, false);
                      toast.success(t("common.restored"));
                      await invalidate();
                    } catch (e) {
                      toast.error(errorMessage(t, e));
                    }
                  }}
                >
                  <RotateCcw /> {t("common.restore")}
                </Button>
              ) : (
                <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> {t("common.delete")}
                </Button>
              )
            ) : null}
          </div>
        </div>
      </div>

      <div role="tablist" aria-label={t("projects.sections")} className="flex gap-1 overflow-x-auto border-b">
        {visibleTabs.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setParams(key === "overview" ? {} : { tab: key }, { replace: true })}
            className={cn(
              "-mb-px min-h-10 border-b-2 px-3 text-sm font-medium transition-colors",
              tab === key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`projects.tabs.${key}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "overview" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("projects.tabs.overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [t("projects.client"), can.seeClients(role) ? (project.client_name ?? "—") : null],
                  [t("common.currency"), project.currency ? t(`currencies.${project.currency}`) : "—"],
                  [t("common.country"), project.country ? t(`countries.${project.country}`) : "—"],
                  [t("common.city"), project.city ?? "—"],
                  [t("projects.siteAddress"), project.site_address ?? "—"],
                  [t("common.startDate"), formatDate(project.start_date)],
                  [t("common.endDate"), formatDate(project.end_date)],
                  [t("projects.team"), String(project.member_count ?? 0)],
                ]
                  .filter((row): row is [string, string] => row[1] !== null)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
              </dl>
              {project.description ? (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">{t("common.description")}</p>
                  <p className="whitespace-pre-line">{project.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : tab === "team" ? (
          <ProjectTeam projectId={projectId} readOnly={!can.manageProjectTeam(role) || deleted} />
        ) : (
          <ProjectSettingsCard
            projectId={projectId}
            currency={project.currency ?? "DJF"}
            readOnly={!can.editProjectSettings(role) || deleted}
          />
        )}
      </div>

      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={project} onSubmit={(v) => update.mutateAsync(v)} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={t("projects.deleteTitle")}
        description={t("projects.deleteBody", { name: project.name })}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          try {
            await setProjectDeleted(projectId, true);
            toast.success(t("common.deleted"));
            await invalidate();
          } catch (e) {
            toast.error(errorMessage(t, e));
          }
        }}
      />
    </div>
  );
}
