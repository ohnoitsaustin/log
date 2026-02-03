"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { createEntry } from "@/lib/entries";
import { MoodPicker } from "@/components/mood-picker";
import { EnergyPicker } from "@/components/energy-picker";
import { TagInput } from "@/components/tag-input";
import { ActivityInput } from "@/components/activity-input";
import { WeatherToggle } from "@/components/weather-toggle";
import { ImagePicker, type SelectedImage } from "@/components/image-picker";
import { uploadMedia } from "@/lib/media";
import type { WeatherData } from "@/lib/weather";
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
  const [energy, setEnergy] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [saving, setSaving] = useState(false);
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

  async function handleSave() {
    if (!key) return;

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const entryId = await createEntry(supabase, key, user.id, { body: body.trim(), mood, energy, location: location.trim(), weather, tags, activities });

      // Upload images
      for (const img of images) {
        await uploadMedia(supabase, key, user.id, entryId, img.file);
      }

      // Clean up preview URLs
      for (const img of images) {
        URL.revokeObjectURL(img.previewUrl);
      }

      router.push("/timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-foreground text-2xl font-semibold">New Entry</h1>

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
          <label className="text-foreground/60 mb-2 block text-sm font-medium">Energy</label>
          <EnergyPicker value={energy} onChange={setEnergy} />
        </div>

        <div>
          <label className="text-foreground/60 mb-2 block text-sm font-medium">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where are you?"
            className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <WeatherToggle value={weather} onChange={setWeather} disabled={saving} />

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

        <div>
          <label className="text-foreground/60 mb-2 block text-sm font-medium">Images</label>
          <ImagePicker images={images} onChange={setImages} disabled={saving} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
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
    </div>
  );
}
