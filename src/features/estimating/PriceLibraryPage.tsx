import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { useListState } from "@/hooks/useListState";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { exportToExcel, moneyNumFmt } from "@/lib/export/excel";
import { CURRENCIES } from "@/lib/calc/money";
import { RESOURCE_KINDS } from "@/lib/import/priceResources";
import { can } from "@/lib/roles";
import { currentLanguage } from "@/i18n";
import { fetchResources, saveResource, setResourceDeleted, type PriceResource } from "./api";
import { ResourceFormDialog, type ResourceFormOut } from "./ResourceFormDialog";
import { ImportResourcesDialog } from "./ImportResourcesDialog";

export const estimatingKeys = {
  resources: (companyId: string) => ["company", companyId, "price-resources"] as const,
};

export function PriceLibraryPage() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const queryClient = useQueryClient();
  const { companyId, role } = useCurrentCompany();
  const editable = can.editEstimate(role);
  const list = useListState({ id: "code", desc: false });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PriceResource | null>(null);
  const [deleting, setDeleting] = useState<PriceResource | null>(null);
  const [importing, setImporting] = useState(false);

  const query = useQuery({
    queryKey: [...estimatingKeys.resources(companyId), list.state],
    queryFn: () => fetchResources(companyId, list.state),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: estimatingKeys.resources(companyId) });

  async function submit(v: ResourceFormOut) {
    try {
      await saveResource(editing?.id ?? null, { company_id: companyId, ...v });
      toast.success(t("common.saved"));
      setFormOpen(false);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(t, e));
      throw e;
    }
  }

  const columns: Column<PriceResource>[] = [
    { id: "code", header: t("common.code"), sortable: true, cell: (r) => <span className="font-mono text-xs ltr-nums">{r.code}</span> },
    {
      id: "name",
      header: t("estimating.designation"),
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
    {
      id: "kind",
      header: t("estimating.resources.kind"),
      sortable: true,
      cell: (r) => <Badge variant="secondary">{t(`estimating.kinds.${r.kind}`)}</Badge>,
    },
    { id: "unit", header: t("estimating.unit"), sortable: true, cell: (r) => t(`units.${r.unit}`) },
    {
      id: "unit_cost",
      header: t("estimating.unitCost"),
      sortable: true,
      align: "end",
      cell: (r) => formatMoney(r.unit_cost, r.currency, lang),
    },
    {
      id: "updated_at",
      header: t("estimating.resources.updated"),
      sortable: true,
      cell: (r) => <span className="num">{formatDate(r.updated_at)}</span>,
    },
    ...(editable
      ? [
          {
            id: "actions",
            header: "",
            align: "end" as const,
            cell: (r: PriceResource) =>
              r.deleted_at ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.restore")}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await setResourceDeleted(r.id, false);
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
        ]
      : []),
  ];

  async function onExport() {
    const { rows } = await fetchResources(companyId, list.state, { all: true });
    await exportToExcel(
      t("estimating.resources.title"),
      t("estimating.resources.title"),
      [
        { header: t("common.code"), value: (r: PriceResource) => r.code },
        { header: t("estimating.designation"), value: (r) => r.name, width: 36 },
        { header: t("estimating.resources.kind"), value: (r) => t(`estimating.kinds.${r.kind}`), width: 16 },
        { header: t("estimating.unit"), value: (r) => t(`units.${r.unit}`) },
        { header: t("estimating.unitCost"), value: (r) => r.unit_cost, numFmt: moneyNumFmt(2), width: 14 },
        { header: t("common.currency"), value: (r) => r.currency },
        { header: t("estimating.resources.supplier"), value: (r) => r.supplier_name, width: 22 },
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
      <PageHeader title={t("estimating.resources.title")} description={t("estimating.resources.subtitle")} />
      <DataTable
        columns={columns}
        rows={query.data?.rows}
        total={query.data?.total}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        list={list}
        rowKey={(r) => r.id}
        onRowClick={
          editable
            ? (r) => {
                if (r.deleted_at) return;
                setEditing(r);
                setFormOpen(true);
              }
            : undefined
        }
        isDeleted={(r) => Boolean(r.deleted_at)}
        allowShowDeleted={editable}
        onExport={onExport}
        emptyTitle={t("estimating.resources.emptyTitle")}
        emptyDescription={t("estimating.resources.emptyHint")}
        emptyAction={
          editable ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImporting(true)}>
                <FileUp /> {t("estimating.import.title")}
              </Button>
              <Button onClick={openNew}>
                <Plus /> {t("estimating.resources.new")}
              </Button>
            </div>
          ) : null
        }
        filters={
          <>
            <NativeSelect
              aria-label={t("estimating.resources.kind")}
              className="md:w-44"
              value={list.state.filters.kind ?? ""}
              onChange={(e) => list.setFilter("kind", e.target.value)}
            >
              <option value="">{t("estimating.resources.allKinds")}</option>
              {RESOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`estimating.kinds.${k}`)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={t("common.currency")}
              className="md:w-32"
              value={list.state.filters.currency ?? ""}
              onChange={(e) => list.setFilter("currency", e.target.value)}
            >
              <option value="">{t("estimating.resources.allCurrencies")}</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </>
        }
        actions={
          editable ? (
            <>
              <Button variant="outline" onClick={() => setImporting(true)}>
                <FileUp /> {t("estimating.import.short")}
              </Button>
              <Button onClick={openNew}>
                <Plus /> {t("estimating.resources.new")}
              </Button>
            </>
          ) : null
        }
        mobileCard={(r) => (
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground ltr-nums">{r.code}</span>
              <Badge variant="secondary">{t(`estimating.kinds.${r.kind}`)}</Badge>
            </div>
            <p className="font-medium">{r.name}</p>
            <p className="text-sm num">
              {formatMoney(r.unit_cost, r.currency, lang)} / {t(`units.${r.unit}`)}
            </p>
          </div>
        )}
      />
      <ResourceFormDialog open={formOpen} onOpenChange={setFormOpen} resource={editing} onSubmit={submit} />
      <ImportResourcesDialog open={importing} onOpenChange={setImporting} onImported={() => void refresh()} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        title={t("estimating.resources.deleteTitle")}
        description={t("estimating.resources.deleteBody", { name: deleting?.name ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await setResourceDeleted(deleting.id, true);
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
