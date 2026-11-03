import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * File storage on Supabase Storage. Uploads return a public URL, so downstream
 * code (and the résumé-serve route, which just fetches the URL) only deals in URLs.
 */

export type StorageBucket = "resumes" | "newsletter" | "avatars" | "covers";

/** True when Supabase Storage is configured/usable. */
export function storageEnabled(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Filesystem-safe object key with a random prefix to avoid collisions. */
function safeKey(filename: string): string {
  const clean = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-").replace(/-+/g, "-").slice(-80);
  return `${randomUUID()}-${clean || "file"}`;
}

/**
 * Upload a file to a public bucket and return its public URL.
 * @param bucket - Logical bucket ("resumes" | "newsletter").
 * @param file - The uploaded File.
 * @param contentType - MIME type to store it as.
 */
export async function uploadPublicFile(
  bucket: StorageBucket,
  file: File,
  contentType: string,
): Promise<string> {
    const key = safeKey(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sb = supabaseAdmin();
    const { error } = await sb.storage.from(bucket).upload(key, bytes, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return sb.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}
