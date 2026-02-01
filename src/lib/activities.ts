import type { SupabaseClient } from "@supabase/supabase-js";

export interface Activity {
  id: string;
  name: string;
  emoji: string;
}

export const DEFAULT_ACTIVITIES: { name: string; emoji: string }[] = [
  { name: "exercise", emoji: "🏃" },
  { name: "reading", emoji: "📖" },
  { name: "cooking", emoji: "🍳" },
  { name: "music", emoji: "🎵" },
  { name: "gaming", emoji: "🎮" },
  { name: "socializing", emoji: "👥" },
  { name: "work", emoji: "💼" },
  { name: "meditation", emoji: "🧘" },
  { name: "shopping", emoji: "🛍️" },
  { name: "cleaning", emoji: "🧹" },
  { name: "nature", emoji: "🌿" },
  { name: "movies", emoji: "🎬" },
  { name: "travel", emoji: "✈️" },
  { name: "pets", emoji: "🐾" },
  { name: "art", emoji: "🎨" },
  { name: "sleep", emoji: "😴" },
  { name: "coffee", emoji: "☕" },
  { name: "drinks", emoji: "🍺" },
  { name: "dating", emoji: "❤️" },
  { name: "study", emoji: "📝" },
];

export async function listActivities(supabase: SupabaseClient): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, emoji")
    .order("name");

  if (error || !data) return [];
  return data;
}

export async function createActivity(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  emoji: string,
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from("activities")
    .insert({ user_id: userId, name: name.trim().toLowerCase(), emoji })
    .select("id, name, emoji")
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateActivity(
  supabase: SupabaseClient,
  id: string,
  name: string,
  emoji: string,
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from("activities")
    .update({ name: name.trim().toLowerCase(), emoji })
    .eq("id", id)
    .select("id, name, emoji")
    .single();

  if (error || !data) return null;
  return data;
}

export async function deleteActivity(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from("activities").delete().eq("id", id);
}

export async function seedDefaultActivities(
  supabase: SupabaseClient,
  userId: string,
): Promise<Activity[]> {
  const rows = DEFAULT_ACTIVITIES.map((a) => ({
    user_id: userId,
    name: a.name,
    emoji: a.emoji,
  }));

  await supabase.from("activities").insert(rows);
  return listActivities(supabase);
}
