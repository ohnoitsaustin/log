"use client";

import { useState } from "react";

export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="border-foreground/20 bg-background flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-foreground/10 text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-foreground/40 hover:text-foreground"
            aria-label={`Remove tag ${tag}`}
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
          if (input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? "Add tags..." : ""}
        className="text-foreground placeholder:text-foreground/40 min-w-[80px] flex-1 bg-transparent text-sm focus:outline-none"
      />
    </div>
  );
}
