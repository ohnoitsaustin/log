"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { createEntry } from "@/lib/entries";
import { WeatherToggle } from "@/components/weather-toggle";
import { LocationToggle } from "@/components/location-toggle";
import type { WeatherData } from "@/lib/weather";
import type { Activity } from "@/lib/activities";

const QUICK_MOODS = [
  { value: 0, emoji: "😐", color: "#999" },
  { value: 1, emoji: "😢", color: "#ef4444" },
  { value: 2, emoji: "🙁", color: "#f97316" },
  { value: 3, emoji: "😕", color: "#eab308" },
  { value: 4, emoji: "🙂", color: "#84cc16" },
  { value: 5, emoji: "😄", color: "#22c55e" },
  { value: 6, emoji: "🤩", color: "#10b981" },
];

export function QuickEntryModal({
  activities: availableActivities,
  onClose,
}: {
  activities: Activity[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { key } = useKey();
  const backdropRef = useRef<HTMLDivElement>(null);

  const [quickActivities, setQuickActivities] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [savingMood, setSavingMood] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  async function handleQuickMood(moodValue: number) {
    if (!key) return;

    setSavingMood(moodValue);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await createEntry(supabase, key, user.id, {
        body: "",
        mood: moodValue,
        energy: null,
        location,
        weather,
        tags: [],
        activities: quickActivities,
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
      setSavingMood(null);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
    >
      <div className="bg-background w-full max-w-lg rounded-lg p-6 shadow-lg">
        <h2 className="text-foreground text-xl font-semibold">New Entry</h2>

        <div className="mt-4 space-y-4">
          <LocationToggle value={location} onChange={setLocation} disabled={savingMood !== null} />
          <WeatherToggle value={weather} onChange={setWeather} disabled={savingMood !== null} />

          {availableActivities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableActivities.map((a) => {
                const selected = quickActivities.includes(a.name);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setQuickActivities((prev) =>
                        selected
                          ? prev.filter((n) => n !== a.name)
                          : [...prev, a.name]
                      )
                    }
                    disabled={savingMood !== null}
                    className={`rounded-full px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                      selected
                        ? "bg-foreground text-background"
                        : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20"
                    }`}
                  >
                    {a.emoji} {a.name}
                  </button>
                );
              })}
            </div>
          )}

          <label className="text-foreground/60 block text-sm font-medium mt-8">
            How you feelin&apos;?
          </label>
          <div className="flex gap-2">
            {QUICK_MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => handleQuickMood(m.value)}
                disabled={savingMood !== null}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 text-2xl transition-all hover:bg-foreground/5 disabled:opacity-50 ${
                  savingMood === m.value ? "bg-foreground/10 scale-110" : ""
                }`}
              >
                {m.emoji}
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={() => {
              onClose();
              router.push("/new-entry");
            }}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Write full entry
          </button>
        </div>
      </div>
    </div>
  );
}
