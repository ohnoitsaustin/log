/**
 * Integration test: create entry → list → read back → matches.
 *
 * Requires a running Supabase instance with env vars in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD
 *
 * Run with: npm run test:integration
 * Skipped in `npm test` (unit-only) via filename convention.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { deriveKey, generateSalt } from "../crypto";
import { createEntry, listEntries, getEntry } from "../entries";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

const canRun = url && anonKey && email && password;

describe.skipIf(!canRun)("entries integration", () => {
  let supabase: SupabaseClient;
  let key: CryptoKey;
  let userId: string;
  let createdEntryId: string;

  beforeAll(async () => {
    supabase = createClient(url!, anonKey!);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    if (error) throw new Error(`Auth failed: ${error.message}`);
    userId = data.user!.id;

    const salt = generateSalt();
    key = await deriveKey("integration-test-passphrase", salt);
  });

  afterAll(async () => {
    // Clean up the test entry
    if (createdEntryId) {
      await supabase.from("entry_tags").delete().eq("entry_id", createdEntryId);
      await supabase.from("entries").delete().eq("id", createdEntryId);
    }
    await supabase.auth.signOut();
  });

  it("create → list → getEntry round-trips correctly", async () => {
    const blob = {
      body: "Integration test entry " + Date.now(),
      mood: 4,
      tags: ["test", "integration"],
      activities: [],
    };

    // Create
    createdEntryId = await createEntry(supabase, key, userId, blob);
    expect(createdEntryId).toBeTruthy();

    // List (should include our entry)
    const entries = await listEntries(supabase, key);
    const found = entries.find((e) => e.id === createdEntryId);
    expect(found).toBeDefined();
    expect(found!.body).toBe(blob.body);
    expect(found!.mood).toBe(blob.mood);
    expect(found!.tags).toEqual(blob.tags);

    // Get single
    const single = await getEntry(supabase, key, createdEntryId);
    expect(single).not.toBeNull();
    expect(single!.body).toBe(blob.body);
    expect(single!.mood).toBe(blob.mood);
    expect(single!.tags).toEqual(blob.tags);
  });

  it("list with tag filter returns only matching entries", async () => {
    const entries = await listEntries(supabase, key, "integration");
    // Should contain the entry we created above
    const found = entries.find((e) => e.id === createdEntryId);
    expect(found).toBeDefined();

    // Filter by a tag that doesn't exist
    const empty = await listEntries(supabase, key, "nonexistent-tag-" + Date.now());
    expect(empty).toHaveLength(0);
  });
});
