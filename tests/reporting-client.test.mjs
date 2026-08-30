import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice I: unit coverage for src/social/services/reportingClient.ts
// against a fake Supabase client, following this repo's existing node:test
// --experimental-test-module-mocks convention (see
// tests/messaging-client.test.mjs, which this file mirrors exactly for its
// own auth/UUID/error-shape assertions).

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const {
  submitProfileReport,
  submitMessageReport,
  ReportingOperationError,
  REPORT_CATEGORIES,
  REPORT_DETAILS_MAX_LENGTH,
} = await import(new URL("../src/social/services/reportingClient.ts", import.meta.url).href);

function assertSafeReportingError(err, { operation, message, cause, rawFragments }) {
  assert.ok(err instanceof ReportingOperationError, "must be a ReportingOperationError, not a bare Error");
  assert.equal(err.name, "ReportingOperationError");
  assert.equal(err.operation, operation);
  assert.equal(err.message, message, "the thrown error's own message must be exactly the safe, stable text — never derived from the backend error");
  if (cause !== undefined) assert.equal(err.cause, cause, "the original backend error must survive as `cause` for logging");
  for (const fragment of rawFragments) {
    assert.ok(!err.message.includes(fragment), `safe message must not contain raw backend fragment ${JSON.stringify(fragment)}`);
  }
  return true;
}

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "b0000000-0000-0000-0000-000000000002";
const VALID_MESSAGE_ID = "e1000000-0000-0000-0000-000000000001";
const RECEIPT_ID = "f1000000-0000-0000-0000-000000000001";
const CREATED_AT = "2026-01-01T00:00:00.000Z";
const SAFE_SUBMIT_ERROR = "We couldn't submit this report. Please try again.";

function authUser(userId) {
  return { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) };
}

function authUserError(err) {
  return { getUser: async () => ({ data: { user: null }, error: err }) };
}

const AUTH_VERIFICATION_ERROR = { message: "fetch failed" };

function rpcClient({ userId = AUTH_USER_ID, data = null, error = null } = {}) {
  const rpcCalls = [];
  return {
    rpcCalls,
    client: {
      auth: authUser(userId),
      rpc: async (name, params) => {
        rpcCalls.push({ name, params });
        return error ? { data: null, error } : { data, error: null };
      },
    },
  };
}

function profileReceipt(overrides = {}) {
  return { id: RECEIPT_ID, target_kind: "profile", category: "spam", created_at: CREATED_AT, ...overrides };
}

function messageReceipt(overrides = {}) {
  return { id: RECEIPT_ID, target_kind: "message", category: "spam", created_at: CREATED_AT, ...overrides };
}

// ==========================================================================
// submitProfileReport
// ==========================================================================

// The "unconfigured Supabase client" case (isSupabaseConfigured = false)
// cannot be exercised in this file: node:test's module-mock exports are a
// one-time snapshot, not a live binding (the identical constraint
// messaging-client-unconfigured.test.mjs's own header documents for
// messagingClient.ts), and this file's mock.module call above already fixed
// isSupabaseConfigured to true for every test below. See
// reporting-client-unconfigured.test.mjs for that direct proof, in its own
// file for the identical reason.

test("submitProfileReport: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "spam"), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("submitProfileReport: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: profileReceipt(), error: null };
    },
  };
  await assert.rejects(
    () => submitProfileReport(OTHER_USER_ID, "spam"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0, "the RPC must never be invoked when session verification itself fails");
});

test("submitProfileReport: rejects a malformed reported-user ID before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitProfileReport("not-a-uuid", "spam"), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("submitProfileReport: every documented category is accepted and sent verbatim", async () => {
  for (const category of REPORT_CATEGORIES) {
    const { client, rpcCalls } = rpcClient({ data: profileReceipt({ category, ...(category === "other" ? { } : {}) }) });
    currentClient = client;
    const details = category === "other" ? "needs details" : undefined;
    const receipt = await submitProfileReport(OTHER_USER_ID, category, details);
    assert.equal(rpcCalls[0].params.p_category, category);
    assert.equal(receipt.category, category);
  }
});

test("submitProfileReport: rejects an unknown category before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "not_a_real_category"), /valid report category/);
  assert.equal(rpcCalls.length, 0);
});

test("submitProfileReport: calls submit_profile_report with exactly the merged parameter names and no others", async () => {
  const { client, rpcCalls } = rpcClient({ data: profileReceipt() });
  currentClient = client;
  await submitProfileReport(OTHER_USER_ID, "spam");
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "submit_profile_report");
  assert.deepEqual(rpcCalls[0].params, { p_reported_user_id: OTHER_USER_ID, p_category: "spam", p_details: null });
  assert.deepEqual(
    Object.keys(rpcCalls[0].params).sort(),
    ["p_category", "p_details", "p_reported_user_id"],
    "no reporter/status/reviewer/enforcement parameter — the RPC binds to the session internally and has no such parameter"
  );
});

