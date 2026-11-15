import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Browser client. Uses only the public anon key; every request is checked
 * by Row Level Security. The service role key is never used in the frontend.
 */
export const supabase = createClient<Database>(url || "http://localhost:54321", anonKey || "missing-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

/** Storage bucket and path convention: company_id/project_id|_company/module/file */
export const STORAGE_BUCKET = "tiir";

export function storagePath(companyId: string, projectId: string | null, module: string, fileName: string): string {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .slice(-120);
  return `${companyId}/${projectId ?? "_company"}/${module}/${Date.now()}-${safe}`;
}

/** Signed URL for a private object (default 1 hour). */
export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
