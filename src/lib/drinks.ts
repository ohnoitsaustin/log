"use server";

import { neon } from "@neondatabase/serverless";

export async function getDrinkCounts(
  dates: string[]
): Promise<Record<string, number>> {
  const url = process.env.DRINK_DATABASE_URL;
  if (!url || dates.length === 0) return {};

  const sql = neon(url);
  const rows = await sql`SELECT date::text, count FROM drinks WHERE date = ANY(${dates})`;

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.date] = row.count;
  }
  return result;
}
