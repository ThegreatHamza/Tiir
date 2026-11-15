/** Pure parts of the offline sync, unit tested. */
import type { QueueItem } from "./store";

/** Parents before children: a report must exist before its lines. */
const TABLE_ORDER: Record<string, number> = {
  daily_reports: 0,
  site_issues: 0,
  deliveries: 0,
  photos: 2,
  daily_report_labour: 1,
  daily_report_equipment: 1,
  daily_report_materials: 1,
  progress_entries: 1,
  incidents: 1,
  attendance: 1,
  delivery_lines: 1,
  stock_movements: 2,
  equipment_logs: 1,
};

export function orderQueue(items: readonly QueueItem[]): QueueItem[] {
  return [...items]
    .filter((i) => i.status === "pending")
    .sort((a, b) => (TABLE_ORDER[a.table] ?? 5) - (TABLE_ORDER[b.table] ?? 5) || a.createdAt - b.createdAt);
}

/** Network problems are retried later; anything else is a real rejection. */
export function isNetworkError(error: unknown): boolean {
  const msg = String((error as { message?: string } | null)?.message ?? error ?? "");
  return /Failed to fetch|NetworkError|Load failed|network|ERR_INTERNET|timeout|503|502|504/i.test(msg);
}

/** After an upsert, compare the server's client_updated_at with ours. */
export function syncOutcome(localClientUpdatedAt: string, serverClientUpdatedAt: string | null | undefined): "applied" | "overwritten" {
  if (!serverClientUpdatedAt) return "applied";
  return new Date(serverClientUpdatedAt).getTime() > new Date(localClientUpdatedAt).getTime() ? "overwritten" : "applied";
}

/** Exponential back-off for failed attempts: 5 s, 10 s, 20 s … capped at 10 min. */
export function retryDelay(attempts: number): number {
  return Math.min(600_000, 5000 * 2 ** Math.max(0, attempts - 1));
}

/** Builds the row actually sent: client fields + sync metadata. */
export function preparePayload(payload: Record<string, unknown>, clientUpdatedAt: string): Record<string, unknown> {
  const { created_at: _c, updated_at: _u, created_by: _b, ...rest } = payload;
  return { ...rest, client_updated_at: clientUpdatedAt };
}

export function newId(): string {
  return crypto.randomUUID();
}
