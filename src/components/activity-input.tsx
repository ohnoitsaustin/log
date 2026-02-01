"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { EmojiStyle, type EmojiClickData } from "emoji-picker-react";
import type { Activity } from "@/lib/activities";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export function activityToEmoji(
  name: string,
  availableActivities: Activity[],
): string {
  return availableActivities.find((a) => a.name === name)?.emoji ?? name;
}

export function ActivityInput({
  activities,
  onChange,
  availableActivities,
  onAddActivity,
}: {
  activities: string[];
  onChange: (activities: string[]) => void;
  availableActivities: Activity[];
  onAddActivity?: (name: string, emoji: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  function toggle(name: string) {
    if (activities.includes(name)) {
      onChange(activities.filter((a) => a !== name));
    } else {
      onChange([...activities, name]);
    }
  }

  function handleAdd() {
    const name = newName.trim().toLowerCase();
    if (name && newEmoji && onAddActivity) {
      onAddActivity(name, newEmoji);
      setNewName("");
      setNewEmoji("");
      setAdding(false);
    }
  }

  function handleEmojiSelect(emojiData: EmojiClickData) {
    setNewEmoji(emojiData.emoji);
    setShowPicker(false);
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {availableActivities.map((activity) => {
          const isSelected = activities.includes(activity.name);
          return (
            <button
              key={activity.id}
              type="button"
              aria-label={activity.name}
              onClick={() => toggle(activity.name)}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 text-2xl transition-all ${
                isSelected
                  ? "bg-foreground/10 ring-foreground/40 scale-105 ring-2"
                  : "hover:bg-foreground/5"
              }`}
            >
              <span>{activity.emoji}</span>
              <span className="text-foreground/60 text-[10px]">{activity.name}</span>
            </button>
          );
        })}
        {onAddActivity && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="hover:bg-foreground/5 flex flex-col items-center gap-1 rounded-lg p-2 text-2xl transition-all"
          >
            <span>+</span>
            <span className="text-foreground/60 text-[10px]">add</span>
          </button>
        )}
      </div>

      {adding && (
        <div className="border-foreground/20 bg-background mt-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="border-foreground/20 hover:bg-foreground/5 flex h-10 w-10 items-center justify-center rounded-md border text-xl"
              >
                {newEmoji || "?"}
              </button>
              {showPicker && (
                <div className="absolute top-12 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    emojiStyle={EmojiStyle.NATIVE}
                    width={300}
                    height={400}
                  />
                </div>
              )}
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Activity name"
              className="text-foreground placeholder:text-foreground/40 border-foreground/20 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim() || !newEmoji}
              className="bg-foreground text-background rounded-md px-3 py-2 text-sm font-medium disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewEmoji("");
                setShowPicker(false);
              }}
              className="text-foreground/60 hover:text-foreground text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
