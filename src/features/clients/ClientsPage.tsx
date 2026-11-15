import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListState } from "@/hooks/useListState";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { exportToExcel } from "@/lib/export/excel";
import { createClient, fetchClients, setClientDeleted, updateClient, type Client } from "./api";
import { ClientFormDialog, type ClientFormValues } from "./ClientFormDialog";

const toPayload = (v: ClientFormValues) => ({
  name: v.name,
  contact_name: v.contact_name || null,
  email: v.email || null,
  phone: v.phone || null,
  address: v.address || null,
  tax_id: v.tax_id || null,
  notes: v.notes || null,
});

export function ClientsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companyId } = useCurrentCompany();
  const list = useListState({ id: "name", desc: false });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const query = useQuery({
    queryKey: qk.clients(companyId, list.state),
    queryFn: () => fetchClients(companyId, list.state),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["company", companyId] });

  async function submit(v: ClientFormValues) {
    try {
      if (editing) await updateClient(editing.id, toPayload(v));
      else await createClient({ company_id: companyId, ...toPayload(v) });
      toast.success(t("common.saved"));
      setFormOpen(false);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(t, e));
      throw e;
    }
  }

  const columns: Column<Client>[] = [
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
    { id: "contact_name", header: t("clients.contactName"), sortable: true, cell: (r) => r.contact_name ?? "—" },
    { id: "email", header: t("auth.email"), sortable: true, cell: (r) => <span className="ltr-nums">{r.email ?? "—"}</span> },
    { id: "phone", header: t("common.phone"), sortable: true, cell: (r) => <span className="ltr-nums">{r.phone ?? "—"}</span> },
    {
      id: "actions",
      header: "",
      align: "end",
      cell: (r) =>
        r.deleted_at ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.restore")}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await setClientDeleted(r.id, false);
                toast.success(t("common.restored"));
                await refresh();
              } catch (err) {
                toast.error(errorMessage(t, err));
              }
            }}
          >
            <RotateCcw />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.delete")}
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(r);
            }}
          >
            <Trash2 />
          </Button>
        ),
    },
  ];

  async function onExport() {
    const { rows } = await fetchClients(companyId, list.state, { all: true });
    await exportToExcel(
      t("clients.title"),
      t("clients.title"),
      [
        { header: t("common.name"), value: (r: Client) => r.name, width: 30 },
        { header: t("clients.contactName"), value: (r) => r.contact_name, width: 24 },
        { header: t("auth.email"), value: (r) => r.email, width: 28 },
        { header: t("common.phone"), value: (r) => r.phone },
        { header: t("common.address"), value: (r) => r.address, width: 30 },
        { header: t("common.taxId"), value: (r) => r.tax_id },
      ],
      rows,
    );
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader title={t("clients.title")} description={t("clients.subtitle")} />
      <DataTable
        columns={columns}
        rows={query.data?.rows}
        total={query.data?.total}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        list={list}
        rowKey={(r) => r.id}
        onRowClick={(r) => {
          if (r.deleted_at) return;
          setEditing(r);
          setFormOpen(true);
        }}
        isDeleted={(r) => Boolean(r.deleted_at)}
        allowShowDeleted
        onExport={onExport}
        emptyTitle={t("clients.emptyTitle")}
        emptyDescription={t("clients.emptyHint")}
        emptyAction={
          <Button onClick={openNew}>
            <Plus /> {t("clients.new")}
          </Button>
        }
        actions={
          <Button onClick={openNew}>
            <Plus /> {t("clients.new")}
          </Button>
        }
        mobileCard={(r) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">{[r.contact_name, r.phone].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        )}
      />
      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} onSubmit={submit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        title={t("clients.deleteTitle")}
        description={t("clients.deleteBody", { name: deleting?.name ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await setClientDeleted(deleting.id, true);
            toast.success(t("common.deleted"));
            await refresh();
          } catch (e) {
            toast.error(errorMessage(t, e));
          }
        }}
      />
    </>
  );
}
