"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { getEntry, type DecryptedEntry } from "@/lib/entries";
import { moodToEmoji } from "@/components/mood-picker";
import { activityToEmoji } from "@/components/activity-input";
import { listActivities, createActivity, type Activity } from "@/lib/activities";
import { getMediaForEntry, deleteMediaForEntry, type DecryptedMedia } from "@/lib/media";
import { EditEntryModal } from "@/components/edit-entry-modal";
import { EntryCardSkeleton } from "@/components/loading-skeleton";
import Link from "next/link";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { key } = useKey();

  const [entry, setEntry] = useState<DecryptedEntry | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [media, setMedia] = useState<DecryptedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!key || !id) return;

    async function load() {
      setLoading(true);
      const [result, activityList] = await Promise.all([
        getEntry(supabase, key!, id),
        listActivities(supabase),
      ]);
      if (result) {
        setEntry(result);
        setActivities(activityList);
        // Fetch and decrypt media
        const mediaList = await getMediaForEntry(supabase, key!, id);
        setMedia(mediaList);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    load();

    // Revoke object URLs on unmount
    return () => {
      setMedia((prev) => {
        for (const m of prev) URL.revokeObjectURL(m.objectUrl);
        return [];
      });
    };
  }, [key, id, supabase]);

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

        {media.length > 0 && (
          <div className={`mt-4 grid gap-2 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="overflow-hidden rounded-md border border-foreground/10"
              >
                <img
                  src={m.objectUrl}
                  alt={`Attachment ${i + 1}`}
                  className="w-full h-auto object-cover max-h-64"
                />
              </button>
            ))}
          </div>
        )}

        {lightboxIndex !== null && media[lightboxIndex] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
            onClick={() => setLightboxIndex(null)}
          >
            <img
              src={media[lightboxIndex].objectUrl}
              alt={`Full size ${lightboxIndex + 1}`}
              className="max-h-[90vh] max-w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

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

        {entry.activities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {entry.activities.map((activity) => (
              <span
                key={activity}
                className="text-base"
                title={activity}
              >
                {activityToEmoji(activity, activities)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 text-sm rounded bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
        >
          Edit Entry
        </button>
        <button
          onClick={async () => {
            if (confirm("Are you sure you want to delete this entry?")) {
              await deleteMediaForEntry(supabase, id);
              await supabase
                .from("entries")
                .delete()
                .eq("id", id);
              router.push("/timeline");
            }
          }}
          className="px-3 py-1.5 text-sm rounded bg-red-950 text-red-50 hover:bg-red-900 transition-colors"
        >
          Delete Entry
        </button>
      </div>

      {editing && (
        <EditEntryModal
          entry={entry}
          availableActivities={activities}
          onClose={() => setEditing(false)}
          onSaved={(blob) => {
            setEntry({
              ...entry,
              body: blob.body,
              mood: blob.mood,
              tags: blob.tags,
              activities: blob.activities,
            });
            setEditing(false);
          }}
          onAddActivity={async (name, emoji) => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const activity = await createActivity(supabase, user.id, name, emoji);
            if (activity) {
              setActivities((prev) =>
                [...prev, activity].sort((a, b) => a.name.localeCompare(b.name)),
              );
            }
          }}
        />
      )}
    </div>
  );
}
