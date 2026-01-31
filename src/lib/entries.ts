import { encrypt, decrypt } from "@/lib/crypto";
import { toBase64, fromBase64 } from "@/lib/crypto-utils";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EntryBlob {
  body: string;
  mood: number | null;
  tags: string[];
}

export interface DecryptedEntry {
  id: string;
  body: string;
  mood: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export async function createEntry(
  supabase: SupabaseClient,
  key: CryptoKey,
  userId: string,
  blob: EntryBlob,
): Promise<string> {
  const plaintext = JSON.stringify(blob);
  const { ciphertext, iv } = await encrypt(key, plaintext);

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      user_id: userId,
      encrypted_blob: toBase64(ciphertext),
      iv: toBase64(iv),
    })
    .select("id")
    .single();

  if (entryError || !entry) throw new Error(entryError?.message ?? "Failed to create entry");

  // Upsert tags and link to entry
  for (const tagName of blob.tags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ user_id: userId, name: tagName }, { onConflict: "user_id,name" })
      .select("id")
      .single();

    if (tag) {
      await supabase
        .from("entry_tags")
        .upsert({ entry_id: entry.id, tag_id: tag.id }, { onConflict: "entry_id,tag_id" });
    }
  }

  return entry.id;
}

export async function listEntries(
  supabase: SupabaseClient,
  key: CryptoKey,
  tagFilter?: string,
): Promise<DecryptedEntry[]> {
  let query = supabase
    .from("entries")
    .select("id, encrypted_blob, iv, created_at, updated_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  // If filtering by tag, get entry IDs that have this tag first
  if (tagFilter) {
    const { data: tagData } = await supabase
      .from("tags")
      .select("id")
      .eq("name", tagFilter)
      .single();

    if (!tagData) return [];

    const { data: entryTagData } = await supabase
      .from("entry_tags")
      .select("entry_id")
      .eq("tag_id", tagData.id);

    if (!entryTagData || entryTagData.length === 0) return [];

    const entryIds = entryTagData.map((et) => et.entry_id);
    query = query.in("id", entryIds);
  }

  const { data: rows, error } = await query;

  if (error || !rows) return [];

  const entries: DecryptedEntry[] = [];

  for (const row of rows) {
    try {
      const plaintext = await decrypt(key, fromBase64(row.encrypted_blob), fromBase64(row.iv));
      const blob: EntryBlob = JSON.parse(plaintext);
      entries.push({
        id: row.id,
        body: blob.body,
        mood: blob.mood,
        tags: blob.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    } catch {
      // Skip entries that fail to decrypt (shouldn't happen with correct key)
    }
  }

  return entries;
}

export async function getEntry(
  supabase: SupabaseClient,
  key: CryptoKey,
  entryId: string,
): Promise<DecryptedEntry | null> {
  const { data: row, error } = await supabase
    .from("entries")
    .select("id, encrypted_blob, iv, created_at, updated_at")
    .eq("id", entryId)
    .is("deleted_at", null)
    .single();

  if (error || !row) return null;

  try {
    const plaintext = await decrypt(key, fromBase64(row.encrypted_blob), fromBase64(row.iv));
    const blob: EntryBlob = JSON.parse(plaintext);
    return {
      id: row.id,
      body: blob.body,
      mood: blob.mood,
      tags: blob.tags,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch {
    return null;
  }
}

export async function listTags(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from("tags").select("id, name").order("name");

  if (error || !data) return [];
  return data;
}
