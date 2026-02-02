import Link from "next/link";
import { moodToEmoji } from "@/components/mood-picker";
import { activityToEmoji } from "@/components/activity-input";
import type { DecryptedEntry } from "@/lib/entries";
import type { Activity } from "@/lib/activities";

export function EntryCard({ entry, activities, isLast = false }: { entry: DecryptedEntry; activities: Activity[]; isLast?: boolean }) {
  const emoji = moodToEmoji(entry.mood);

  return (
    <div className="flex gap-3 pb-1">
      {/* Left gutter: emoji + connector line */}
      <div className="flex flex-col items-center w-8 shrink-0">
        {emoji && <span className="text-2xl leading-none">{emoji}</span>}
        {!isLast && <div className="w-px flex-1 bg-foreground/30 min-h-2 mt-1" />}
      </div>

      {/* Right content */}
      <Link
        href={`/timeline/${entry.id}`}
        className="block flex-1 transition-colors hover:bg-foreground/5 -mt-0.5"
      >
        <div className="flex items-center gap-2">
          <time className="text-foreground/40 text-xs">
            {new Date(entry.created_at).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>

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
        {entry.body &&
          <p className="text-foreground/80 mt-1 line-clamp-3 text-sm">{entry.body}</p>
        }
        {entry.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="bg-foreground/10 text-foreground/60 rounded-full px-2 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}
