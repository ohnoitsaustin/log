"use client";

const ENERGY_LEVELS = [
  { value: 0, emoji: "😴", label: "Depleted" },
  { value: 1, emoji: "🪫", label: "Very low" },
  { value: 2, emoji: "😮‍💨", label: "Low" },
  { value: 3, emoji: "🙂", label: "Moderate" },
  { value: 4, emoji: "💪", label: "Good" },
  { value: 5, emoji: "⚡", label: "High" },
  { value: 6, emoji: "🔥", label: "Very high" },
];

export function EnergyPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (energy: number | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {ENERGY_LEVELS.map((level) => {
        const isSelected = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            aria-label={level.label}
            onClick={() => onChange(isSelected ? null : level.value)}
            className={`rounded-lg p-2 text-2xl transition-all ${isSelected
                ? "bg-foreground/10 ring-foreground/40 scale-110 ring-2"
                : "hover:bg-foreground/5"
              }`}
          >
            {level.emoji}
          </button>
        );
      })}
    </div>
  );
}

export function energyToEmoji(energy: number | null): string | null {
  if (energy === null || energy === undefined) return null;
  return ENERGY_LEVELS.find((l) => l.value === energy)?.emoji ?? null;
}
