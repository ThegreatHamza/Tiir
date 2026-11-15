import * as React from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useListState } from "@/hooks/useListState";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { db, type RowOf, type TableName, type ViewName } from "@/lib/db";
import { EXPORT_LIMIT, pageRange, safeSort, searchFilter, type ListParams } from "@/lib/list";
import { errorMessage } from "@/lib/errors";
import { exportToExcel } from "@/lib/export/excel";
import type { CurrencyCode } from "@/lib/calc/money";
import { enqueue, onSynced } from "@/lib/offline/sync";
import { CrudForm } from "./CrudForm";
import type { CrudConfig } from "./types";

type AnyRow = Record<string, unknown> & { id: string; deleted_at?: string | null };

async function fetchCrud(
  cfg: CrudConfig<TableName, TableName | ViewName>,
  companyId: string,
  projectId: string | undefined,
  p: ListParams,
  all = false,
) {
  const sort = safeSort(p.sort, cfg.sortable, cfg.defaultSort);
  let q = db
    .from(cfg.view ?? cfg.table)
    .select("*", { count: "exact" })
    .eq("company_id", companyId);
  if (cfg.scope === "project" && projectId) q = q.eq("project_id", projectId);
  if (cfg.softDelete !== false && !p.showDeleted) q = q.is("deleted_at", null);
  for (const [k, v] of Object.entries(cfg.where ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
  const or = searchFilter(cfg.searchColumns, p.q);
  if (or) q = q.or(or);
  for (const f of cfg.filters ?? []) {
    const v = p.filters[f.name];
    if (v && f.options.some((o) => o.value === v)) q = q.eq(f.column ?? f.name, v);
  }
  q = q.order(sort.id, { ascending: !sort.desc, nullsFirst: false }).order(cfg.tiebreak ?? "id");
  const [from, to] = all ? [0, EXPORT_LIMIT - 1] : pageRange(p.page, p.pageSize);
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as AnyRow[], total: count ?? 0 };
}

/**
 * Generic list + form screen: search, filters, sort, pagination, Excel export,
 * create/edit dialog, soft delete and restore. Used by every simple register.
 */
export function CrudPage<T extends TableName, V extends TableName | ViewName = T>({
  config,
  projectId,
  currency,
  embedded,
}: {
  config: CrudConfig<T, V>;
  projectId?: string;
  currency?: CurrencyCode;
  /** Inside another page: no page header. */
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { company, companyId } = useCurrentCompany();
  const cfg = config as unknown as CrudConfig<TableName, TableName | ViewName>;
  const list = useListState(cfg.defaultSort);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AnyRow | null>(null);
  const [deleting, setDeleting] = React.useState<AnyRow | null>(null);
  const key = ["company", companyId, "crud", cfg.table, cfg.view ?? null, projectId ?? null];

  const query = useQuery({
    queryKey: [...key, list.state, cfg.where ?? null],
    queryFn: () => fetchCrud(cfg, companyId, projectId, list.state),
    placeholderData: keepPreviousData,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["company", companyId] });
  React.useEffect(() => {
    if (!cfg.offline) return undefined;
    const off = onSynced(() => void qc.invalidateQueries({ queryKey: key }));
    return () => {
      off();
    };
  }, [cfg.offline]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(payload: Record<string, unknown>) {
    const values = cfg.toPayload ? cfg.toPayload(payload) : payload;
    try {
      if (cfg.offline) {
        // Site registers: saved on the phone first, sent when the network is back.
        await enqueue(
          cfg.offline,
          {
            ...(editing ? editing : {}),
            ...values,
            ...(editing ? { id: editing.id } : {}),
            company_id: companyId,
            ...(cfg.scope === "project" ? { project_id: projectId } : {}),
          },
          { label: cfg.singular, companyId },
        );
        toast.success(navigator.onLine ? t("common.saved") : t("sync.savedOffline"));
        refresh();
        return;
      }
      if (editing) {
        const { error } = await db.from(cfg.table).update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from(cfg.table)
          .insert({ ...values, company_id: companyId, ...(cfg.scope === "project" ? { project_id: projectId } : {}) });
        if (error) throw error;
      }
      toast.success(t("common.saved"));
      refresh();
    } catch (e) {
      toast.error(errorMessage(t, e));
      throw e;
    }
  }

  async function setDeleted(row: AnyRow, deleted: boolean) {
    const { error } = await db
      .from(cfg.table)
      .update({ deleted_at: deleted ? new Date().toISOString() : null })
      .eq("id", row.id);
    if (error) toast.error(errorMessage(t, error));
    else {
      toast.success(deleted ? t("common.deleted") : t("common.restored"));
      refresh();
    }
  }

  const canDelete = cfg.canWrite && cfg.canDelete !== false && cfg.softDelete !== false;
  const columns: Column<AnyRow>[] = [
    ...(cfg.columns as unknown as Column<AnyRow>[]),
    ...(cfg.rowActions || canDelete
      ? [
          {
            id: "_actions",
            header: "",
            align: "end" as const,
            cell: (r: AnyRow) => (
              <div
                className="flex justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="presentation"
              >
                {cfg.rowActions?.(r as unknown as RowOf<TableName | ViewName>, refresh)}
                {canDelete ? (
                  r.deleted_at ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("common.restore")}
                      onClick={() => void setDeleted(r, false)}
                    >
                      <RotateCcw />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="size-8" aria-label={t("common.delete")} onClick={() => setDeleting(r)}>
                      <Trash2 />
                    </Button>
                  )
                ) : null}
              </div>
            ),
          },
        ]
      : []),
  ];

  async function onExport() {
    const { rows } = await fetchCrud(cfg, companyId, projectId, list.state, true);
    const exportCols = (
      cfg.columns as unknown as {
        header: string;
        exportValue?: (r: AnyRow) => string | number | boolean | null | undefined;
        numFmt?: string;
      }[]
    )
      .filter((c) => c.exportValue)
      .map((c) => ({
        header: c.header,
        value: c.exportValue as (r: AnyRow) => string | number | boolean | null | undefined,
        ...(c.numFmt ? { numFmt: c.numFmt } : {}),
        width: Math.max(12, c.header.length + 2),
      }));
    await exportToExcel(cfg.exportName ?? cfg.title, cfg.title, exportCols, rows);
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      {!embedded ? <PageHeader title={cfg.title} description={cfg.subtitle} /> : null}
      <DataTable
        columns={columns}
        rows={query.data?.rows}
        total={query.data?.total}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        list={list}
        rowKey={(r) => (cfg.rowKey ? cfg.rowKey(r as unknown as RowOf<TableName | ViewName>) : r.id)}
        onRowClick={
          cfg.onRowClick
            ? (r) => cfg.onRowClick?.(r as unknown as RowOf<TableName | ViewName>)
            : cfg.fields.length
              ? (r) => {
                  if (r.deleted_at) return;
                  setEditing(r);
                  setFormOpen(true);
                }
              : undefined
        }
        isDeleted={(r) => Boolean(r.deleted_at)}
        allowShowDeleted={canDelete}
        onExport={onExport}
        emptyTitle={cfg.emptyTitle}
        emptyDescription={cfg.emptyHint}
        emptyAction={
          cfg.canWrite ? (
            <Button onClick={openNew}>
              <Plus /> {t("common.add", { what: cfg.singular })}
            </Button>
          ) : null
        }
        filters={
          cfg.filters?.length ? (
            <>
              {cfg.filters.map((f) => (
                <NativeSelect
                  key={f.name}
                  aria-label={f.label}
                  className="md:w-44"
                  value={list.state.filters[f.name] ?? ""}
                  onChange={(e) => list.setFilter(f.name, e.target.value)}
                >
                  <option value="">{f.label}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              ))}
            </>
          ) : null
        }
        actions={
          <>
            {cfg.headerActions?.(refresh)}
            {cfg.canWrite ? (
              <Button onClick={openNew}>
                <Plus /> {t("common.add", { what: cfg.singular })}
              </Button>
            ) : null}
          </>
        }
        mobileCard={cfg.mobileCard as unknown as ((r: AnyRow) => React.ReactNode) | undefined}
      />
      <CrudForm
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `${cfg.singular}` : t("common.add", { what: cfg.singular })}
        fields={cfg.fields}
        row={editing}
        currency={currency ?? company.default_currency}
        companyId={companyId}
        projectId={projectId}
        readOnly={!cfg.canWrite}
        onSubmit={save}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        title={t("common.confirmDeleteTitle", { what: cfg.singular })}
        description={t("common.confirmDeleteBody")}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (deleting) await setDeleted(deleting, true);
        }}
      />
    </>
  );
}
