import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { offlineDb } from "./store";

/**
 * Keeps the last fetched data in IndexedDB so site screens open offline
 * (projects, current BoQ, workers, equipment, stock places…).
 */
export const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => (await offlineDb.kv.get(key))?.value ?? null,
    setItem: async (key, value) => {
      await offlineDb.kv.put({ key, value });
    },
    removeItem: async (key) => {
      await offlineDb.kv.delete(key);
    },
  },
  key: "tiir-query-cache",
  throttleTime: 2000,
});

/** Large office-only data (estimates, generic registers) is not kept offline. */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return !queryKey.some((k) => k === "estimate" || k === "crud" || k === "price-resources");
}
