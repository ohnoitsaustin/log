import JSZip from "jszip";
import type { DecryptedEntry } from "@/lib/entries";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createEntry, type EntryBlob } from "@/lib/entries";
import { listActivities, createActivity } from "@/lib/activities";
import { getMediaForEntry, type DecryptedMedia } from "@/lib/media";

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
  activities: string[];
}

function toExportEntries(entries: DecryptedEntry[]): ExportEntry[] {
  return entries.map((e) => ({
    date: e.created_at,
    body: e.body,
    mood: e.mood,
    tags: e.tags,
    activities: e.activities,
  }));
}

export function exportAsJSON(entries: DecryptedEntry[]) {
  const data = toExportEntries(entries);
  const json = JSON.stringify(data, null, 2);
  downloadString(json, "log-export.json", "application/json");
}

export async function exportAsMarkdownZip(
  entries: DecryptedEntry[],
  supabase?: SupabaseClient,
  key?: CryptoKey,
) {
  const zip = new JSZip();
  const mediaFolder = zip.folder("media");

  for (const entry of entries) {
    const date = new Date(entry.created_at);
    const slug = date.toISOString().slice(0, 10);
    const time = date.toISOString().slice(11, 16);
    const filename = `${slug}-${time.replace(":", "")}.md`;

    // Fetch and decrypt media for this entry
    let mediaFiles: { name: string; data: DecryptedMedia }[] = [];
    if (supabase && key && entry.mediaCount > 0) {
      const decryptedMedia = await getMediaForEntry(supabase, key, entry.id);
      mediaFiles = decryptedMedia.map((m, i) => ({
        name: `${slug}-${time.replace(":", "")}-${i + 1}.jpg`,
        data: m,
      }));

      // Add media files to zip
      for (const mf of mediaFiles) {
        const response = await fetch(mf.data.objectUrl);
        const blob = await response.blob();
        if (mediaFolder) {
          mediaFolder.file(mf.name, blob);
        }
      }

      // Revoke object URLs
      for (const m of decryptedMedia) {
        URL.revokeObjectURL(m.objectUrl);
      }
    }

    const frontmatter = [
      "---",
      `date: "${entry.created_at}"`,
      entry.mood !== null ? `mood: ${entry.mood}` : null,
      entry.tags.length > 0 ? `tags: [${entry.tags.map((t) => `"${t}"`).join(", ")}]` : null,
      entry.activities.length > 0 ? `activities: [${entry.activities.map((a) => `"${a}"`).join(", ")}]` : null,
      "---",
    ]
      .filter(Boolean)
      .join("\n");

    const mediaMarkdown = mediaFiles
      .map((mf) => `![](media/${mf.name})`)
      .join("\n");

    const content = mediaMarkdown
      ? `${frontmatter}\n\n${entry.body}\n\n${mediaMarkdown}\n`
      : `${frontmatter}\n\n${entry.body}\n`;

    zip.file(filename, content);
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
      activities: Array.isArray(obj.activities)
        ? obj.activities.filter((a): a is string => typeof a === "string")
        : [],
    };
  });
}

export function parseImportCSV(raw: string): EntryBlob[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must contain at least a header and one data row.");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const bodyIndex = headers.indexOf("body");
  if (bodyIndex === -1) throw new Error('CSV must contain a "body" column.');

  return lines.slice(1).map((line, i) => {
    const values = line.split(",").map((v) => v.trim());
    const body = values[bodyIndex];

    return {
      body,
      mood: headers.includes("mood") ? parseFloat(values[headers.indexOf("mood")]) || null : null,
      tags: headers.includes("tags")
        ? values[headers.indexOf("tags")]
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean)
        : [],
      activities: headers.includes("activities")
        ? values[headers.indexOf("activities")]
          .split(";")
          .map((a) => a.trim())
          .filter(Boolean)
        : [],
    };
  });
}

export interface ImportEntry {
  blob: EntryBlob;
  createdAt?: string;
}

const DAYLIO_MOOD_MAP: Record<string, number> = {
  awful: 1,
  bad: 2,
  meh: 3,
  good: 4,
  rad: 6,
};

/** Parse a CSV row respecting quoted fields */
function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parseDaylioCSV(raw: string): ImportEntry[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must contain at least a header and one data row.");

  const headers = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase());

  const dateIdx = headers.indexOf("full_date");
  const timeIdx = headers.indexOf("time");
  const moodIdx = headers.indexOf("mood");
  const activitiesIdx = headers.indexOf("activities");
  const noteIdx = headers.indexOf("note");

  if (dateIdx === -1) throw new Error('Daylio CSV must contain a "full_date" column.');

  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const fields = parseCSVRow(line);

    const dateStr = fields[dateIdx]?.trim();
    const timeStr = timeIdx >= 0 ? fields[timeIdx]?.trim() : "";
    const moodStr = moodIdx >= 0 ? fields[moodIdx]?.trim().toLowerCase() : "";
    const activitiesStr = activitiesIdx >= 0 ? fields[activitiesIdx]?.trim() : "";
    const note = noteIdx >= 0 ? fields[noteIdx]?.trim() : "";

    // Parse date + time into ISO string
    let createdAt: string | undefined;
    if (dateStr) {
      const timePart = timeStr || "12:00 PM";
      const d = new Date(`${dateStr} ${timePart}`);
      if (!isNaN(d.getTime())) {
        createdAt = d.toISOString();
      }
    }

    const mood = DAYLIO_MOOD_MAP[moodStr] ?? null;

    const activities = activitiesStr
      ? activitiesStr
          .split("|")
          .flatMap((s) => s.split(","))
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
      : [];

    return {
      blob: {
        body: note,
        mood,
        tags: [],
        activities,
      },
      createdAt,
    };
  });
}

export async function importEntries(
  supabase: SupabaseClient,
  key: CryptoKey,
  userId: string,
  entries: ImportEntry[],
) {
  // Collect all unique activity names from the import
  const importedNames = new Set<string>();
  for (const entry of entries) {
    for (const name of entry.blob.activities) {
      if (name) importedNames.add(name);
    }
  }

  // Find which activities already exist and create missing ones
  if (importedNames.size > 0) {
    const existing = await listActivities(supabase);
    const existingNames = new Set(existing.map((a) => a.name));

    for (const name of importedNames) {
      if (!existingNames.has(name)) {
        await createActivity(supabase, userId, name, "\u2753");
      }
    }
  }

  for (const entry of entries) {
    await createEntry(supabase, key, userId, entry.blob, entry.createdAt);
  }
}
