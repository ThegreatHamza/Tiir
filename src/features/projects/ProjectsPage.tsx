import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { useListState } from "@/hooks/useListState";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { fetchClientOptions } from "@/features/clients/api";
import { qk } from "@/lib/queryKeys";
import { can } from "@/lib/roles";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export/excel";
import { createProject, fetchProjects, PROJECT_STATUSES, type ProjectRow } from "./api";
import { ProjectFormDialog, type ProjectFormValues } from "./ProjectFormDialog";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

export function toProjectPayload(v: ProjectFormValues) {
  return {
    code: v.code,
    name: v.name,
    client_id: v.client_id || null,
    status: v.status,
    country: v.country,
    city: v.city || null,
    site_address: v.site_address || null,
    start_date: v.start_date || null,
    end_date: v.end_date || null,
    description: v.description || null,
  };
}

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, role } = useCurrentCompany();
  const list = useListState({ id: "created_at", desc: true });
  const [creating, setCreating] = useState(false);

  const query = useQuery({
    queryKey: qk.projects(companyId, list.state),
    queryFn: () => fetchProjects(companyId, list.state),
    placeholderData: keepPreviousData,
  });
  const clients = useQuery({
    queryKey: qk.clientOptions(companyId),
    queryFn: () => fetchClientOptions(companyId),
    enabled: can.seeClients(role),
  });

  const create = useMutation({
    mutationFn: (v: ProjectFormValues) => createProject({ company_id: companyId, currency: v.currency, ...toProjectPayload(v) }),
    onSuccess: async (id) => {
      toast.success(t("projects.created"));
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      navigate(`/projects/${id}`);
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  const columns: Column<ProjectRow>[] = [
    { id: "code", header: t("common.code"), sortable: true, cell: (r) => <span className="font-mono text-xs ltr-nums">{r.code}</span> },
    {
      id: "name",
      header: t("common.name"),
      sortable: true,
      cell: (r) => (
        <span className="font-medium">
          {r.name}
          {r.deleted_at ? (
            <Badge variant="destructive" className="ms-2">
              {t("common.deletedLabel")}
            </Badge>
          ) : null}
        </span>
      ),
    },
    ...(can.seeClients(role)
      ? [{ id: "client_name", header: t("projects.client"), sortable: true, cell: (r: ProjectRow) => r.client_name ?? "—" }]
      : []),
    { id: "city", header: t("common.city"), sortable: true, cell: (r) => r.city ?? "—" },
    { id: "status", header: t("common.status"), sortable: true, cell: (r) => <ProjectStatusBadge status={r.status} /> },
    { id: "currency", header: t("common.currency"), cell: (r) => r.currency },
    {
      id: "start_date",
      header: t("common.startDate"),
      sortable: true,
      cell: (r) => <span className="num">{formatDate(r.start_date)}</span>,
    },
    { id: "end_date", header: t("common.endDate"), sortable: true, cell: (r) => <span className="num">{formatDate(r.end_date)}</span> },
    { id: "member_count", header: t("projects.team"), align: "end", cell: (r) => r.member_count ?? 0 },
  ];

  async function onExport() {
    const { rows } = await fetchProjects(companyId, list.state, { all: true });
    await exportToExcel(
      t("projects.title"),
      t("projects.title"),
      [
        { header: t("common.code"), value: (r: ProjectRow) => r.code },
        { header: t("common.name"), value: (r) => r.name, width: 32 },
        ...(can.seeClients(role) ? [{ header: t("projects.client"), value: (r: ProjectRow) => r.client_name, width: 24 }] : []),
        { header: t("common.city"), value: (r) => r.city },
        { header: t("common.status"), value: (r) => (r.status ? t(`projects.statuses.${r.status}`) : "") },
        { header: t("common.currency"), value: (r) => r.currency },
        { header: t("common.startDate"), value: (r) => formatDate(r.start_date) },
        { header: t("common.endDate"), value: (r) => formatDate(r.end_date) },
        { header: t("projects.team"), value: (r) => r.member_count },
      ],
      rows,
    );
  }

  return (
    <>
      <PageHeader
        title={t("projects.title")}
        description={can.seeAllProjects(role) ? t("projects.subtitleAll") : t("projects.subtitleAssigned")}
      />
      <DataTable
        columns={columns}
        rows={query.data?.rows}
        total={query.data?.total}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        list={list}
        rowKey={(r) => r.id ?? ""}
        onRowClick={(r) => r.id && navigate(`/projects/${r.id}`)}
        isDeleted={(r) => Boolean(r.deleted_at)}
        allowShowDeleted={can.seeAllProjects(role)}
        onExport={onExport}
        emptyTitle={t("projects.emptyTitle")}
        emptyDescription={can.createProject(role) ? t("projects.emptyHint") : t("projects.emptyAssigned")}
        emptyAction={
          can.createProject(role) ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> {t("projects.new")}
            </Button>
          ) : null
        }
        filters={
          <>
            <NativeSelect
              aria-label={t("common.status")}
              className="md:w-44"
              value={list.state.filters.status ?? ""}
              onChange={(e) => list.setFilter("status", e.target.value)}
            >
              <option value="">{t("projects.allStatuses")}</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`projects.statuses.${s}`)}
                </option>
              ))}
            </NativeSelect>
            {can.seeClients(role) ? (
              <NativeSelect
                aria-label={t("projects.client")}
                className="md:w-48"
                value={list.state.filters.client ?? ""}
                onChange={(e) => list.setFilter("client", e.target.value)}
              >
                <option value="">{t("projects.allClients")}</option>
                {(clients.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
          </>
        }
        actions={
          can.createProject(role) ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> {t("projects.new")}
            </Button>
          ) : null
        }
        mobileCard={(r) => (
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground ltr-nums">{r.code}</span>
              <ProjectStatusBadge status={r.status} />
            </div>
            <p className="font-medium">{r.name}</p>
            {r.city ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden /> {r.city}
              </p>
            ) : null}
          </div>
        )}
      />
      <ProjectFormDialog open={creating} onOpenChange={setCreating} onSubmit={(v) => create.mutateAsync(v).then(() => undefined)} />
    </>
  );
}
