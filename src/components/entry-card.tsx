import Link from "next/link";
import { moodToEmoji } from "@/components/mood-picker";
import type { DecryptedEntry } from "@/lib/entries";

export function EntryCard({ entry }: { entry: DecryptedEntry }) {
  const emoji = moodToEmoji(entry.mood);

  return (
    <Link
      href={`/timeline/${entry.id}`}
      className="border-foreground/10 hover:border-foreground/20 block rounded-lg border p-4 transition-colors"
    >
      <div className="flex items-center justify-between">
        <time className="text-foreground/40 text-xs">
          {new Date(entry.created_at).toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
        {emoji && <span className="text-lg">{emoji}</span>}
      </div>
      <p className="text-foreground/80 mt-2 line-clamp-3 text-sm">{entry.body}</p>
      {entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
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
  );
}
