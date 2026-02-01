"use client";

import { useState } from "react";

export function ActivityInput({
  activities,
  onChange,
}: {
  activities: string[];
  onChange: (activities: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addActivity(raw: string) {
    const activity = raw.trim().toLowerCase();
    if (activity && !activities.includes(activity)) {
      onChange([...activities, activity]);
    }
    setInput("");
  }

  function removeActivity(activity: string) {
    onChange(activities.filter((t) => t !== activity));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addActivity(input);
    } else if (e.key === "Backspace" && input === "" && activities.length > 0) {
      removeActivity(activities[activities.length - 1]);
    }
  }

  return (
    <div className="border-foreground/20 bg-background flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
      {activities.map((activity) => (
        <span
          key={activity}
          className="bg-foreground/10 text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
        >
          {activity}
          <button
            type="button"
            onClick={() => removeActivity(activity)}
            className="text-foreground/40 hover:text-foreground"
            aria-label={`Remove activity ${activity}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addActivity(input);
        }}
        placeholder={activities.length === 0 ? "Add activities..." : ""}
        className="text-foreground placeholder:text-foreground/40 min-w-[80px] flex-1 bg-transparent text-sm focus:outline-none"
      />
    </div>
  );
}
