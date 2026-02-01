"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { createEntry } from "@/lib/entries";
import { MoodPicker } from "@/components/mood-picker";
import { TagInput } from "@/components/tag-input";
import { ActivityInput } from "@/components/activity-input";
import {
  listActivities,
  seedDefaultActivities,
  createActivity,
  type Activity,
} from "@/lib/activities";

export default function NewEntryPage() {
  const router = useRouter();
  const supabase = createClient();
  const { key } = useKey();

  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingMood, setSavingMood] = useState<number | null>(null);
  const [quickActivities, setQuickActivities] = useState<string[]>([]);
  const [showFullForm, setShowFullForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let list = await listActivities(supabase);
    if (list.length === 0) {
      list = await seedDefaultActivities(supabase, user.id);
    }
    setAvailableActivities(list);
  }, [supabase]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleAddActivity(name: string, emoji: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const activity = await createActivity(supabase, user.id, name, emoji);
    if (activity) {
      setAvailableActivities((prev) =>
        [...prev, activity].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  }

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
        tags: [],
        activities: quickActivities,
      });
      router.push("/timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
      setSavingMood(null);
    }
  }

  async function handleSave() {
    if (!key) return;

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await createEntry(supabase, key, user.id, { body: body.trim(), mood, tags, activities });
      router.push("/timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
      setSaving(false);
    }
  }

  const QUICK_MOODS = [
    { value: 0, emoji: "😐" },
    { value: 1, emoji: "😢" },
    { value: 2, emoji: "🙁" },
    { value: 3, emoji: "😕" },
    { value: 4, emoji: "🙂" },
    { value: 5, emoji: "😄" },
    { value: 6, emoji: "🤩" },
  ];

  return (
    <div>
      <h1 className="text-foreground text-2xl font-semibold">New Entry</h1>

      {!showFullForm ? (
        <div className="mt-6 space-y-4">
          <label className="text-foreground/60 block text-sm font-medium">How you feelin'?</label>
          <div className="flex gap-2">
            {QUICK_MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => handleQuickMood(m.value)}
                disabled={savingMood !== null}
                className={`rounded-lg p-2 text-2xl transition-all hover:bg-foreground/5 disabled:opacity-50 ${savingMood === m.value ? "bg-foreground/10 scale-110" : ""
                  }`}
              >
                {m.emoji}
              </button>
            ))}
          </div>

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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={() => setShowFullForm(true)}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Write full entry
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={8}
              className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 w-full resize-none rounded-md border px-4 py-3 text-sm focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-foreground/60 mb-2 block text-sm font-medium">Mood</label>
            <MoodPicker value={mood} onChange={setMood} />
          </div>

          <div>
            <label className="text-foreground/60 mb-2 block text-sm font-medium">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <div>
            <label className="text-foreground/60 mb-2 block text-sm font-medium">Activities</label>
            <ActivityInput
              activities={activities}
              onChange={setActivities}
              availableActivities={availableActivities}
              onAddActivity={handleAddActivity}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setShowFullForm(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground/60 transition-opacity hover:text-foreground"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
