import Dexie, { type EntityTable } from "dexie";

/** Tables that may be written from a phone while offline (mirrors the spec). */
export const OFFLINE_TABLES = [
  "daily_reports",
  "daily_report_labour",
  "daily_report_equipment",
  "daily_report_materials",
  "progress_entries",
  "incidents",
  "photos",
  "site_issues",
  "attendance",
  "deliveries",
  "delivery_lines",
  "stock_movements",
  "equipment_logs",
] as const;
export type OfflineTable = (typeof OFFLINE_TABLES)[number];

export type QueueItem = {
  /** Same as the row id: a client-generated uuid, so retries never duplicate. */
  id: string;
  table: OfflineTable;
  payload: Record<string, unknown>;
  /** When the user made the change on the device (last write wins). */
  clientUpdatedAt: string;
  createdAt: number;
  attempts: number;
  status: "pending" | "failed";
  error?: string;
  /** Photo blob to upload before the row (photos only). */
  blobId?: string;
  /** Label shown in the sync panel. */
  label: string;
  companyId: string;
};

export type PendingBlob = { id: string; blob: Blob; path: string; contentType: string };
export type SyncEvent = {
  id: string;
  at: number;
  table: OfflineTable;
  label: string;
  kind: "overwritten" | "failed" | "synced";
  message?: string;
  seen: boolean;
};
export type KvItem = { key: string; value: string };

class OfflineDb extends Dexie {
  queue!: EntityTable<QueueItem, "id">;
  blobs!: EntityTable<PendingBlob, "id">;
  events!: EntityTable<SyncEvent, "id">;
  kv!: EntityTable<KvItem, "key">;
  constructor() {
    super("tiir-offline");
    this.version(1).stores({
      queue: "id, table, status, createdAt, companyId",
      blobs: "id",
      events: "id, at, seen",
      kv: "key",
    });
  }
}

export const offlineDb = new OfflineDb();