test("submitProfileReport: trims details before sending", async () => {
  const { client, rpcCalls } = rpcClient({ data: profileReceipt() });
  currentClient = client;
  await submitProfileReport(OTHER_USER_ID, "spam", "   looks like spam   ");
  assert.equal(rpcCalls[0].params.p_details, "looks like spam");
});

test("submitProfileReport: omitted details are sent as null, matching the RPC's own default-null contract", async () => {
  const { client, rpcCalls } = rpcClient({ data: profileReceipt() });
  currentClient = client;
  await submitProfileReport(OTHER_USER_ID, "spam");
  assert.equal(rpcCalls[0].params.p_details, null);
});

test("submitProfileReport: rejects supplied whitespace-only details before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "spam", "   \n\t  "), /whitespace-only/);
  assert.equal(rpcCalls.length, 0);
});

test("submitProfileReport: rejects details over the merged maximum length before any RPC call, but allows exactly the maximum", async () => {
  const over = rpcClient({});
  currentClient = over.client;
  await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "spam", "x".repeat(REPORT_DETAILS_MAX_LENGTH + 1)), /1000 characters or fewer/);
  assert.equal(over.rpcCalls.length, 0);

  const exact = rpcClient({ data: profileReceipt() });
  currentClient = exact.client;
  await submitProfileReport(OTHER_USER_ID, "spam", "x".repeat(REPORT_DETAILS_MAX_LENGTH));
  assert.equal(exact.rpcCalls.length, 1, "exactly the maximum length must be accepted, not rejected");
});

test("submitProfileReport: category 'other' requires non-empty details before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "other"), /required when the category is "other"/);
  await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "other", "   "), /whitespace-only/, "whitespace-only is rejected as whitespace-only, checked before the 'other' rule");
  assert.equal(rpcCalls.length, 0);

  const withDetails = rpcClient({ data: profileReceipt({ category: "other" }) });
  currentClient = withDetails.client;
  await submitProfileReport(OTHER_USER_ID, "other", "explains why");
  assert.equal(withDetails.rpcCalls.length, 1);
});

test("submitProfileReport: a valid confirmed receipt is returned exactly as camelCase fields", async () => {
  const { client } = rpcClient({ data: profileReceipt({ category: "harassment" }) });
  currentClient = client;
  const receipt = await submitProfileReport(OTHER_USER_ID, "harassment");
  assert.deepEqual(receipt, { id: RECEIPT_ID, targetKind: "profile", category: "harassment", createdAt: CREATED_AT });
});

test("submitProfileReport: a duplicate-pending RPC success is a normal confirmed receipt, not a special case", async () => {
  // The RPC's own idempotent begin/exception handling means a duplicate
  // submission looks identical to a first-time one from this file's
  // perspective — this proves the client has no special branch for it.
  const { client } = rpcClient({ data: profileReceipt() });
  currentClient = client;
  const first = await submitProfileReport(OTHER_USER_ID, "spam");
  const second = await submitProfileReport(OTHER_USER_ID, "spam");
  assert.deepEqual(first, second);
});

test("submitProfileReport: malformed receipt data is rejected rather than trusted", async () => {
  const cases = [
    { label: "null", data: null },
    { label: "non-object", data: "not-an-object" },
    { label: "missing id", data: profileReceipt({ id: undefined }) },
    { label: "non-uuid id", data: profileReceipt({ id: "not-a-uuid" }) },
    { label: "invalid target_kind", data: profileReceipt({ target_kind: "message" }) },
    { label: "invalid category", data: profileReceipt({ category: "not_a_real_category" }) },
    { label: "category mismatch vs request", data: profileReceipt({ category: "harassment" }) },
    { label: "missing created_at", data: profileReceipt({ created_at: undefined }) },
    { label: "non-string created_at", data: profileReceipt({ created_at: 12345 }) },
  ];
  for (const { label, data } of cases) {
    const { client } = rpcClient({ data });
    currentClient = client;
    await assert.rejects(() => submitProfileReport(OTHER_USER_ID, "spam"), (err) => {
      assert.ok(err instanceof ReportingOperationError, `${label}: must reject as ReportingOperationError`);
      assert.equal(err.message, SAFE_SUBMIT_ERROR, `${label}: must use the safe message`);
      return true;
    });
  }
});

test("submitProfileReport: an RPC failure normalizes to the safe message, never the raw PostgREST/RLS/constraint text, preserving cause", async () => {
  const rawError = { message: "submit_profile_report: cannot report yourself", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => submitProfileReport(OTHER_USER_ID, "spam"),
    (err) =>
      assertSafeReportingError(err, {
        operation: "submit_profile_report",
        message: SAFE_SUBMIT_ERROR,
        cause: rawError,
        rawFragments: ["submit_profile_report", "yourself", "P0001"],
      })
  );
});

