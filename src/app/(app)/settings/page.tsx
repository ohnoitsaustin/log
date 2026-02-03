"use client";

import { useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { listEntries, deleteAllEntries } from "@/lib/entries";
import { exportAsJSON, exportAsMarkdownZip, parseImportJSON, parseDaylioCSV, importEntries, type ImportEntry } from "@/lib/export";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const supabase = createClient();
  const { key } = useKey();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExportJSON() {
    if (!key) return;
    setExporting(true);
    const entries = await listEntries(supabase, key);
    exportAsJSON(entries);
    setExporting(false);
  }

  async function handleExportMarkdown() {
    if (!key) return;
    setExporting(true);
    const entries = await listEntries(supabase, key);
    await exportAsMarkdownZip(entries, supabase, key);
    setExporting(false);
  }

  async function handleDeleteAll() {
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const count = await deleteAllEntries(supabase);
      setDeleteStatus(`Deleted ${count} entries.`);
    } catch (err) {
      setDeleteStatus(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !key) return;

    setImporting(true);
    setImportStatus(null);

    try {
      const raw = await file.text();
      let entries: ImportEntry[];

      if (file.name.endsWith(".csv")) {
        entries = parseDaylioCSV(raw);
      } else {
        entries = parseImportJSON(raw).map((blob) => ({ blob }));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await importEntries(supabase, key, user.id, entries);
      setImportStatus(`Imported ${entries.length} entries.`);
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <h1 className="text-foreground text-2xl font-semibold">Settings</h1>

      <div className="mt-6 space-y-6">
        <div>
          <label htmlFor="theme" className="text-foreground block text-sm font-medium">
            Theme
          </label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            className="border-foreground/20 bg-background text-foreground focus:border-foreground/40 mt-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="border-foreground/10 border-t pt-6">
          <h2 className="text-foreground text-sm font-medium">Export</h2>
          <p className="text-foreground/40 mt-1 text-xs">
            Download all your entries. Data is decrypted locally before export.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="border-foreground/20 text-foreground hover:bg-foreground/5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export JSON"}
            </button>
            <button
              onClick={handleExportMarkdown}
              disabled={exporting}
              className="border-foreground/20 text-foreground hover:bg-foreground/5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export Markdown (.zip)"}
            </button>
          </div>
        </div>

        <div className="border-foreground/10 border-t pt-6">
          <h2 className="text-foreground text-sm font-medium">Import</h2>
          <p className="text-foreground/40 mt-1 text-xs">
            Import entries from a JSON file or a Daylio CSV export. Daylio moods and activities are
            mapped automatically.
          </p>
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv"
              onChange={handleImport}
              disabled={importing}
              className="text-foreground/60 file:border-foreground/20 file:text-foreground hover:file:bg-foreground/5 text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:transition-colors"
            />
            {importing && <p className="text-foreground/40 mt-2 text-xs">Importing...</p>}
            {importStatus && <p className="text-foreground/60 mt-2 text-xs">{importStatus}</p>}
          </div>
        </div>

        <div className="border-foreground/10 border-t pt-6">
          <h2 className="text-foreground text-sm font-medium">Danger Zone</h2>
          <p className="text-foreground/40 mt-1 text-xs">
            Permanently delete all your entries. This cannot be undone.
          </p>
          <div className="mt-3">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-foreground/60 text-sm">Are you sure?</span>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  className="rounded-md border border-red-500/50 px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete all"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="text-foreground/40 hover:text-foreground text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-md border border-red-500/50 px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
              >
                Delete all entries
              </button>
            )}
            {deleteStatus && <p className="text-foreground/60 mt-2 text-xs">{deleteStatus}</p>}
          </div>
        </div>

        <div className="border-foreground/10 border-t pt-6 md:hidden">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
