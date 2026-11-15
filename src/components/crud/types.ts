import type * as React from "react";
import type { TableName, ViewName, RowOf } from "@/lib/db";
import type { ExcelColumn } from "@/lib/export/excel";
import type { OfflineTable } from "@/lib/offline/store";

export type Option = { value: string; label: string };

export type FieldType = "text" | "textarea" | "number" | "money" | "percent" | "date" | "select" | "relation" | "checkbox" | "file";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  /** For `select`. */
  options?: Option[];
  /** For `relation`: rows of `table` (same company/project) shown as `label`. */
  relation?: {
    table: TableName | ViewName;
    label: (row: Record<string, unknown>) => string;
    scope?: "company" | "project";
    filter?: Record<string, string | boolean | null>;
    order?: string;
    allowEmpty?: boolean;
    /** Column used as the stored value (default "id"). */
    valueKey?: string;
  };
  /** For `file`: storage module folder (company_id/project_id/<module>/…). */
  module?: string;
  accept?: string;
  /** false keeps images untouched (drawings, scans). */
  compress?: boolean;
  span?: 1 | 2 | 3;
  min?: number;
  max?: number;
  readOnly?: boolean;
  visible?: (values: Record<string, unknown>) => boolean;
  defaultValue?: unknown;
  /** Database value → form text (e.g. a JSON list shown one item per line). */
  toForm?: (value: unknown) => string;
};

export type CrudColumn<R> = {
  id: string;
  header: string;
  cell: (row: R) => React.ReactNode;
  sortable?: boolean;
  align?: "start" | "end" | "center";
  className?: string;
  /** Value written to Excel (defaults to nothing = column not exported). */
  exportValue?: (row: R) => string | number | boolean | null | undefined;
  numFmt?: string;
};

export type CrudFilter = { name: string; label: string; options: Option[]; column?: string };

export type CrudConfig<T extends TableName, V extends TableName | ViewName = T> = {
  /** Table written to. */
  table: T;
  /** Table or view read from (defaults to `table`). */
  view?: V;
  scope: "company" | "project";
  title: string;
  subtitle?: string;
  singular: string;
  emptyTitle?: string;
  emptyHint?: string;
  columns: CrudColumn<RowOf<V>>[];
  searchColumns: string[];
  sortable: string[];
  defaultSort: { id: string; desc: boolean };
  filters?: CrudFilter[];
  /** Fixed filters, e.g. { status: "open" }. */
  where?: Record<string, string | boolean | null>;
  fields: FieldDef[];
  /** Adjusts form values before insert/update. */
  toPayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  canWrite: boolean;
  canDelete?: boolean;
  mobileCard?: (row: RowOf<V>) => React.ReactNode;
  rowActions?: (row: RowOf<V>, refresh: () => void) => React.ReactNode;
  headerActions?: (refresh: () => void) => React.ReactNode;
  exportName?: string;
  /** false for views without deleted_at (no soft delete filter, no delete button). */
  softDelete?: boolean;
  /** Saves through the offline queue (site registers). */
  offline?: OfflineTable;
  /** Unique key when the view has no id column. */
  rowKey?: (row: RowOf<V>) => string;
  /** Second sort column for stable paging (default "id"). */
  tiebreak?: string;
  /** Replaces "click a row to edit". */
  onRowClick?: (row: RowOf<V>) => void;
  extraExport?: ExcelColumn<RowOf<V>>[];
};
