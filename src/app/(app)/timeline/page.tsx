"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { listEntries, listTags, type DecryptedEntry } from "@/lib/entries";
import { listActivities, type Activity } from "@/lib/activities";
import { getDrinkCounts } from "@/lib/drinks";
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drinkCounts, setDrinkCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;

    async function load() {
      setLoading(true);
      const [entryList, tagList, activityList] = await Promise.all([
        listEntries(supabase, key!, activeTag ?? undefined),
        listTags(supabase),
        listActivities(supabase),
      ]);
      setEntries(entryList);
      setTags(tagList);
      setActivities(activityList);

      // Fetch drink counts for all unique dates in the entries
      const uniqueDates = [
        ...new Set(
          entryList.map((e) => {
            const d = new Date(e.created_at);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })
        ),
      ];
      const counts = await getDrinkCounts(uniqueDates);
      setDrinkCounts(counts);

      setLoading(false);
    }

    load();
  }, [key, activeTag, supabase]);

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
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

            {entries.map((entry, index) => {
              const isFirstOfDay =
                index === 0 ||
                new Date(entry.created_at).toLocaleDateString("en-US") !==
                new Date(entries[index - 1].created_at).toLocaleDateString("en-US");
              const isFirstOfMonth =
                index === 0 ||
                new Date(entry.created_at).getMonth() !==
                new Date(entries[index - 1].created_at).getMonth();
              const isFirstOfYear =
                index === 0 ||
                new Date(entry.created_at).getFullYear() !==
                new Date(entries[index - 1].created_at).getFullYear();


              function getSuffix(day: number): string {
                if (day > 3 && day < 21) return 'th'; // Catch 11th-13th
                switch (day % 10) {
                  case 1: return 'st';
                  case 2: return 'nd';
                  case 3: return 'rd';
                  default: return 'th';
                }
              }
              return (
                <div key={entry.id}>
                  {isFirstOfYear && (
                    <div className="text-lg font-extrabold text-foreground mb-2 mt-4">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                      })}
                    </div>
                  )}
                  {isFirstOfMonth && (
                    <div className="text-sm font-semibold text-foreground/70">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "long",
                      })}
                    </div>
                  )}
                  {isFirstOfDay && (() => {
                    const d = new Date(entry.created_at);
                    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    const drinks = drinkCounts[dateKey];
                    return (
                      <div className="text-xs font-semibold text-foreground/50 mb-2">
                        {d.toLocaleDateString("en-US", {
                          weekday: "long",
                        })} the {d.getDate()}{getSuffix(d.getDate())}
                        {drinks > 0 && (
                          <span className="ml-2 text-foreground/30">
                            &middot; {drinks} {drinks === 1 ? "drink" : "drinks"}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <EntryCard entry={entry} activities={activities} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
