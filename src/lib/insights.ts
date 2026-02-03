import type { DecryptedEntry } from "@/lib/entries";

export interface InsightStats {
  totalEntries: number;
  entriesThisMonth: number;
  entriesThisWeek: number;
  avgMood: number | null;
  avgEnergy: number | null;
  topTags: { name: string; count: number }[];
  topActivities: { name: string; count: number }[];
  moodByDay: { date: string; avg: number; count: number }[];
  energyByDay: { date: string; avg: number; count: number }[];
  entriesByDayOfWeek: number[]; // Sun=0 .. Sat=6
  entriesByHour: number[]; // 0..23
  onThisDay: DecryptedEntry[];
  observations: string[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function computeInsights(entries: DecryptedEntry[]): InsightStats {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const today = now.getDate();
  const todayMonth = now.getMonth();

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Basic counts
  const entriesThisMonth = entries.filter((e) => {
    const d = new Date(e.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const entriesThisWeek = entries.filter(
    (e) => new Date(e.created_at) >= weekAgo,
  ).length;

  // Average mood/energy
  const moods = entries.filter((e) => e.mood !== null).map((e) => e.mood!);
  const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

  const energies = entries.filter((e) => e.energy !== null).map((e) => e.energy!);
  const avgEnergy = energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : null;

  // Top tags
  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top activities
  const actCounts = new Map<string, number>();
  for (const e of entries) {
    for (const a of e.activities) {
      actCounts.set(a, (actCounts.get(a) ?? 0) + 1);
    }
  }
  const topActivities = [...actCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Mood and energy by day (last 30 days)
  const moodByDayMap = new Map<string, number[]>();
  const energyByDayMap = new Map<string, number[]>();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const e of entries) {
    const d = new Date(e.created_at);
    if (d < thirtyDaysAgo) continue;
    const key = d.toISOString().slice(0, 10);
    if (e.mood !== null) {
      if (!moodByDayMap.has(key)) moodByDayMap.set(key, []);
      moodByDayMap.get(key)!.push(e.mood);
    }
    if (e.energy !== null) {
      if (!energyByDayMap.has(key)) energyByDayMap.set(key, []);
      energyByDayMap.get(key)!.push(e.energy);
    }
  }

  const moodByDay = [...moodByDayMap.entries()]
    .map(([date, vals]) => ({
      date,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const energyByDay = [...energyByDayMap.entries()]
    .map(([date, vals]) => ({
      date,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Entries by day of week and hour
  const entriesByDayOfWeek = new Array(7).fill(0);
  const entriesByHour = new Array(24).fill(0);
  for (const e of entries) {
    const d = new Date(e.created_at);
    entriesByDayOfWeek[d.getDay()]++;
    entriesByHour[d.getHours()]++;
  }

  // On this day (same month+day, different year)
  const onThisDay = entries.filter((e) => {
    const d = new Date(e.created_at);
    return d.getDate() === today && d.getMonth() === todayMonth && d.getFullYear() !== thisYear;
  });

  // Observations
  const observations: string[] = [];

  if (entries.length >= 7) {
    // Most active day of week
    const maxDayIdx = entriesByDayOfWeek.indexOf(Math.max(...entriesByDayOfWeek));
    observations.push(`You write most often on ${DAY_NAMES[maxDayIdx]}s.`);

    // Most active time of day
    const maxHour = entriesByHour.indexOf(Math.max(...entriesByHour));
    const period = maxHour < 6 ? "late at night" : maxHour < 12 ? "in the morning" : maxHour < 17 ? "in the afternoon" : maxHour < 21 ? "in the evening" : "late at night";
    observations.push(`You tend to write ${period}.`);
  }

  if (avgMood !== null && entries.length >= 7) {
    // Mood on weekdays vs weekends
    const weekdayMoods: number[] = [];
    const weekendMoods: number[] = [];
    for (const e of entries) {
      if (e.mood === null) continue;
      const day = new Date(e.created_at).getDay();
      if (day === 0 || day === 6) weekendMoods.push(e.mood);
      else weekdayMoods.push(e.mood);
    }
    if (weekdayMoods.length >= 3 && weekendMoods.length >= 3) {
      const wdAvg = weekdayMoods.reduce((a, b) => a + b, 0) / weekdayMoods.length;
      const weAvg = weekendMoods.reduce((a, b) => a + b, 0) / weekendMoods.length;
      const diff = Math.abs(wdAvg - weAvg);
      if (diff > 0.5) {
        observations.push(
          wdAvg > weAvg
            ? "Your mood tends to be higher on weekdays."
            : "Your mood tends to be higher on weekends.",
        );
      }
    }
  }

  if (topTags.length > 0) {
    observations.push(`Your most used tag is "${topTags[0].name}" (${topTags[0].count} entries).`);
  }

  return {
    totalEntries: entries.length,
    entriesThisMonth,
    entriesThisWeek,
    avgMood,
    avgEnergy,
    topTags,
    topActivities,
    moodByDay,
    energyByDay,
    entriesByDayOfWeek,
    entriesByHour,
    onThisDay,
    observations,
  };
}
