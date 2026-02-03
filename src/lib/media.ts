import { encrypt, decrypt, generateIV } from "@/lib/crypto";
import { toHex, fromHex, toArrayBuffer } from "@/lib/crypto-utils";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const MAX_IMAGES_PER_ENTRY = 4;

export interface MediaRecord {
  id: string;
  entry_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | null;
  created_at: string;
}

export interface DecryptedMedia {
  id: string;
  objectUrl: string;
  mimeType: string;
}

/**
 * Process an image file: strip EXIF by re-rendering through canvas,
 * resize to max dimension, output as JPEG blob.
 */
export async function processImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Scale down if exceeds max dimension
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
}

/**
 * Encrypt raw image bytes using AES-256-GCM.
 */
export async function encryptMedia(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = generateIV();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    data,
  );
  return { ciphertext: new Uint8Array(encrypted), iv };
}

/**
 * Decrypt image bytes using AES-256-GCM.
 */
export async function decryptMedia(
  key: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
}

/**
 * Process, encrypt, and upload a single image for an entry.
 * Returns the created media record.
 */
export async function uploadMedia(
  supabase: SupabaseClient,
  key: CryptoKey,
  userId: string,
  entryId: string,
  file: File,
): Promise<MediaRecord> {
  // Process image (strip EXIF, resize, compress)
  const processed = await processImage(file);
  const arrayBuffer = await processed.arrayBuffer();

  // Encrypt
  const { ciphertext, iv } = await encryptMedia(key, arrayBuffer);

  // Generate a unique ID for the storage path
  const mediaId = crypto.randomUUID();
  const storagePath = `${userId}/${mediaId}`;

  // Upload encrypted blob to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("encrypted-media")
    .upload(storagePath, ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Insert media record
  const { data: record, error: insertError } = await supabase
    .from("media")
    .insert({
      id: mediaId,
      entry_id: entryId,
      user_id: userId,
      storage_path: storagePath,
      iv: "\\x" + toHex(iv),
      mime_type: "image/jpeg",
      size_bytes: ciphertext.length,
    })
    .select("id, entry_id, storage_path, mime_type, size_bytes, created_at")
    .single();

  if (insertError || !record) {
    // Clean up uploaded file on DB insert failure
    await supabase.storage.from("encrypted-media").remove([storagePath]);
    throw new Error(insertError?.message ?? "Failed to create media record");
  }

  return record;
}

/**
 * Fetch and decrypt all media for an entry.
 * Returns decrypted object URLs (caller must revoke when done).
 */
export async function getMediaForEntry(
  supabase: SupabaseClient,
  key: CryptoKey,
  entryId: string,
): Promise<DecryptedMedia[]> {
  const { data: records, error } = await supabase
    .from("media")
    .select("id, storage_path, iv, mime_type")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });

  if (error || !records || records.length === 0) return [];

  const results: DecryptedMedia[] = [];

  for (const record of records) {
    try {
      // Download encrypted blob
      const { data: blob, error: downloadError } = await supabase.storage
        .from("encrypted-media")
        .download(record.storage_path);

      if (downloadError || !blob) continue;

      // Decrypt
      const encryptedBytes = new Uint8Array(await blob.arrayBuffer());
      const iv = fromHex(record.iv);
      const decrypted = await decryptMedia(key, encryptedBytes, iv);

      // Create object URL
      const decryptedBlob = new Blob([decrypted], { type: record.mime_type });
      const objectUrl = URL.createObjectURL(decryptedBlob);

      results.push({
        id: record.id,
        objectUrl,
        mimeType: record.mime_type,
      });
    } catch {
      // Skip media that fails to decrypt
    }
  }

  return results;
}

/**
 * Get the count of media attachments for multiple entries (no decryption).
 */
export async function getMediaCounts(
  supabase: SupabaseClient,
  _entryIds?: string[],
): Promise<Record<string, number>> {
  // Query all media for the current user (RLS scopes to auth.uid()).
  // Avoids .in() with many UUIDs which can exceed URL length limits.
  const { data, error } = await supabase
    .from("media")
    .select("entry_id");

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.entry_id] = (counts[row.entry_id] || 0) + 1;
  }
  return counts;
}

/**
 * Delete all media for an entry (both storage files and DB records).
 */
export async function deleteMediaForEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<void> {
  // Get storage paths first
  const { data: records } = await supabase
    .from("media")
    .select("storage_path")
    .eq("entry_id", entryId);

  if (records && records.length > 0) {
    // Delete from storage
    const paths = records.map((r) => r.storage_path);
    await supabase.storage.from("encrypted-media").remove(paths);

    // Delete DB records
    await supabase.from("media").delete().eq("entry_id", entryId);
  }
}

/**
 * Delete specific media items by ID.
 */
export async function deleteMediaByIds(
  supabase: SupabaseClient,
  mediaIds: string[],
): Promise<void> {
  if (mediaIds.length === 0) return;

  const { data: records } = await supabase
    .from("media")
    .select("id, storage_path")
    .in("id", mediaIds);

  if (records && records.length > 0) {
    const paths = records.map((r) => r.storage_path);
    await supabase.storage.from("encrypted-media").remove(paths);
    await supabase.from("media").delete().in("id", mediaIds);
  }
}

export { MAX_IMAGES_PER_ENTRY };
