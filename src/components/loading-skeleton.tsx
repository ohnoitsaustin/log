export function EntryCardSkeleton() {
  return (
    <div className="border-foreground/10 animate-pulse rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="bg-foreground/10 h-3 w-32 rounded" />
        <div className="bg-foreground/10 h-6 w-6 rounded" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="bg-foreground/10 h-3 w-full rounded" />
        <div className="bg-foreground/10 h-3 w-3/4 rounded" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="bg-foreground/10 h-5 w-12 rounded-full" />
        <div className="bg-foreground/10 h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function EntryListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <EntryCardSkeleton key={i} />
      ))}
    </div>
  );
}
