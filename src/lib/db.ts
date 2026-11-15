import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Database } from "@/types/database";

/**
 * Structural view of the client for the generic CRUD screens, which work on
 * table names chosen by configuration. Table and column names in those
 * configurations are still checked against the generated `Database` types
 * (see `TableName` and `RowOf` below); only the query plumbing is generic.
 */
export type GenericRow = Record<string, unknown>;
type GenericTable = { Row: GenericRow; Insert: GenericRow; Update: GenericRow; Relationships: [] };
type GenericView = { Row: GenericRow; Relationships: [] };
export type GenericDatabase = {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericView>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};

export const db = supabase as unknown as SupabaseClient<GenericDatabase>;

export type TableName = keyof Database["public"]["Tables"];
export type ViewName = keyof Database["public"]["Views"];
export type RowOf<T extends TableName | ViewName> = T extends TableName
  ? Database["public"]["Tables"][T]["Row"]
  : T extends ViewName
    ? Database["public"]["Views"][T]["Row"]
    : never;

/** Calls an RPC by name with loosely typed arguments (generic screens only). */
export async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data as T;
}
