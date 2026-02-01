"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { listEntries, listTags, type DecryptedEntry } from "@/lib/entries";
import { EntryCard } from "@/components/entry-card";
import { EntryListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export default function TimelinePage() {
  const supabase = createClient();
  const { key } = useKey();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");

  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;

    async function load() {
      setLoading(true);
      const [entryList, tagList] = await Promise.all([
        listEntries(supabase, key!, activeTag ?? undefined),
        listTags(supabase),
      ]);
      setEntries(entryList);
      setTags(tagList);
      setLoading(false);
    }

    load();
  }, [key, activeTag, supabase]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-semibold">Timeline</h1>
        <Link
          href="/new-entry"
          className="bg-foreground text-background rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          New Entry
        </Link>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <Link
            href="/timeline"
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${!activeTag
              ? "bg-foreground text-background"
              : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20"
              }`}
          >
            All
          </Link>
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/timeline?tag=${encodeURIComponent(tag.name)}`}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeTag === tag.name
                ? "bg-foreground text-background"
                : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20"
                }`}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <EntryListSkeleton />
        ) : entries.length === 0 ? (
          <EmptyState
            title={activeTag ? `No entries tagged "${activeTag}"` : "No entries yet"}
            description={
              activeTag
                ? "Try a different tag or create a new entry."
                : "Start writing to see your entries here."
            }
            action={
              <Link
                href="/new-entry"
                className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              >
                New Entry
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
