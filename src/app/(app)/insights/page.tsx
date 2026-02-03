"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";
import { listEntries, type DecryptedEntry } from "@/lib/entries";
import { computeInsights, type InsightStats } from "@/lib/insights";
import { moodToEmoji } from "@/components/mood-picker";
import { energyToEmoji } from "@/components/energy-picker";
import { activityToEmoji } from "@/components/activity-input";
import { listActivities, type Activity } from "@/lib/activities";
import Link from "next/link";

const MOOD_COLORS: Record<number, string> = {
  0: "#999",
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#22c55e",
  6: "#10b981",
};

const ENERGY_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#22c55e",
};

const DAY_LABELS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function moodColor(val: number): string {
  return MOOD_COLORS[Math.round(val)] ?? "#999";
}

function energyColor(val: number): string {
  return ENERGY_COLORS[Math.round(val)] ?? "#999";
}

// --- Chart components ---

function BarChart({
  items,
  colorFn,
}: {
  items: { label: string; value: number }[];
  colorFn?: (index: number) => string;
}) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.value));

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className="text-foreground/60 w-20 truncate text-right text-xs">{item.label}</span>
          <div className="flex-1 h-5 bg-foreground/5 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: colorFn ? colorFn(i) : "var(--color-foreground)",
                opacity: colorFn ? 1 : 0.3,
              }}
            />
          </div>
          <span className="text-foreground/40 w-8 text-xs">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({
  points,
  colorFn,
  maxY,
  minY = 0,
  height = 100,
}: {
  points: { x: number; y: number; label?: string }[];
  colorFn: (y: number) => string;
  maxY: number;
  minY?: number;
  height?: number;
}) {
  if (points.length === 0) return null;

  const W = 400;
  const H = height;
  const PX = 8;
  const PY = 12;
  const range = maxY - minY || 1;

  function px(i: number) {
    if (points.length === 1) return W / 2;
    return PX + (i / (points.length - 1)) * (W - PX * 2);
  }

  function py(val: number) {
    return PY + ((maxY - val) / range) * (H - PY * 2 - 16);
  }

  const mapped = points.map((p, i) => ({ ...p, cx: px(i), cy: py(p.y) }));

  const linePath =
    mapped.length > 1
      ? mapped.map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx} ${p.cy}`).join(" ")
      : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {mapped.map((p, i) => (
        <g key={i}>
          <circle cx={p.cx} cy={p.cy} r={4} fill={colorFn(p.y)} />
          {p.label && (
            <text
              x={p.cx}
              y={H - 2}
              textAnchor="middle"
              fontSize={7}
              fill="currentColor"
              fillOpacity={0.3}
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function DayOfWeekChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-1.5 h-16">
      {counts.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-foreground/5 rounded-t overflow-hidden flex-1 flex items-end">
            <div
              className="w-full bg-foreground/20 rounded-t transition-all"
              style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
            />
          </div>
          <span className="text-[10px] text-foreground/40">{DAY_LABELS_SHORT[i]}</span>
        </div>
      ))}
    </div>
  );
}

function HourChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-px h-12">
      {counts.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-foreground/20 rounded-t transition-all"
            style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 1 : 0 }}
          />
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-foreground/5 rounded-lg p-4">
      <div className="text-foreground text-2xl font-semibold">{value}</div>
      <div className="text-foreground/40 text-xs mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-foreground/60 text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}

// --- Main page ---

export default function InsightsPage() {
  const supabase = createClient();
  const { key } = useKey();
  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    const [entryList, actList] = await Promise.all([
      listEntries(supabase, key),
      listActivities(supabase),
    ]);
    setEntries(entryList);
    setActivities(actList);
    setLoading(false);
  }, [key, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => (entries.length > 0 ? computeInsights(entries) : null), [entries]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-foreground text-2xl font-bold">Insights</h1>
        <div className="mt-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-foreground/5 animate-pulse rounded-lg h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalEntries === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-foreground text-2xl font-bold">Insights</h1>
        <p className="text-foreground/40 mt-6 text-sm">
          No entries yet. Start writing to see insights here.
        </p>
      </div>
    );
  }

  const moodLabels = stats.moodByDay.map((d) => {
    const date = new Date(d.date + "T12:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24">
      <h1 className="text-foreground text-2xl font-bold">Insights</h1>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total entries" value={stats.totalEntries} />
        <StatCard label="This month" value={stats.entriesThisMonth} />
        <StatCard label="This week" value={stats.entriesThisWeek} />
        <StatCard
          label="Avg mood"
          value={stats.avgMood !== null ? (moodToEmoji(Math.round(stats.avgMood)) ?? "—") : "—"}
        />
      </div>

      <div className="mt-8 space-y-8">
        {/* Observations */}
        {stats.observations.length > 0 && (
          <Section title="Observations">
            <div className="space-y-2">
              {stats.observations.map((obs, i) => (
                <p key={i} className="text-foreground/70 text-sm">{obs}</p>
              ))}
            </div>
          </Section>
        )}

        {/* Mood over time */}
        {stats.moodByDay.length > 0 && (
          <Section title="Mood — last 30 days">
            <LineChart
              points={stats.moodByDay.map((d, i) => ({
                x: i,
                y: d.avg,
                label: moodLabels[i],
              }))}
              colorFn={moodColor}
              maxY={6}
            />
          </Section>
        )}

        {/* Energy over time */}
        {stats.energyByDay.length > 0 && (
          <Section title="Energy — last 30 days">
            <LineChart
              points={stats.energyByDay.map((d, i) => ({
                x: i,
                y: d.avg,
                label: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              }))}
              colorFn={energyColor}
              maxY={5}
              minY={1}
              height={80}
            />
          </Section>
        )}

        {/* Writing patterns */}
        <Section title="Writing patterns">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-foreground/40 text-xs mb-2">By day of week</div>
              <DayOfWeekChart counts={stats.entriesByDayOfWeek} />
            </div>
            <div>
              <div className="text-foreground/40 text-xs mb-2">By hour</div>
              <HourChart counts={stats.entriesByHour} />
              <div className="flex justify-between text-[9px] text-foreground/30 mt-1">
                <span>12am</span>
                <span>12pm</span>
                <span>12am</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Top tags */}
        {stats.topTags.length > 0 && (
          <Section title="Top tags">
            <BarChart items={stats.topTags.map((t) => ({ label: t.name, value: t.count }))} />
          </Section>
        )}

        {/* Top activities */}
        {stats.topActivities.length > 0 && (
          <Section title="Top activities">
            <BarChart
              items={stats.topActivities.map((a) => ({
                label: `${activityToEmoji(a.name, activities) ?? ""} ${a.name}`,
                value: a.count,
              }))}
            />
          </Section>
        )}

        {/* On this day */}
        {stats.onThisDay.length > 0 && (
          <Section title="On this day">
            <div className="space-y-3">
              {stats.onThisDay.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/timeline/${entry.id}`}
                  className="block bg-foreground/5 rounded-lg p-4 hover:bg-foreground/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-foreground/40">
                    <span>
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    {entry.mood !== null && <span>{moodToEmoji(entry.mood)}</span>}
                    {entry.energy !== null && <span>{energyToEmoji(entry.energy)}</span>}
                  </div>
                  {entry.body && (
                    <p className="text-foreground/70 text-sm mt-1 line-clamp-2">{entry.body}</p>
                  )}
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
