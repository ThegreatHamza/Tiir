import { Link, NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/lib/calc/money";
import { fetchProject, type ProjectRow } from "./api";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { modulesFor } from "./modules";

export type ProjectContext = { project: ProjectRow & { id: string }; projectId: string; currency: CurrencyCode };

export function useProject(): ProjectContext {
  return useOutletContext<ProjectContext>();
}

/** Header + module navigation shared by every screen of a project. */
export function ProjectLayout() {
  const { t } = useTranslation();
  const { projectId = "" } = useParams();
  const { company, companyId, role } = useCurrentCompany();
  const query = useQuery({ queryKey: qk.project(companyId, projectId), queryFn: () => fetchProject(companyId, projectId) });

  if (query.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;
  const project = query.data;
  if (!project?.id) {
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
  const ctx: ProjectContext = {
    project: { ...project, id: project.id },
    projectId,
    currency: project.currency ?? company.default_currency,
  };

  return (
    <div className="grid gap-3">
      <div>
        <Link to="/projects" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("projects.backToList")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground ltr-nums">{project.code}</span>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
          {project.deleted_at ? <Badge variant="destructive">{t("common.deletedLabel")}</Badge> : null}
        </div>
      </div>
      <nav aria-label={t("projectNav.label")} className="-mx-3 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {modulesFor(role).map((m) => (
            <li key={m.path}>
              <NavLink
                to={m.path ? `/projects/${projectId}/${m.path}` : `/projects/${projectId}`}
                end={!m.path}
                className={({ isActive }) =>
                  cn(
                    "-mb-px flex min-h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors",
                    isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <m.icon className="size-4" aria-hidden />
                {t(m.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet context={ctx} />
    </div>
  );
}
