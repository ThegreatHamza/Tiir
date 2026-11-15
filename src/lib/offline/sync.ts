/**
 * Offline queue and sync engine. Site data is written to IndexedDB first
 * (Dexie), then pushed when the connection returns. Each record keeps its
 * client-generated uuid, so a retry is an idempotent upsert. Conflicts:
 * last write wins on the server (by client_updated_at); if someone else's
 * later edit won, the user is told their entry was overwritten.
 */
import { db } from "@/lib/db";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/images";
import { isNetworkError, newId, orderQueue, preparePayload, retryDelay, syncOutcome } from "./logic";
import { offlineDb, type OfflineTable, type QueueItem } from "./store";

let running: Promise<void> | null = null;
const listeners = new Set<() => void>();
export const onSynced = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export async function enqueue(
  table: OfflineTable,
  payload: Record<string, unknown> & { id?: string },
  opts: { label: string; companyId: string },
): Promise<string> {
  const id = (payload.id as string | undefined) ?? newId();
  const now = new Date().toISOString();
  await offlineDb.queue.put({
    id,
    table,
    payload: { ...payload, id },
    clientUpdatedAt: now,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
    label: opts.label,
    companyId: opts.companyId,
  });
  void syncNow();
  return id;
}

/** Queues a photo: compressed on the device, stored locally, uploaded later. */
export async function enqueuePhoto(
  file: File,
  row: Record<string, unknown> & { company_id: string; project_id: string },
  label: string,
): Promise<string> {
  const id = newId();
  const blob = await compressImage(file);
  const path = `${row.company_id}/${row.project_id}/photos/${id}.jpg`;
  await offlineDb.blobs.put({ id, blob, path, contentType: blob.type || "image/jpeg" });
  await offlineDb.queue.put({
    id,
    table: "photos",
    payload: { ...row, id, storage_path: path },
    clientUpdatedAt: new Date().toISOString(),
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
    blobId: id,
    label,
    companyId: row.company_id,
  });
  void syncNow();
  return id;
}

async function pushOne(item: QueueItem): Promise<"applied" | "overwritten"> {
  if (item.blobId) {
    const b = await offlineDb.blobs.get(item.blobId);
    if (b) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(b.path, b.blob, { contentType: b.contentType, upsert: true });
      if (error && !/exists|Duplicate/i.test(error.message)) throw error;
    }
  }
  const body = preparePayload(item.payload, item.clientUpdatedAt);
  const { error } = await db.from(item.table).upsert(body, { onConflict: "id" });
  if (error) throw error;
  const { data } = await db.from(item.table).select("client_updated_at").eq("id", item.id).maybeSingle();
  return syncOutcome(item.clientUpdatedAt, (data?.client_updated_at as string | null | undefined) ?? null);
}

export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const items = orderQueue(await offlineDb.queue.toArray());
      for (const item of items) {
        if (item.attempts > 0 && Date.now() - item.createdAt < retryDelay(item.attempts)) continue;
        try {
          const outcome = await pushOne(item);
          await offlineDb.queue.delete(item.id);
          if (item.blobId) await offlineDb.blobs.delete(item.blobId);
          await offlineDb.events.put({
            id: `${item.id}:${Date.now()}`,
            at: Date.now(),
            table: item.table,
            label: item.label,
            kind: outcome === "overwritten" ? "overwritten" : "synced",
            seen: outcome !== "overwritten",
          });
        } catch (e) {
          if (isNetworkError(e)) {
            await offlineDb.queue.update(item.id, { attempts: item.attempts + 1 });
            break; // offline again: stop and retry later
          }
          const message = String((e as { message?: string }).message ?? e);
          await offlineDb.queue.update(item.id, { status: "failed", error: message, attempts: item.attempts + 1 });
          await offlineDb.events.put({
            id: `${item.id}:${Date.now()}`,
            at: Date.now(),
            table: item.table,
            label: item.label,
            kind: "failed",
            message,
            seen: false,
          });
        }
      }
      await offlineDb.kv.put({ key: "lastSync", value: new Date().toISOString() });
      listeners.forEach((fn) => fn());
    } finally {
      running = null;
    }
  })();
  return running;
}

export async function retryFailed(): Promise<void> {
  await offlineDb.queue.where("status").equals("failed").modify({ status: "pending", attempts: 0, error: undefined });
  await syncNow();
}

export async function discardItem(id: string): Promise<void> {
  const item = await offlineDb.queue.get(id);
  if (item?.blobId) await offlineDb.blobs.delete(item.blobId);
  await offlineDb.queue.delete(id);
}

/** Starts background sync: on reconnect, on focus and every 30 s. */
export function startSync(): () => void {
  const tick = () => void syncNow();
  window.addEventListener("online", tick);
  window.addEventListener("focus", tick);
  const id = window.setInterval(tick, 30_000);
  tick();
  return () => {
    window.removeEventListener("online", tick);
    window.removeEventListener("focus", tick);
    window.clearInterval(id);
  };
}
