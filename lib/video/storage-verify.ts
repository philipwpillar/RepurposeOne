import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStorageObjectPath } from "@/lib/video/storage-path";

/**
 * Confirm an object exists at storage_path in the private bundle-media bucket.
 * Uses folder list + exact name match (≤1 list call per check).
 */
export async function bundleMediaObjectExists(
  admin: SupabaseClient,
  storagePath: string
): Promise<boolean> {
  const parsed = parseStorageObjectPath(storagePath);
  if (!parsed) return false;

  const { data, error } = await admin.storage
    .from("bundle-media")
    .list(parsed.folder, {
      limit: 100,
      search: parsed.filename,
    });

  if (error) {
    console.error(
      `[bundle] storage list failed for ${storagePath}:`,
      error.message
    );
    return false;
  }

  return (data ?? []).some((entry) => entry.name === parsed.filename);
}
