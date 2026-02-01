"use client";

const MOODS = [
  { value: 0, emoji: "😐", label: "No mood" },
  { value: 1, emoji: "😢", label: "Very sad" },
  { value: 2, emoji: "🙁", label: "Sad" },
  { value: 3, emoji: "😕", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Happy" },
  { value: 5, emoji: "😄", label: "Very happy" },
  { value: 6, emoji: "🤩", label: "Excited" },
];

export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (mood: number | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {MOODS.map((mood) => {
        const isSelected = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            aria-label={mood.label}
            onClick={() => onChange(isSelected ? null : mood.value)}
            className={`rounded-lg p-2 text-2xl transition-all ${isSelected
                ? "bg-foreground/10 ring-foreground/40 scale-110 ring-2"
                : "hover:bg-foreground/5"
              }`}
          >
            {mood.emoji}
          </button>
        );
      })}
    </div>
  );
}

export function moodToEmoji(mood: number | null): string | null {
  if (!mood) return null;
  return MOODS.find((m) => m.value === mood)?.emoji ?? null;
}
