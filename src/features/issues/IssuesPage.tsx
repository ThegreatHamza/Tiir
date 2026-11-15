import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { formatDate, todayIso } from "@/lib/format";
import type { RowOf } from "@/lib/db";

const STATUS: Record<string, BadgeProps["variant"]> = { open: "warning", in_progress: "accent", resolved: "success", closed: "secondary" };
const PRIORITY: Record<string, BadgeProps["variant"]> = { low: "secondary", medium: "accent", high: "warning", critical: "destructive" };

export function IssuesPage() {
  const { t } = useTranslation();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const today = todayIso(company.timezone);
  const canWrite = ["owner", "admin", "project_manager", "estimator", "site_foreman", "storekeeper"].includes(role);
  const statuses = ["open", "in_progress", "resolved", "closed"].map((v) => ({ value: v, label: t(`issues.statuses.${v}`) }));
  const priorities = ["low", "medium", "high", "critical"].map((v) => ({ value: v, label: t(`site.severities.${v}`) }));
  type R = RowOf<"site_issues">;
  const overdue = (r: R) => Boolean(r.due_date && r.due_date < today && (r.status === "open" || r.status === "in_progress"));

  const config: CrudConfig<"site_issues"> = {
    table: "site_issues",
    scope: "project",
    title: t("issues.title"),
    subtitle: t("issues.subtitle"),
    singular: t("issues.singular"),
    emptyTitle: t("issues.emptyTitle"),
    emptyHint: t("issues.emptyHint"),
    canWrite,
    searchColumns: ["title", "description", "location"],
    sortable: ["title", "priority", "status", "due_date", "created_at"],
    defaultSort: { id: "created_at", desc: true },
    filters: [
      { name: "status", label: t("issues.allStatuses"), options: statuses },
      { name: "priority", label: t("issues.allPriorities"), options: priorities },
    ],
    columns: [
      {
        id: "title",
        header: t("issues.issue"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.title}</span>,
        exportValue: (r) => r.title,
      },
      { id: "location", header: t("issues.location"), cell: (r) => r.location ?? "—", exportValue: (r) => r.location },
      {
        id: "priority",
        header: t("issues.priority"),
        sortable: true,
        cell: (r) => <Badge variant={PRIORITY[r.priority]}>{t(`site.severities.${r.priority}`)}</Badge>,
        exportValue: (r) => t(`site.severities.${r.priority}`),
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={STATUS[r.status]}>{t(`issues.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`issues.statuses.${r.status}`),
      },
      {
        id: "due_date",
        header: t("issues.dueDate"),
        sortable: true,
        cell: (r) => (
          <span className={overdue(r) ? "font-semibold text-destructive num" : "num"}>
            {formatDate(r.due_date)}
            {overdue(r) ? ` · ${t("issues.overdue")}` : ""}
          </span>
        ),
        exportValue: (r) => formatDate(r.due_date),
      },
    ],
    fields: [
      { name: "title", label: t("issues.issue"), type: "text", required: true, span: 2 },
      { name: "priority", label: t("issues.priority"), type: "select", options: priorities, required: true, defaultValue: "medium" },
      { name: "location", label: t("issues.location"), type: "text" },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "open" },
      { name: "due_date", label: t("issues.dueDate"), type: "date" },
      {
        name: "assignee_id",
        label: t("issues.assignee"),
        type: "relation",
        span: 2,
        relation: {
          table: "company_member_directory",
          valueKey: "user_id",
          label: (r) => String(r.full_name || r.email),
          filter: { status: "active" },
          order: "full_name",
        },
      },
      { name: "description", label: t("common.description"), type: "textarea" },
      { name: "photo_path", label: t("site.photo"), type: "file", module: "issues", accept: "image/*" },
    ],
    toPayload: (v) => ({ ...v, resolved_at: v.status === "resolved" || v.status === "closed" ? new Date().toISOString() : null }),
    mobileCard: (r) => (
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{r.title}</span>
          <Badge variant={STATUS[r.status]}>{t(`issues.statuses.${r.status}`)}</Badge>
        </div>
        <p className={overdue(r) ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"}>
          {t(`site.severities.${r.priority}`)} · {formatDate(r.due_date)}
        </p>
      </div>
    ),
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} />;
}
