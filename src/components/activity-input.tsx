"use client";

import { useState, useRef, useEffect } from "react";
import type { Activity } from "@/lib/activities";

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
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
        setAdding(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (open && filterRef.current) {
      filterRef.current.focus();
    }
  }, [open]);

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

  const filtered = availableActivities.filter((a) =>
    a.name.toLowerCase().includes(filter.toLowerCase()),
  );

  // Selected activities displayed as chips
  const selectedActivities = availableActivities.filter((a) =>
    activities.includes(a.name),
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected activities + trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="border-foreground/20 bg-background hover:bg-foreground/5 flex w-full min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 text-left transition-colors"
      >
        {selectedActivities.length > 0 ? (
          selectedActivities.map((a) => (
            <span
              key={a.id}
              className="bg-foreground/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm"
            >
              {a.emoji} {a.name}
            </span>
          ))
        ) : (
          <span className="text-foreground/40 text-sm">Select activities...</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border-foreground/20 bg-background absolute left-0 right-0 z-50 mt-1 rounded-md border shadow-lg">
          {/* Filter input */}
          <div className="border-foreground/10 border-b p-2">
            <input
              ref={filterRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search activities..."
              className="text-foreground placeholder:text-foreground/40 w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          {/* Activity list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map((activity) => {
              const isSelected = activities.includes(activity.name);
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => toggle(activity.name)}
                  className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/80 hover:bg-foreground/5"
                  }`}
                >
                  <span className="text-lg">{activity.emoji}</span>
                  <span>{activity.name}</span>
                  {isSelected && (
                    <span className="text-foreground/40 ml-auto text-xs">✓</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-foreground/40 px-3 py-2 text-sm">No activities found</p>
            )}
          </div>

          {/* Add new activity */}
          {onAddActivity && (
            <div className="border-foreground/10 border-t p-2">
              {!adding ? (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="text-foreground/60 hover:text-foreground flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors"
                >
                  <span>+</span>
                  <span>Add new activity</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="text"
                    value={newEmoji}
                    onChange={(e) => {
                      const val = [...e.target.value];
                      setNewEmoji(val.length > 0 ? val[val.length - 1] : "");
                    }}
                    placeholder="😀"
                    className="border-foreground/20 h-8 w-10 rounded border bg-transparent text-center text-lg focus:outline-none"
                  />
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
                    placeholder="Name"
                    className="text-foreground placeholder:text-foreground/40 border-foreground/20 h-8 flex-1 rounded border bg-transparent px-2 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newName.trim() || !newEmoji}
                    className="bg-foreground text-background h-8 rounded px-2 text-xs font-medium disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setNewName("");
                      setNewEmoji("");
                    }}
                    className="text-foreground/40 hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
