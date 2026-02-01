"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listTags } from "@/lib/entries";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export default function TagsPage() {
  const supabase = createClient();
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await listTags(supabase);
      setTags(result.map((tag) => tag.name));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-foreground text-2xl font-semibold">Tags</h1>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-foreground/10 h-10 animate-pulse rounded-md" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <EmptyState title="No tags yet" description="Tags you add to entries will appear here." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/timeline?tag=${encodeURIComponent(tag)}`}
                className="bg-foreground/10 text-foreground/70 hover:bg-foreground/20 hover:text-foreground rounded-full px-4 py-2 text-sm transition-colors"
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
