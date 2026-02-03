"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { listEntries, listTags, type DecryptedEntry } from "@/lib/entries";
import { listActivities, type Activity } from "@/lib/activities";
import { getDrinkCounts } from "@/lib/drinks";
import { EntryCard } from "@/components/entry-card";
import { MoodChart } from "@/components/mood-chart";
import { EntryListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export default function TimelinePage() {
  const supabase = createClient();
  const { key } = useKey();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");

  const [allEntries, setAllEntries] = useState<DecryptedEntry[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drinkCounts, setDrinkCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [moodMin, setMoodMin] = useState("");
  const [moodMax, setMoodMax] = useState("");
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    if (!key) return;

    async function load() {
      setLoading(true);
      const [entryList, tagList, activityList] = await Promise.all([
        listEntries(supabase, key!, activeTag ?? undefined),
        listTags(supabase),
        listActivities(supabase),
      ]);
      setAllEntries(entryList);
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

  // Client-side search & filter over decrypted entries
  const entries = useMemo(() => {
    let filtered = allEntries;

    // Text search (body, tags, activities, location, weather)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.body.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.activities.some((a) => a.toLowerCase().includes(q)) ||
          e.location.toLowerCase().includes(q) ||
          (e.weather?.description?.toLowerCase().includes(q) ?? false),
      );
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((e) => new Date(e.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.created_at) <= to);
    }

    // Mood range
    if (moodMin !== "") {
      const min = parseInt(moodMin);
      if (!isNaN(min)) filtered = filtered.filter((e) => e.mood !== null && e.mood >= min);
    }
    if (moodMax !== "") {
      const max = parseInt(moodMax);
      if (!isNaN(max)) filtered = filtered.filter((e) => e.mood !== null && e.mood <= max);
    }

    // Has image
    if (hasImage) {
      filtered = filtered.filter((e) => e.mediaCount > 0);
    }

    return filtered;
  }, [allEntries, search, dateFrom, dateTo, moodMin, moodMax, hasImage]);

  const hasActiveFilters = dateFrom || dateTo || moodMin !== "" || moodMax !== "" || hasImage;

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setMoodMin("");
    setMoodMax("");
    setHasImage(false);
  }

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

      {/* Search & filters */}
      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? "border-foreground/40 text-foreground bg-foreground/5"
                : "border-foreground/20 text-foreground/60 hover:border-foreground/30"
            }`}
          >
            Filters{hasActiveFilters ? " *" : ""}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-md border border-foreground/10 p-3 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-foreground/50 text-xs">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border-foreground/20 bg-background text-foreground rounded border px-2 py-1 text-xs focus:outline-none focus:border-foreground/40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-foreground/50 text-xs">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border-foreground/20 bg-background text-foreground rounded border px-2 py-1 text-xs focus:outline-none focus:border-foreground/40"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-foreground/50 text-xs">Mood min</label>
                <select
                  value={moodMin}
                  onChange={(e) => setMoodMin(e.target.value)}
                  className="border-foreground/20 bg-background text-foreground rounded border px-2 py-1 text-xs focus:outline-none focus:border-foreground/40"
                >
                  <option value="">Any</option>
                  {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-foreground/50 text-xs">Mood max</label>
                <select
                  value={moodMax}
                  onChange={(e) => setMoodMax(e.target.value)}
                  className="border-foreground/20 bg-background text-foreground rounded border px-2 py-1 text-xs focus:outline-none focus:border-foreground/40"
                >
                  <option value="">Any</option>
                  {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-foreground/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasImage}
                  onChange={(e) => setHasImage(e.target.checked)}
                  className="rounded"
                />
                Has image
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
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
          <div className="">
            <MoodChart entries={entries} />

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
              const isLastOfDay =
                index === entries.length - 1 ||
                new Date(entry.created_at).toLocaleDateString("en-US") !==
                new Date(entries[index + 1].created_at).toLocaleDateString("en-US");

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
                        {drinks != null && (
                          <span className="ml-2 text-foreground/30">
                            &middot; {drinks} {drinks === 1 ? "drink" : "drinks"}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <EntryCard
                    entry={entry}
                    activities={activities}
                    isLast={isLastOfDay}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
