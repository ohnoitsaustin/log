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

          {entry.mediaCount > 0 && (
            <span className="text-foreground/50 text-xs flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-4.47-4.47a.75.75 0 0 0-1.06 0L2.5 11.06Zm6.22-3.31a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0Z" clipRule="evenodd" />
              </svg>
              {entry.mediaCount}
            </span>
          )}
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
