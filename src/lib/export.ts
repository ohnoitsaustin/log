import JSZip from "jszip";
import type { DecryptedEntry } from "@/lib/entries";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createEntry, type EntryBlob } from "@/lib/entries";

/* ── helpers ───────────────────────────────────────── */

function downloadString(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── export ────────────────────────────────────────── */

interface ExportEntry {
  date: string;
  body: string;
  mood: number | null;
  tags: string[];
}

function toExportEntries(entries: DecryptedEntry[]): ExportEntry[] {
  return entries.map((e) => ({
    date: e.created_at,
    body: e.body,
    mood: e.mood,
    tags: e.tags,
  }));
}

export function exportAsJSON(entries: DecryptedEntry[]) {
  const data = toExportEntries(entries);
  const json = JSON.stringify(data, null, 2);
  downloadString(json, "log-export.json", "application/json");
}

export async function exportAsMarkdownZip(entries: DecryptedEntry[]) {
  const zip = new JSZip();

  for (const entry of entries) {
    const date = new Date(entry.created_at);
    const slug = date.toISOString().slice(0, 10);
    const time = date.toISOString().slice(11, 16);
    const filename = `${slug}-${time.replace(":", "")}.md`;

    const frontmatter = [
      "---",
      `date: "${entry.created_at}"`,
      entry.mood !== null ? `mood: ${entry.mood}` : null,
      entry.tags.length > 0 ? `tags: [${entry.tags.map((t) => `"${t}"`).join(", ")}]` : null,
      "---",
    ]
      .filter(Boolean)
      .join("\n");

    zip.file(filename, `${frontmatter}\n\n${entry.body}\n`);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "log-export.zip");
}

/* ── import ────────────────────────────────────────── */

export function parseImportJSON(raw: string): EntryBlob[] {
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Expected a JSON array.");

  return data.map((item: unknown, i: number) => {
    if (typeof item !== "object" || item === null) throw new Error(`Entry ${i} is not an object.`);
    const obj = item as Record<string, unknown>;

    if (typeof obj.body !== "string" || !obj.body.trim())
      throw new Error(`Entry ${i} is missing a "body" field.`);

    return {
      body: obj.body,
      mood: typeof obj.mood === "number" ? obj.mood : null,
      tags: Array.isArray(obj.tags)
        ? obj.tags.filter((t): t is string => typeof t === "string")
        : [],
    };
  });
}

export async function importEntries(
  supabase: SupabaseClient,
  key: CryptoKey,
  userId: string,
  blobs: EntryBlob[],
) {
  for (const blob of blobs) {
    await createEntry(supabase, key, userId, blob);
  }
}
