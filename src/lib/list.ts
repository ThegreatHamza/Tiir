/** Server-side list helpers (search, sort, pagination) shared by every list. Pure, unit tested. */

export type SortState = { id: string; desc: boolean } | null;

export type ListParams = {
  q: string;
  page: number; // 1-based
  pageSize: number;
  sort: SortState;
  filters: Record<string, string>;
  showDeleted: boolean;
};

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
/** Upper bound for "export all matching rows" to Excel. */
export const EXPORT_LIMIT = 10_000;

export function parseSort(value: string | null): SortState {
  if (!value) return null;
  const desc = value.startsWith("-");
  const id = desc ? value.slice(1) : value;
  return /^[a-z_][a-z0-9_]*$/.test(id) ? { id, desc } : null;
}

export function serializeSort(sort: SortState): string | null {
  return sort ? `${sort.desc ? "-" : ""}${sort.id}` : null;
}

/** Next sort when a column header is clicked: asc → desc → none. */
export function cycleSort(current: SortState, id: string): SortState {
  if (!current || current.id !== id) return { id, desc: false };
  if (!current.desc) return { id, desc: true };
  return null;
}

/** Inclusive [from, to] range for PostgREST .range(). */
export function pageRange(page: number, pageSize: number): [number, number] {
  const p = Math.max(1, Math.floor(page));
  const from = (p - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Builds a PostgREST `or` filter that searches several text columns
 * (case-insensitive, contains). Values are quoted so commas and
 * parentheses in user input cannot inject filters.
 */
export function searchFilter(columns: readonly string[], q: string): string | null {
  const term = q.trim();
  if (!term || columns.length === 0) return null;
  const escaped = term
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[%_]/g, (m) => `\\${m}`);
  return columns.map((c) => `${c}.ilike."%${escaped}%"`).join(",");
}

/** Only allows sorting on whitelisted columns. */
export function safeSort(
  sort: SortState,
  allowed: readonly string[],
  fallback: { id: string; desc: boolean },
): { id: string; desc: boolean } {
  return sort && allowed.includes(sort.id) ? sort : fallback;
}
