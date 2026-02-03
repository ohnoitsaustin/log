"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { updateEntry, type DecryptedEntry, type EntryBlob } from "@/lib/entries";
import { MoodPicker } from "@/components/mood-picker";
import { EnergyPicker } from "@/components/energy-picker";
import { TagInput } from "@/components/tag-input";
import { ActivityInput } from "@/components/activity-input";
import { WeatherToggle } from "@/components/weather-toggle";
import { LocationToggle } from "@/components/location-toggle";
import { ImagePicker, type SelectedImage } from "@/components/image-picker";
import {
  getMediaForEntry,
  uploadMedia,
  deleteMediaByIds,
  MAX_IMAGES_PER_ENTRY,
  type DecryptedMedia,
} from "@/lib/media";
import type { Activity } from "@/lib/activities";

export function EditEntryModal({
  entry,
  availableActivities,
  onClose,
  onSaved,
  onAddActivity,
}: {
  entry: DecryptedEntry;
  availableActivities: Activity[];
  onClose: () => void;
  onSaved: (updated: EntryBlob) => void;
  onAddActivity?: (name: string, emoji: string) => void;
}) {
  const supabase = createClient();
  const { key } = useKey();

  const [body, setBody] = useState(entry.body);
  const [mood, setMood] = useState<number | null>(entry.mood);
  const [energy, setEnergy] = useState<number | null>(entry.energy);
  const [location, setLocation] = useState(entry.location);
  const [weather, setWeather] = useState(entry.weather);
  const [tags, setTags] = useState<string[]>(entry.tags);
  const [activities, setActivities] = useState<string[]>(entry.activities);
  const [existingMedia, setExistingMedia] = useState<DecryptedMedia[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<SelectedImage[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Load existing media
  useEffect(() => {
    if (!key) return;

    async function loadMedia() {
      setLoadingMedia(true);
      const media = await getMediaForEntry(supabase, key!, entry.id);
      setExistingMedia(media);
      setLoadingMedia(false);
    }

    loadMedia();

    return () => {
      // Revoke object URLs on unmount
      setExistingMedia((prev) => {
        for (const m of prev) URL.revokeObjectURL(m.objectUrl);
        return [];
      });
    };
  }, [key, entry.id, supabase]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const visibleExisting = existingMedia.filter(
    (m) => !removedMediaIds.includes(m.id),
  );
  const totalImages = visibleExisting.length + newImages.length;
  const maxNewImages = MAX_IMAGES_PER_ENTRY - visibleExisting.length;

  function handleRemoveExisting(mediaId: string) {
    setRemovedMediaIds((prev) => [...prev, mediaId]);
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

      const blob: EntryBlob = { body: body.trim(), mood, energy, location, weather, tags, activities };
      await updateEntry(supabase, key, entry.id, user.id, blob);

      // Delete removed media
      if (removedMediaIds.length > 0) {
        await deleteMediaByIds(supabase, removedMediaIds);
      }

      // Upload new images
      for (const img of newImages) {
        await uploadMedia(supabase, key, user.id, entry.id, img.file);
      }

      // Clean up preview URLs
      for (const img of newImages) {
        URL.revokeObjectURL(img.previewUrl);
      }

      onSaved(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="bg-background w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-lg">
        <h2 className="text-foreground text-xl font-semibold">Edit Entry</h2>

        <div className="mt-4 space-y-5">
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
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

          <LocationToggle value={location} onChange={setLocation} disabled={saving} />
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
              onAddActivity={onAddActivity}
            />
          </div>

          <div>
            <label className="text-foreground/60 mb-2 block text-sm font-medium">Images</label>

            {/* Existing media */}
            {loadingMedia ? (
              <div className="text-foreground/30 text-sm">Loading images...</div>
            ) : visibleExisting.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {visibleExisting.map((m) => (
                  <div key={m.id} className="relative group">
                    <img
                      src={m.objectUrl}
                      alt="Existing attachment"
                      className="h-20 w-20 rounded-md object-cover border border-foreground/10"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(m.id)}
                      disabled={saving}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      aria-label="Remove image"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* New images picker */}
            {totalImages < MAX_IMAGES_PER_ENTRY && (
              <ImagePicker
                images={newImages}
                onChange={setNewImages}
                maxImages={maxNewImages}
                disabled={saving}
              />
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground/60 hover:text-foreground rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
