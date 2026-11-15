import * as React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { cycleSort, pageCount, PAGE_SIZES } from "@/lib/list";
import { errorMessage } from "@/lib/errors";
import type { ListStateApi } from "@/hooks/useListState";
import { EmptyState, ErrorState } from "./States";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  /** Hidden on small screens (cards are shown instead of the table below `md`). */
  align?: "start" | "end" | "center";
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  list: ListStateApi;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Compact card for phones. Falls back to the table if omitted. */
  mobileCard?: (row: T) => React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onExport?: () => Promise<void>;
  allowShowDeleted?: boolean;
  isDeleted?: (row: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  total,
  isLoading,
  error,
  onRetry,
  list,
  rowKey,
  onRowClick,
  mobileCard,
  filters,
  actions,
  onExport,
  allowShowDeleted,
  isDeleted,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: Props<T>) {
  const { t } = useTranslation();
  const [exporting, setExporting] = React.useState(false);
  const { state } = list;
  const pages = pageCount(total ?? 0, state.pageSize);
  const from = total ? (state.page - 1) * state.pageSize + 1 : 0;
  const to = Math.min(total ?? 0, state.page * state.pageSize);
  const hasActiveFilters = Boolean(state.q) || Object.keys(state.filters).length > 0 || state.showDeleted;

  async function handleExport() {
    if (!onExport) return;
    setExporting(true);
    try {
      await onExport();
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setExporting(false);
    }
  }

  const sortIcon = (id: string) => {
    if (state.sort?.id !== id) return <ArrowUpDown className="size-3 opacity-50" aria-hidden />;
    return state.sort.desc ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />;
  };

  const ariaSort = (id: string): React.AriaAttributes["aria-sort"] =>
    state.sort?.id === id ? (state.sort.desc ? "descending" : "ascending") : "none";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={list.searchInput}
            onChange={(e) => list.setSearchInput(e.target.value)}
            placeholder={t("common.search")}
            aria-label={t("common.search")}
            className="ps-8"
          />
        </div>
        {filters}
        {allowShowDeleted ? (
          <label className="flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={state.showDeleted} onCheckedChange={(v) => list.setShowDeleted(v === true)} />
            {t("common.showDeleted")}
          </label>
        ) : null}
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={list.clearFilters}>
            <X /> {t("common.clearFilters")}
          </Button>
        ) : null}
        <div className="flex gap-2 md:ms-auto">
          {onExport ? (
            <Button variant="outline" onClick={handleExport} disabled={exporting || !total}>
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              {t("common.exportExcel")}
            </Button>
          ) : null}
          {actions}
        </div>
      </div>

      {error ? (
        <ErrorState message={errorMessage(t, error)} onRetry={onRetry} />
      ) : isLoading ? (
        <div className="grid gap-2" aria-busy="true" aria-label={t("common.loading")}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t("common.noResults") : (emptyTitle ?? t("common.emptyTitle"))}
          description={hasActiveFilters ? t("common.noResultsHint") : emptyDescription}
          action={hasActiveFilters ? undefined : emptyAction}
        />
      ) : (
        <>
          {mobileCard ? (
            <ul className="grid gap-2 md:hidden">
              {rows.map((row) => (
                <li key={rowKey(row)}>
                  <button
                    type="button"
                    disabled={!onRowClick}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "w-full rounded-lg border bg-card p-3 text-start shadow-sm min-h-touch",
                      onRowClick && "active:bg-muted",
                      isDeleted?.(row) && "opacity-60",
                    )}
                  >
                    {mobileCard(row)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className={cn("rounded-lg border bg-card", mobileCard && "hidden md:block")}>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead
                      key={c.id}
                      aria-sort={c.sortable ? ariaSort(c.id) : undefined}
                      className={cn(c.align === "end" && "text-end", c.align === "center" && "text-center", c.className)}
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                          onClick={() => list.setSort(cycleSort(state.sort, c.id))}
                        >
                          {c.header}
                          {sortIcon(c.id)}
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className={cn(onRowClick && "cursor-pointer", isDeleted?.(row) && "opacity-60")}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter") onRowClick(row);
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={c.id}
                        className={cn(c.align === "end" && "text-end num", c.align === "center" && "text-center", c.className)}
                      >
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {total ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
          aria-label={t("common.pagination")}
        >
          <span className="num">{t("common.showing", { from, to, total })}</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="hidden sm:inline">{t("common.rowsPerPage")}</span>
              <NativeSelect
                value={state.pageSize}
                onChange={(e) => list.setPageSize(Number(e.target.value))}
                className="h-8 w-20"
                aria-label={t("common.rowsPerPage")}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <Button
              variant="outline"
              size="icon"
              onClick={() => list.setPage(state.page - 1)}
              disabled={state.page <= 1}
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <span className="num">{t("common.page", { page: state.page, pages })}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => list.setPage(state.page + 1)}
              disabled={state.page >= pages}
              aria-label={t("common.next")}
            >
              <ChevronRight className="rtl:rotate-180" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
