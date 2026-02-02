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

const MOOD_COLORS: Record<number, string> = {
  0: "#999",
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#22c55e",
  6: "#10b981",
};

function moodColor(y: number): string {
  return MOOD_COLORS[Math.round(y)] ?? "#999";
}

function MiniChart({
  label,
  points,
}: {
  label: string;
  points: { emoji: string; y: number; sublabel: string }[];
}) {
  if (points.length === 0) return null;

  const W = 300;
  const H = 80;
  const PX = 20;
  const PY = 14;
  const BOTTOM = 16; // space for labels

  function px(i: number) {
    if (points.length === 1) return W / 2;
    return PX + (i / (points.length - 1)) * (W - PX * 2);
  }

  function py(val: number) {
    return PY + ((6 - val) / 6) * (H - PY - BOTTOM - PY);
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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
              fontSize={18}
            >
              {p.emoji}
            </text>
            <circle
              cx={p.cx}
              cy={p.cy + 16}
              r={3}
              fill={moodColor(p.y)}
            />
            <text
              x={p.cx}
              y={H - 1}
              textAnchor="middle"
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.4}
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
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Last 24 hours entries with mood
  const recentPoints = entries
    .filter(
      (e) =>
        new Date(e.created_at) >= past24h &&
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

  // Last 10 days: average mood per day
  const last10: string[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last10.push(d.toLocaleDateString("en-US"));
  }

  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    if (e.mood === null) continue;
    const key = new Date(e.created_at).toLocaleDateString("en-US");
    if (!last10.includes(key)) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e.mood);
  }

  const weekPoints: { emoji: string; y: number; sublabel: string }[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US");
    const moods = byDay.get(key);
    if (moods && moods.length > 0) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
      weekPoints.push({
        emoji: MOOD_EMOJIS[Math.round(avg)] ?? "",
        y: avg,
        sublabel: DAY_LABELS[d.getDay()],
      });
    } else {
      weekPoints.push({ emoji: "", y: -1, sublabel: DAY_LABELS[d.getDay()] });
    }
  }

  // Filter out days with no mood for the line, but keep sublabels
  const hasWeekData = weekPoints.some((p) => p.y >= 0);

  if (recentPoints.length === 0 && !hasWeekData) return null;

  return (
    <div className="mb-3 space-y-1">
      {recentPoints.length > 0 && (
        <MiniChart label="Last 24h" points={recentPoints} />
      )}
      {hasWeekData && (
        <MiniChart
          label="Last 10 days"
          points={weekPoints.filter((p) => p.y >= 0)}
        />
      )}
    </div>
  );
}
