"use client";

import type { DecryptedEntry } from "@/lib/entries";

const MOOD_EMOJIS: Record<number, string> = {
  0: "😐",
  1: "😢",
  2: "🙁",
  3: "😕",
  4: "🙂",
  5: "😄",
  6: "🤩",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MiniChart({
  label,
  points,
}: {
  label: string;
  points: { emoji: string; y: number; sublabel: string }[];
}) {
  if (points.length === 0) return null;

  const W = 300;
  const H = 64;
  const PX = 20;
  const PY = 10;

  function px(i: number) {
    if (points.length === 1) return W / 2;
    return PX + (i / (points.length - 1)) * (W - PX * 2);
  }

  function py(val: number) {
    return PY + ((6 - val) / 6) * (H - PY * 2);
  }

  const mapped = points.map((p, i) => ({ ...p, cx: px(i), cy: py(p.y) }));

  const linePath =
    mapped.length > 1
      ? mapped
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx} ${p.cy}`)
          .join(" ")
      : null;

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-0.5 text-[10px] font-semibold text-foreground/40">
        {label}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 56 }}>
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {mapped.map((p, i) => (
          <g key={i}>
            <text
              x={p.cx}
              y={p.cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
            >
              {p.emoji}
            </text>
            <text
              x={p.cx}
              y={H - 1}
              textAnchor="middle"
              fontSize={7}
              fill="currentColor"
              fillOpacity={0.25}
            >
              {p.sublabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function MoodChart({ entries }: { entries: DecryptedEntry[] }) {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US");

  // Today's entries with mood
  const todayPoints = entries
    .filter(
      (e) =>
        new Date(e.created_at).toLocaleDateString("en-US") === todayStr &&
        e.mood !== null
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((e) => ({
      emoji: MOOD_EMOJIS[e.mood!] ?? "",
      y: e.mood!,
      sublabel: new Date(e.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    }));

  // Week: average mood per day for the last 7 days
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const byDay = new Map<number, number[]>();
  for (const e of entries) {
    if (e.mood === null) continue;
    const d = new Date(e.created_at);
    if (d < weekStart) continue;
    const dayKey = d.getDay() + d.toLocaleDateString("en-US").length * 10; // unique per calendar day
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!byDay.has(dateOnly)) byDay.set(dateOnly, []);
    byDay.get(dateOnly)!.push(e.mood);
  }

  const weekPoints: { emoji: string; y: number; sublabel: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const moods = byDay.get(dateOnly);
    if (moods && moods.length > 0) {
      const avg = Math.round(moods.reduce((a, b) => a + b, 0) / moods.length);
      weekPoints.push({
        emoji: MOOD_EMOJIS[avg] ?? "",
        y: avg,
        sublabel: DAY_LABELS[d.getDay()],
      });
    } else {
      weekPoints.push({ emoji: "", y: -1, sublabel: DAY_LABELS[d.getDay()] });
    }
  }

  // Filter out days with no mood for the line, but keep sublabels
  const hasWeekData = weekPoints.some((p) => p.y >= 0);

  if (todayPoints.length === 0 && !hasWeekData) return null;

  return (
    <div className="mb-3 space-y-1">
      {todayPoints.length > 0 && (
        <MiniChart label="Today" points={todayPoints} />
      )}
      {hasWeekData && (
        <MiniChart
          label="This week"
          points={weekPoints.filter((p) => p.y >= 0)}
        />
      )}
    </div>
  );
}
