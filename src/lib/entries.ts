import { encrypt, decrypt } from "@/lib/crypto";
import { toHex, fromHex } from "@/lib/crypto-utils";
import { getMediaCounts } from "@/lib/media";
import type { WeatherData } from "@/lib/weather";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EntryBlob {
  body: string;
  mood: number | null;
  energy: number | null;
  location: string;
  weather: WeatherData | null;
  tags: string[];
  activities: string[];
}

export interface DecryptedEntry {
  id: string;
  body: string;
  mood: number | null;
  energy: number | null;
  location: string;
  weather: WeatherData | null;
  tags: string[];
  activities: string[];
  created_at: string;
  updated_at: string;
  mediaCount: number;
}

export async function createEntry(
  supabase: SupabaseClient,
  key: CryptoKey,
  userId: string,
  blob: EntryBlob,
  createdAt?: string,
): Promise<string> {
  const plaintext = JSON.stringify(blob);
  const { ciphertext, iv } = await encrypt(key, plaintext);

  const row: Record<string, unknown> = {
    user_id: userId,
    encrypted_blob: "\\x" + toHex(ciphertext),
    iv: "\\x" + toHex(iv),
  };
  if (createdAt) row.created_at = createdAt;

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert(row)
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

export async function updateEntry(
  supabase: SupabaseClient,
  key: CryptoKey,
  entryId: string,
  userId: string,
  blob: EntryBlob,
): Promise<void> {
  const plaintext = JSON.stringify(blob);
  const { ciphertext, iv } = await encrypt(key, plaintext);

  const { error: updateError } = await supabase
    .from("entries")
    .update({
      encrypted_blob: "\\x" + toHex(ciphertext),
      iv: "\\x" + toHex(iv),
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (updateError) throw new Error(updateError.message);

  // Remove old tag links, then re-link
  await supabase.from("entry_tags").delete().eq("entry_id", entryId);

  for (const tagName of blob.tags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ user_id: userId, name: tagName }, { onConflict: "user_id,name" })
      .select("id")
      .single();

    if (tag) {
      await supabase
        .from("entry_tags")
        .upsert({ entry_id: entryId, tag_id: tag.id }, { onConflict: "entry_id,tag_id" });
    }
  }
}

export async function listEntries(
  supabase: SupabaseClient,
  key: CryptoKey,
  tagFilter?: string,
): Promise<DecryptedEntry[]> {
  // If filtering by tag, resolve entry IDs first
  let tagEntryIds: string[] | null = null;
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

    tagEntryIds = entryTagData.map((et) => et.entry_id);
  }

  // Paginate through all rows (Supabase defaults to 1000 max)
  const PAGE_SIZE = 1000;
  const rows: { id: string; encrypted_blob: string; iv: string; created_at: string; updated_at: string }[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("entries")
      .select("id, encrypted_blob, iv, created_at, updated_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (tagEntryIds) {
      query = query.in("id", tagEntryIds);
    }

    const { data, error } = await query;
    if (error || !data) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const entries: DecryptedEntry[] = [];

  for (const row of rows) {
    try {
      const plaintext = await decrypt(key, fromHex(row.encrypted_blob), fromHex(row.iv));
      const blob: EntryBlob = JSON.parse(plaintext);
      entries.push({
        id: row.id,
        body: blob.body,
        mood: blob.mood,
        energy: blob.energy ?? null,
        location: blob.location ?? "",
        weather: typeof blob.weather === "object" && blob.weather !== null ? blob.weather : null,
        tags: blob.tags ?? [],
        activities: blob.activities ?? [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        mediaCount: 0,
      });
    } catch {
      // Skip entries that fail to decrypt (shouldn't happen with correct key)
    }
  }

  // Fetch media counts for all entries in one query
  if (entries.length > 0) {
    const counts = await getMediaCounts(supabase, entries.map((e) => e.id));
    for (const entry of entries) {
      entry.mediaCount = counts[entry.id] ?? 0;
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
    const plaintext = await decrypt(key, fromHex(row.encrypted_blob), fromHex(row.iv));
    const blob: EntryBlob = JSON.parse(plaintext);
    // Get media count for this entry
    const counts = await getMediaCounts(supabase, [row.id]);
    return {
      id: row.id,
      body: blob.body,
      mood: blob.mood,
      energy: blob.energy ?? null,
      location: blob.location ?? "",
      weather: typeof blob.weather === "object" && blob.weather !== null ? blob.weather : null,
      tags: blob.tags,
      activities: blob.activities,
      created_at: row.created_at,
      updated_at: row.updated_at,
      mediaCount: counts[row.id] ?? 0,
    };
  } catch {
    return null;
  }
}

export async function deleteAllEntries(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from("entries")
    .delete()
    .is("deleted_at", null)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function listTags(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from("tags").select("id, name").order("name");

  if (error || !data) return [];
  return data;
}
