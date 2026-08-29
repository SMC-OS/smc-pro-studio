import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice D: proves subscribeToConversationMessages throws
// SocialUnavailableError (via messagingClient.ts's requireClient) and never
// reaches an authenticated session check or creates a channel when Supabase
// itself is unconfigured. Split into its own file/mock.module registration
// for the same reason as messaging-client-unconfigured.test.mjs:
// isSupabaseConfigured is captured once when the mock is set up, so a single
// test file can't flip between "configured" and "unconfigured" scenarios.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: false,
    getSupabaseClient: () => {
      throw new Error("getSupabaseClient() must not be called when Supabase is unconfigured");
    },
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const { subscribeToConversationMessages } = await import(new URL("../src/social/services/messagingClient.ts", import.meta.url).href);

const VALID_CONVO_ID = "c0000000-0000-0000-0000-000000000001";

test("subscribeToConversationMessages: an unconfigured Supabase client throws SocialUnavailableError and creates no channel", async () => {
  await assert.rejects(
    () => subscribeToConversationMessages(VALID_CONVO_ID, { onSignal: () => {}, onConnectionStateChange: () => {} }),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});
