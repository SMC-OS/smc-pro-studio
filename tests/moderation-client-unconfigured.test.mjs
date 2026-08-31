import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice J: proves checkModeratorAccess/fetchModerationReports/
// reviewReport throw SocialUnavailableError (via moderationClient.ts's
// requireClient) and never reach an RPC call when Supabase itself is
// unconfigured. Split into its own file/mock.module registration for the
// identical reason messaging-client-unconfigured.test.mjs /
// reporting-client-unconfigured.test.mjs already document: isSupabaseConfigured
// is captured once when the mock is set up, so a single file can't flip
// between "configured" and "unconfigured" scenarios.

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

const { checkModeratorAccess, fetchModerationReports, reviewReport } = await import(
  new URL("../src/social/services/moderationClient.ts", import.meta.url).href
);

const VALID_REPORT_ID = "a1000000-0000-0000-0000-000000000001";

test("checkModeratorAccess: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(
    () => checkModeratorAccess(),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});

test("fetchModerationReports: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(
    () => fetchModerationReports("pending"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});

test("reviewReport: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(
    () => reviewReport(VALID_REPORT_ID, "resolved"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      return true;
    }
  );
});
