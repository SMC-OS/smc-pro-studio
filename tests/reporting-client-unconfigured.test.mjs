import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice I: proves submitProfileReport/submitMessageReport throw
// SocialUnavailableError (via reportingClient.ts's requireClient) and never
// reach an RPC call when Supabase itself is unconfigured. Split into its own
// file/mock.module registration for the identical reason
// messaging-client-unconfigured.test.mjs documents for messagingClient.ts:
// isSupabaseConfigured is captured once when the mock is set up, so a single
// file can't flip between "configured" and "unconfigured" scenarios. See
// reporting-client.test.mjs for the configured-client cases.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: false,
    // If requireClient() ever reached this (the `!isSupabaseConfigured`
    // guard skipped or reordered), the resulting error would not be
    // SocialUnavailableError and no RPC call could ever be recorded as
    // "never reached" — this is what proves "no RPC" rather than merely
    // "throws something".
    getSupabaseClient: () => {
      throw new Error("getSupabaseClient() must not be called when Supabase is unconfigured");
    },
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const { submitProfileReport, submitMessageReport } = await import(new URL("../src/social/services/reportingClient.ts", import.meta.url).href);

const VALID_TARGET_ID = "b0000000-0000-0000-0000-000000000002";
const VALID_MESSAGE_ID = "e1000000-0000-0000-0000-000000000001";

test("submitProfileReport: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(
    () => submitProfileReport(VALID_TARGET_ID, "spam"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});

test("submitMessageReport: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(
    () => submitMessageReport(VALID_MESSAGE_ID, "spam"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});
