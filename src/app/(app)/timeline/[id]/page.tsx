"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { getEntry, type DecryptedEntry } from "@/lib/entries";
import { moodToEmoji } from "@/components/mood-picker";
import { EntryCardSkeleton } from "@/components/loading-skeleton";
import Link from "next/link";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { key } = useKey();

  const [entry, setEntry] = useState<DecryptedEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!key || !id) return;

    async function load() {
      setLoading(true);
      const result = await getEntry(supabase, key!, id);
      if (result) {
        setEntry(result);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    load();
  }, [key, id]);

  if (loading) {
    return (
      <div>
        <button
          onClick={() => router.back()}
          className="text-foreground/40 hover:text-foreground/60 text-sm"
        >
          &larr; Back
        </button>
        <div className="mt-4">
          <EntryCardSkeleton />
        </div>
      </div>
    );
  }

  if (notFound || !entry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-foreground/60 text-lg font-medium">Entry not found</h2>
        <p className="text-foreground/40 mt-1 text-sm">
          It may have been deleted or you don't have access.
        </p>
        <Link
          href="/timeline"
          className="bg-foreground text-background mt-4 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Back to Timeline
        </Link>
      </div>
    );
  }

  const emoji = moodToEmoji(entry.mood);

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-foreground/40 hover:text-foreground/60 text-sm"
      >
        &larr; Back
      </button>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <time className="text-foreground/40 text-sm">
            {new Date(entry.created_at).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          {emoji && <span className="text-xl">{emoji}</span>}
        </div>

        <div className="text-foreground mt-4 text-sm leading-relaxed whitespace-pre-wrap">
          {entry.body}
        </div>

        {entry.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <Link
                key={tag}
                href={`/timeline?tag=${encodeURIComponent(tag)}`}
                className="bg-foreground/10 text-foreground/60 hover:bg-foreground/20 rounded-full px-2.5 py-0.5 text-xs"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
