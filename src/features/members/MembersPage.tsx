import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MailX, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListState } from "@/hooks/useListState";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useUser } from "@/features/auth/AuthProvider";
import { qk } from "@/lib/queryKeys";
import { ROLES } from "@/lib/roles";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export/excel";
import { fetchInvitations, fetchMembers, revokeInvitation, type MemberRow } from "./api";
import { InviteDialog } from "./InviteDialog";
import { MemberEditDialog } from "./MemberEditDialog";

export function MembersPage() {
  const { t } = useTranslation();
  const user = useUser();
  const queryClient = useQueryClient();
  const { companyId } = useCurrentCompany();
  const list = useListState({ id: "full_name", desc: false });
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);

  const query = useQuery({
    queryKey: qk.members(companyId, list.state),
    queryFn: () => fetchMembers(companyId, list.state),
    placeholderData: keepPreviousData,
  });
  const invitations = useQuery({ queryKey: qk.invitations(companyId), queryFn: () => fetchInvitations(companyId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["company", companyId] });

  const revoke = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: async () => {
      toast.success(t("members.inviteRevoked"));
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  const columns: Column<MemberRow>[] = [
    {
      id: "full_name",
      header: t("common.name"),
      sortable: true,
      cell: (r) => (
        <span className="flex items-center gap-2 font-medium">
          <Avatar name={r.full_name || r.email || ""} className="size-7" />
          {r.full_name || "—"}
          {r.user_id === user.id ? <Badge variant="outline">{t("members.you")}</Badge> : null}
        </span>
      ),
    },
    { id: "email", header: t("auth.email"), sortable: true, cell: (r) => <span className="ltr-nums">{r.email}</span> },
    {
      id: "role",
      header: t("common.role"),
      sortable: true,
      cell: (r) => (r.role ? <Badge variant="secondary">{t(`roles.${r.role}`)}</Badge> : null),
    },
    {
      id: "status",
      header: t("common.status"),
      sortable: true,
      cell: (r) =>
        r.deleted_at ? (
          <Badge variant="destructive">{t("members.statuses.removed")}</Badge>
        ) : (
          <Badge variant={r.status === "active" ? "success" : "warning"}>{t(`members.statuses.${r.status ?? "active"}`)}</Badge>
        ),
    },
    {
      id: "project_count",
      header: t("members.projects"),
      sortable: true,
      align: "end",
      cell: (r) => (r.role === "owner" || r.role === "admin" ? t("members.allProjects") : (r.project_count ?? 0)),
    },
    { id: "created_at", header: t("members.since"), sortable: true, cell: (r) => <span className="num">{formatDate(r.created_at)}</span> },
  ];

  async function onExport() {
    const { rows } = await fetchMembers(companyId, list.state, { all: true });
    await exportToExcel(
      t("members.title"),
      t("members.title"),
      [
        { header: t("common.name"), value: (r: MemberRow) => r.full_name, width: 28 },
        { header: t("auth.email"), value: (r) => r.email, width: 30 },
        { header: t("common.phone"), value: (r) => r.phone },
        { header: t("common.role"), value: (r) => (r.role ? t(`roles.${r.role}`) : "") },
        { header: t("common.status"), value: (r) => t(`members.statuses.${r.deleted_at ? "removed" : (r.status ?? "active")}`) },
        { header: t("members.projects"), value: (r) => r.project_count },
        { header: t("members.since"), value: (r) => formatDate(r.created_at) },
      ],
      rows,
    );
  }

  const pending = invitations.data ?? [];
  return (
    <>
      <PageHeader title={t("members.title")} description={t("members.subtitle")} />
      {pending.length > 0 ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t("members.pendingInvitations", { count: pending.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-md border">
              {pending.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-2 p-3">
                  <span className="flex-1 font-medium ltr-nums">{inv.email}</span>
                  <Badge variant="secondary">{t(`roles.${inv.role}`)}</Badge>
                  <span className="text-xs text-muted-foreground">{t("members.expires", { date: formatDate(inv.expires_at) })}</span>
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(inv.id)} disabled={revoke.isPending}>
                    <MailX /> {t("members.revoke")}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
        onRowClick={(r) => (r.deleted_at ? undefined : setEditing(r))}
        isDeleted={(r) => Boolean(r.deleted_at)}
        allowShowDeleted
        onExport={onExport}
        filters={
          <>
            <NativeSelect
              aria-label={t("common.role")}
              className="md:w-48"
              value={list.state.filters.role ?? ""}
              onChange={(e) => list.setFilter("role", e.target.value)}
            >
              <option value="">{t("members.allRoles")}</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={t("common.status")}
              className="md:w-40"
              value={list.state.filters.status ?? ""}
              onChange={(e) => list.setFilter("status", e.target.value)}
            >
              <option value="">{t("members.allStatuses")}</option>
              <option value="active">{t("members.statuses.active")}</option>
              <option value="disabled">{t("members.statuses.disabled")}</option>
            </NativeSelect>
          </>
        }
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus /> {t("members.invite")}
          </Button>
        }
        mobileCard={(r) => (
          <div className="flex items-center gap-3">
            <Avatar name={r.full_name || r.email || ""} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.full_name || r.email}</p>
              <p className="truncate text-xs text-muted-foreground">{r.email}</p>
            </div>
            {r.role ? <Badge variant="secondary">{t(`roles.${r.role}`)}</Badge> : null}
          </div>
        )}
      />
      <InviteDialog open={inviting} onOpenChange={setInviting} onInvited={() => void refresh()} />
      <MemberEditDialog member={editing} onOpenChange={(o) => !o && setEditing(null)} onSaved={() => void refresh()} />
    </>
  );
}
