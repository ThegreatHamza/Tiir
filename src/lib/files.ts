import { signedUrl } from "./supabase";

/** Opens a private file in a new tab through a short-lived signed URL. */
export async function openFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const url = await signedUrl(path);
  if (url) window.open(url, "_blank", "noopener");
}
