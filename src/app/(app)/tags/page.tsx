"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listTags } from "@/lib/entries";
import {
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  type Activity,
} from "@/lib/activities";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

function lastGrapheme(str: string): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const segments = [...segmenter.segment(str)];
  return segments.length > 0 ? segments[segments.length - 1].segment : "";
}

export default function TagsPage() {
  const supabase = createClient();
  const [tags, setTags] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Activity editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  // New activity state
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");

  useEffect(() => {
    async function load() {
      const [tagResult, activityResult] = await Promise.all([
        listTags(supabase),
        listActivities(supabase),
      ]);
      setTags(tagResult.map((tag) => tag.name));
      setActivities(activityResult);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function startEditing(activity: Activity) {
    setEditingId(activity.id);
    setEditName(activity.name);
    setEditEmoji(activity.emoji);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditEmoji("");
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() || !editEmoji) return;
    const updated = await updateActivity(supabase, id, editName, editEmoji);
    if (updated) {
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? updated : a)).sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    cancelEditing();
  }

  async function handleDelete(id: string) {
    await deleteActivity(supabase, id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleAdd() {
    if (!newName.trim() || !newEmoji) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const activity = await createActivity(supabase, user.id, newName, newEmoji);
    if (activity) {
      setActivities((prev) =>
        [...prev, activity].sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setNewName("");
    setNewEmoji("");
    setAddingNew(false);
  }

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

      <h2 className="text-foreground text-xl font-semibold mt-10">Activities</h2>

      <div className="mt-4 space-y-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-foreground/10 h-10 animate-pulse rounded-md" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-foreground/40 text-sm">No activities yet.</p>
        ) : (
          activities.map((activity) =>
            editingId === activity.id ? (
              <div
                key={activity.id}
                className="flex items-center gap-2 rounded-md bg-foreground/5 px-3 py-2"
              >
                <input
                  type="text"
                  value={editEmoji}
                  onChange={(e) => {
                    setEditEmoji(lastGrapheme(e.target.value));
                  }}
                  className="border-foreground/20 h-8 w-10 rounded border bg-transparent text-center text-lg focus:outline-none"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(activity.id);
                    if (e.key === "Escape") cancelEditing();
                  }}
                  className="text-foreground border-foreground/20 h-8 flex-1 rounded border bg-transparent px-2 text-sm focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(activity.id)}
                  disabled={!editName.trim() || !editEmoji}
                  className="bg-foreground text-background h-8 rounded px-3 text-xs font-medium disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="text-foreground/40 hover:text-foreground h-8 px-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                key={activity.id}
                className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-foreground/5 transition-colors"
              >
                <span className="text-lg">{activity.emoji}</span>
                <span className="text-foreground/80 text-sm flex-1">{activity.name}</span>
                <button
                  onClick={() => startEditing(activity)}
                  className="text-foreground/0 group-hover:text-foreground/40 hover:!text-foreground text-xs transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="text-foreground/0 group-hover:text-red-400/60 hover:!text-red-500 text-xs transition-colors"
                >
                  Delete
                </button>
              </div>
            )
          )
        )}

        {addingNew ? (
          <div className="flex items-center gap-2 rounded-md bg-foreground/5 px-3 py-2 mt-2">
            <input
              type="text"
              value={newEmoji}
              onChange={(e) => {
                setNewEmoji(lastGrapheme(e.target.value));
              }}
              placeholder="😀"
              className="border-foreground/20 h-8 w-10 rounded border bg-transparent text-center text-lg focus:outline-none"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAddingNew(false);
                  setNewName("");
                  setNewEmoji("");
                }
              }}
              placeholder="Activity name"
              className="text-foreground placeholder:text-foreground/40 border-foreground/20 h-8 flex-1 rounded border bg-transparent px-2 text-sm focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || !newEmoji}
              className="bg-foreground text-background h-8 rounded px-3 text-xs font-medium disabled:opacity-40"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingNew(false);
                setNewName("");
                setNewEmoji("");
              }}
              className="text-foreground/40 hover:text-foreground h-8 px-1 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingNew(true)}
            className="text-foreground/50 hover:text-foreground mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
          >
            + Add activity
          </button>
        )}
      </div>
    </div>
  );
}
