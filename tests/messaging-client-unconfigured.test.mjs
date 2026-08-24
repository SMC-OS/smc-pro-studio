import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice B: proves fetchMyConversations/fetchMessages throw
// SocialUnavailableError (via messagingClient.ts's requireClient) and never
// reach a query when Supabase itself is unconfigured. Split into its own
// file/mock.module registration because isSupabaseConfigured is captured
// once when the mock is set up (node:test's module-mock exports are a
// snapshot, not a live binding — confirmed experimentally: a getter re-read
// on each import does not observe later mutation within one process), so a
// single test file can't flip between "configured" and "unconfigured"
// scenarios. See messaging-client.test.mjs for the configured-client cases
// (including the parallel "unauthenticated" checks, which don't need a
// separate file since isSupabaseConfigured stays true there).

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: false,
    // If requireClient() ever reached this (i.e. the `!isSupabaseConfigured`
    // guard were skipped or reordered), the resulting error would not be
    // SocialUnavailableError, so the assertions below would fail — this is
    // what proves "no query" rather than merely "throws something".
    getSupabaseClient: () => {
      throw new Error("getSupabaseClient() must not be called when Supabase is unconfigured");
    },
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const { fetchMyConversations, fetchMessages } = await import(
  new URL("../src/social/services/messagingClient.ts", import.meta.url).href
);

const VALID_CONVO_ID = "c0000000-0000-0000-0000-000000000001";

test("fetchMyConversations: an unconfigured Supabase client throws SocialUnavailableError before any query", async () => {
  await assert.rejects(
    () => fetchMyConversations(),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});

test("fetchMessages: an unconfigured Supabase client throws SocialUnavailableError before any query", async () => {
  await assert.rejects(
    () => fetchMessages(VALID_CONVO_ID),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});
