import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 5 Slice A: materialsClient.ts's read functions are guest-safe public
// reads (like socialClient.ts's fetchHomeFeed/searchPublicProfessionals),
// not auth-gated writes — an unconfigured Supabase client degrades to a
// safe empty result ([] / null) rather than throwing, mirroring those two
// functions exactly. Split into its own file for the same reason
// messaging-client-unconfigured.test.mjs is separate from
// messaging-client.test.mjs: node:test's mock.module exports are a
// one-time snapshot, so a single file can't flip isSupabaseConfigured
// between true and false across test cases.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: false,
    // If either function under test ever reached this, that alone would be
    // a bug — proves "no query" rather than merely "resolved to empty".
    getSupabaseClient: () => {
      throw new Error("getSupabaseClient() must not be called when Supabase is unconfigured");
    },
  },
});

const { fetchPublishedMaterials, fetchMaterialBySlug } = await import(
  new URL("../src/social/services/materialsClient.ts", import.meta.url).href
);

test("fetchPublishedMaterials: an unconfigured Supabase client resolves to a genuinely empty list before any query", async () => {
  const result = await fetchPublishedMaterials();
  assert.deepEqual(result, []);
});

test("fetchPublishedMaterials: an unconfigured Supabase client resolves to an empty list even with a category filter", async () => {
  const result = await fetchPublishedMaterials("quartz");
  assert.deepEqual(result, []);
});

test("fetchMaterialBySlug: an unconfigured Supabase client resolves to null before any query", async () => {
  const result = await fetchMaterialBySlug("calacatta-quartz");
  assert.equal(result, null);
});