test("submitProfileReport: a unique-violation-shaped RPC error also normalizes to the identical safe message", async () => {
  const rawError = {
    message: 'duplicate key value violates unique constraint "reports_profile_active_duplicate_unique"',
    code: "23505",
  };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => submitProfileReport(OTHER_USER_ID, "spam"),
    (err) =>
      assertSafeReportingError(err, {
        operation: "submit_profile_report",
        message: SAFE_SUBMIT_ERROR,
        cause: rawError,
        rawFragments: ["reports_profile_active_duplicate_unique", "23505", "constraint"],
      })
  );
});

test("submitProfileReport: never sends a reporter/reviewer/status/enforcement field, even if one were somehow supplied", async () => {
  // submitProfileReport's own signature has no such parameter — this proves
  // the sent RPC params object can never contain one regardless of call site.
  const { client, rpcCalls } = rpcClient({ data: profileReceipt() });
  currentClient = client;
  await submitProfileReport(OTHER_USER_ID, "spam", "details");
  for (const forbidden of ["reporter_id", "p_reporter_id", "status", "p_status", "reviewer_id", "p_reviewer_id", "enforcement", "p_enforcement"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});

// ==========================================================================
// submitMessageReport
// ==========================================================================

test("submitMessageReport: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => submitMessageReport(VALID_MESSAGE_ID, "spam"), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("submitMessageReport: a genuine auth.getUser() failure throws SocialUnavailableError before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: messageReceipt(), error: null };
    },
  };
  await assert.rejects(
    () => submitMessageReport(VALID_MESSAGE_ID, "spam"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("submitMessageReport: rejects a malformed message ID before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitMessageReport("not-a-uuid", "spam"), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("submitMessageReport: calls submit_message_report with exactly the merged parameter names — no conversation or sender ID is ever sent", async () => {
  const { client, rpcCalls } = rpcClient({ data: messageReceipt() });
  currentClient = client;
  await submitMessageReport(VALID_MESSAGE_ID, "spam");
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "submit_message_report");
  assert.deepEqual(rpcCalls[0].params, { p_message_id: VALID_MESSAGE_ID, p_category: "spam", p_details: null });
  assert.deepEqual(Object.keys(rpcCalls[0].params).sort(), ["p_category", "p_details", "p_message_id"]);
  for (const forbidden of ["conversation_id", "p_conversation_id", "sender_id", "p_sender_id", "reported_user_id", "p_reported_user_id"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden} — the RPC derives both server-side`);
  }
});

test("submitMessageReport: every documented category is accepted and sent verbatim", async () => {
  for (const category of REPORT_CATEGORIES) {
    const { client, rpcCalls } = rpcClient({ data: messageReceipt({ category }) });
    currentClient = client;
    const details = category === "other" ? "needs details" : undefined;
    const receipt = await submitMessageReport(VALID_MESSAGE_ID, category, details);
    assert.equal(rpcCalls[0].params.p_category, category);
    assert.equal(receipt.category, category);
  }
});

test("submitMessageReport: rejects an unknown category before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitMessageReport(VALID_MESSAGE_ID, "not_a_real_category"), /valid report category/);
  assert.equal(rpcCalls.length, 0);
});

test("submitMessageReport: trims details before sending", async () => {
  const { client, rpcCalls } = rpcClient({ data: messageReceipt() });
  currentClient = client;
  await submitMessageReport(VALID_MESSAGE_ID, "spam", "  spammy  ");
  assert.equal(rpcCalls[0].params.p_details, "spammy");
});

test("submitMessageReport: omitted details remain null, matching the RPC's own default-null contract", async () => {
  const { client, rpcCalls } = rpcClient({ data: messageReceipt() });
  currentClient = client;
  await submitMessageReport(VALID_MESSAGE_ID, "spam");
  assert.equal(rpcCalls[0].params.p_details, null);
});

test("submitMessageReport: rejects supplied whitespace-only details before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitMessageReport(VALID_MESSAGE_ID, "spam", "   "), /whitespace-only/);
  assert.equal(rpcCalls.length, 0);
});

test("submitMessageReport: rejects details over the merged maximum length, but allows exactly the maximum", async () => {
  const over = rpcClient({});
  currentClient = over.client;
  await assert.rejects(() => submitMessageReport(VALID_MESSAGE_ID, "spam", "x".repeat(REPORT_DETAILS_MAX_LENGTH + 1)), /1000 characters or fewer/);
  assert.equal(over.rpcCalls.length, 0);

  const exact = rpcClient({ data: messageReceipt() });
  currentClient = exact.client;
  await submitMessageReport(VALID_MESSAGE_ID, "spam", "x".repeat(REPORT_DETAILS_MAX_LENGTH));
  assert.equal(exact.rpcCalls.length, 1);
});

test("submitMessageReport: category 'other' requires non-empty details before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => submitMessageReport(VALID_MESSAGE_ID, "other"), /required when the category is "other"/);
  assert.equal(rpcCalls.length, 0);

  const withDetails = rpcClient({ data: messageReceipt({ category: "other" }) });
  currentClient = withDetails.client;
  await submitMessageReport(VALID_MESSAGE_ID, "other", "explains why");
  assert.equal(withDetails.rpcCalls.length, 1);
});

test("submitMessageReport: a valid confirmed receipt is returned exactly as camelCase fields", async () => {
  const { client } = rpcClient({ data: messageReceipt({ category: "threat_or_violence" }) });
  currentClient = client;
  const receipt = await submitMessageReport(VALID_MESSAGE_ID, "threat_or_violence");
  assert.deepEqual(receipt, { id: RECEIPT_ID, targetKind: "message", category: "threat_or_violence", createdAt: CREATED_AT });
});

test("submitMessageReport: a duplicate-pending RPC success is a normal confirmed receipt, not a special case", async () => {
  const { client } = rpcClient({ data: messageReceipt() });
  currentClient = client;
  const first = await submitMessageReport(VALID_MESSAGE_ID, "spam");
  const second = await submitMessageReport(VALID_MESSAGE_ID, "spam");
  assert.deepEqual(first, second);
});

test("submitMessageReport: malformed receipt data is rejected rather than trusted", async () => {
  const cases = [
    { label: "null", data: null },
    { label: "wrong target_kind (profile instead of message)", data: messageReceipt({ target_kind: "profile" }) },
    { label: "invalid category", data: messageReceipt({ category: "bogus" }) },
    { label: "category mismatch vs request", data: messageReceipt({ category: "harassment" }) },
    { label: "non-uuid id", data: messageReceipt({ id: "not-a-uuid" }) },
    { label: "missing created_at", data: messageReceipt({ created_at: undefined }) },
  ];
  for (const { label, data } of cases) {
    const { client } = rpcClient({ data });
    currentClient = client;
    await assert.rejects(() => submitMessageReport(VALID_MESSAGE_ID, "spam"), (err) => {
      assert.ok(err instanceof ReportingOperationError, `${label}: must reject as ReportingOperationError`);
      assert.equal(err.message, SAFE_SUBMIT_ERROR, `${label}: must use the safe message`);
      return true;
    });
  }
});

test("submitMessageReport: an RPC failure (own-message/non-member/network) normalizes to the safe message, never raw RLS/function/schema text, preserving cause", async () => {
  const rawError = { message: "submit_message_report: message not found in an accessible conversation", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => submitMessageReport(VALID_MESSAGE_ID, "spam"),
    (err) =>
      assertSafeReportingError(err, {
        operation: "submit_message_report",
        message: SAFE_SUBMIT_ERROR,
        cause: rawError,
        rawFragments: ["submit_message_report", "accessible conversation", "P0001"],
      })
  );
});

// An own-message rejection must collapse to the identical safe message as a
// non-member/nonexistent-message rejection — the caller gets no signal
// distinguishing "that was your own message" from any other reporting
// failure, the same "never confirm or deny" discipline messagingClient.ts's
// own createOrGetDirectConversation already established for blocked pairs.
test("submitMessageReport: an own-message RPC rejection produces the identical safe message as any other submission failure", async () => {
  const rawError = { message: "submit_message_report: cannot report your own message", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => submitMessageReport(VALID_MESSAGE_ID, "spam"),
    (err) =>
      assertSafeReportingError(err, {
        operation: "submit_message_report",
        message: SAFE_SUBMIT_ERROR,
        cause: rawError,
        rawFragments: ["own message"],
      })
  );
});

test("submitMessageReport: never sends a reporter/reviewer/status/enforcement field", async () => {
  const { client, rpcCalls } = rpcClient({ data: messageReceipt() });
  currentClient = client;
  await submitMessageReport(VALID_MESSAGE_ID, "spam", "details");
  for (const forbidden of ["reporter_id", "p_reporter_id", "status", "p_status", "reviewer_id", "p_reviewer_id", "enforcement", "p_enforcement"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});

test("reportingClient.ts's REPORT_CATEGORIES matches the merged public.report_category vocabulary exactly", () => {
  assert.deepEqual(
    [...REPORT_CATEGORIES].sort(),
    ["harassment", "hate_or_abuse", "impersonation", "other", "scam_or_fraud", "sexual_content", "spam", "threat_or_violence"].sort()
  );
});
