import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice J: unit coverage for src/social/services/moderationClient.ts
// against a fake Supabase client, following this repo's existing node:test
// --experimental-test-module-mocks convention (see
// tests/reporting-client.test.mjs, which this file mirrors closely for its
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
  checkModeratorAccess,
  fetchModerationReports,
  reviewReport,
  moderateReportedMessage,
  listModerationActions,
  ModerationOperationError,
  REVIEW_NOTE_MAX_LENGTH,
} = await import(new URL("../src/social/services/moderationClient.ts", import.meta.url).href);

function assertSafeModerationError(err, { operation, message, cause, rawFragments }) {
  assert.ok(err instanceof ModerationOperationError, "must be a ModerationOperationError, not a bare Error");
  assert.equal(err.name, "ModerationOperationError");
  assert.equal(err.operation, operation);
  assert.equal(err.message, message, "the thrown error's own message must be exactly the safe, stable text — never derived from the backend error");
  if (cause !== undefined) assert.equal(err.cause, cause, "the original backend error must survive as `cause` for logging");
  for (const fragment of rawFragments) {
    assert.ok(!err.message.includes(fragment), `safe message must not contain raw backend fragment ${JSON.stringify(fragment)}`);
  }
  return true;
}

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const REPORT_ID_1 = "b1000000-0000-0000-0000-000000000001";
const REPORT_ID_2 = "b1000000-0000-0000-0000-000000000002";
const SAFE_ACCESS_ERROR = "We couldn't verify your access. Please try again.";
const SAFE_QUEUE_ERROR = "The moderation queue could not be loaded. Please try again.";
const SAFE_REVIEW_ERROR = "This report could not be reviewed. Please try again.";
const SAFE_ENFORCEMENT_ERROR = "This action could not be completed. Please try again.";
const SAFE_ACTION_HISTORY_ERROR = "The moderation history could not be loaded. Please try again.";

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

function queueItem(overrides = {}) {
  return {
    report_id: REPORT_ID_1,
    target_kind: "profile",
    category: "spam",
    details: "some details",
    created_at: "2026-01-01T00:00:00.000Z",
    status: "pending",
    reviewed_at: null,
    reviewed_by_display_name: null,
    review_note: null,
    reporter_display_name: "Alice",
    reported_display_name: "Bob",
    message_body: null,
    message_created_at: null,
    // Phase 4 Slice K: always present in the real RPC's own row shape (null
    // for a profile report, per list_moderation_reports()'s own LEFT JOIN).
    message_moderation_status: null,
    has_more: false,
    ...overrides,
  };
}

function reviewRow(overrides = {}) {
  return { report_id: REPORT_ID_1, status: "resolved", reviewed_at: "2026-01-01T00:00:00.000Z", ...overrides };
}

function enforcementRow(overrides = {}) {
  return {
    action_id: "c1000000-0000-0000-0000-000000000001",
    message_id: "d1000000-0000-0000-0000-000000000001",
    moderation_status: "removed_by_moderator",
    acted_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function actionHistoryRow(overrides = {}) {
  return {
    action_id: "c1000000-0000-0000-0000-000000000001",
    report_id: REPORT_ID_1,
    message_id: "d1000000-0000-0000-0000-000000000001",
    action: "hide_message",
    moderator_display_name: "Dave",
    report_category: "harassment",
    report_target_kind: "message",
    note: null,
    created_at: "2026-01-01T00:00:00.000Z",
    has_more: false,
    ...overrides,
  };
}

// ==========================================================================
// checkModeratorAccess
// ==========================================================================

test("checkModeratorAccess: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => checkModeratorAccess(), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("checkModeratorAccess: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: true, error: null };
    },
  };
  await assert.rejects(
    () => checkModeratorAccess(),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0, "the RPC must never be invoked when session verification itself fails");
});

test("checkModeratorAccess: calls check_moderator_access with no arguments at all", async () => {
  const { client, rpcCalls } = rpcClient({ data: false });
  currentClient = client;
  await checkModeratorAccess();
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "check_moderator_access");
  assert.equal(rpcCalls[0].params, undefined, "no arguments — not even an empty object — are ever fabricated for this zero-parameter RPC");
});

test("checkModeratorAccess: a confirmed false is a genuine, successful denial — not an error", async () => {
  const { client } = rpcClient({ data: false });
  currentClient = client;
  assert.equal(await checkModeratorAccess(), false);
});

test("checkModeratorAccess: a confirmed true is returned as-is", async () => {
  const { client } = rpcClient({ data: true });
  currentClient = client;
  assert.equal(await checkModeratorAccess(), true);
});

test("checkModeratorAccess: an RPC failure throws the safe message rather than becoming a fabricated successful denial, preserving cause", async () => {
  const rawError = { message: "permission denied for function check_moderator_access", code: "42501" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => checkModeratorAccess(),
    (err) =>
      assertSafeModerationError(err, {
        operation: "check_access",
        message: SAFE_ACCESS_ERROR,
        cause: rawError,
        rawFragments: ["permission denied", "42501"],
      })
  );
});

test("checkModeratorAccess: a malformed (non-boolean) response is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: "true" });
  currentClient = client;
  await assert.rejects(() => checkModeratorAccess(), (err) => {
    assert.ok(err instanceof ModerationOperationError);
    assert.equal(err.message, SAFE_ACCESS_ERROR);
    return true;
  });
});

// ==========================================================================
// fetchModerationReports
// ==========================================================================

test("fetchModerationReports: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending"), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("fetchModerationReports: a genuine auth.getUser() failure throws SocialUnavailableError before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: [], error: null };
    },
  };
  await assert.rejects(
    () => fetchModerationReports("pending"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("fetchModerationReports: rejects an invalid status before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("all"), /valid moderation status/);
  assert.equal(rpcCalls.length, 0);
});

test("fetchModerationReports: calls list_moderation_reports with exactly the merged parameter names and no others", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await fetchModerationReports("pending");
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "list_moderation_reports");
  assert.deepEqual(rpcCalls[0].params, { p_status: "pending", p_limit: 25, p_cursor_created_at: null, p_cursor_id: null });
  assert.deepEqual(
    Object.keys(rpcCalls[0].params).sort(),
    ["p_cursor_created_at", "p_cursor_id", "p_limit", "p_status"],
    "no moderator identity parameter of any kind — the RPC binds to the session internally"
  );
});

test("fetchModerationReports: an omitted limit defaults to 25, matching the RPC's own default", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await fetchModerationReports("pending");
  assert.equal(rpcCalls[0].params.p_limit, 25);
});

test("fetchModerationReports: limit is bounded to [1, 50] regardless of caller input", async () => {
  let probe = rpcClient({ data: [] });
  currentClient = probe.client;
  await fetchModerationReports("pending", null, 9999);
  assert.equal(probe.rpcCalls[0].params.p_limit, 50, "an oversized limit must clamp to the maximum");

  probe = rpcClient({ data: [] });
  currentClient = probe.client;
  await fetchModerationReports("pending", null, -5);
  assert.equal(probe.rpcCalls[0].params.p_limit, 1, "a non-positive limit must clamp to the minimum");
});

test("fetchModerationReports: passes a supplied cursor's createdAt/id through as the exact RPC cursor parameters", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await fetchModerationReports("pending", { createdAt: "2026-01-01T00:00:00.000Z", id: REPORT_ID_1 });
  assert.equal(rpcCalls[0].params.p_cursor_created_at, "2026-01-01T00:00:00.000Z");
  assert.equal(rpcCalls[0].params.p_cursor_id, REPORT_ID_1);
});

test("fetchModerationReports: rejects a cursor with a malformed report id before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending", { createdAt: "2026-01-01T00:00:00.000Z", id: "not-a-uuid" }), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("fetchModerationReports: an authenticated, successful, genuinely empty queue returns an empty page, not an error", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  const page = await fetchModerationReports("pending");
  assert.deepEqual(page, { items: [], nextCursor: null });
  assert.equal(rpcCalls.length, 1, "the empty page must come from a real query that actually ran, not a short-circuit");
});

test("fetchModerationReports: a query failure throws the safe message rather than becoming a fake empty queue, preserving cause", async () => {
  const rawError = { message: "permission denied for function list_moderation_reports", code: "42501" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => fetchModerationReports("pending"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "fetch_queue",
        message: SAFE_QUEUE_ERROR,
        cause: rawError,
        rawFragments: ["permission denied", "42501"],
      })
  );
});

test("fetchModerationReports: an active-moderator-required RPC rejection normalizes to the safe message, never raw function/schema text", async () => {
  const rawError = { message: "list_moderation_reports: active moderator access required", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => fetchModerationReports("pending"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "fetch_queue",
        message: SAFE_QUEUE_ERROR,
        cause: rawError,
        rawFragments: ["list_moderation_reports", "active moderator", "P0001"],
      })
  );
});

test("fetchModerationReports: parses a full, well-formed queue item into the exact camelCase shape", async () => {
  const row = queueItem({
    target_kind: "message",
    message_body: "the reported text",
    message_created_at: "2026-01-01T00:00:05.000Z",
    message_moderation_status: "visible",
    reviewed_at: "2026-01-01T00:01:00.000Z",
    reviewed_by_display_name: "Mod",
    review_note: "looked into it",
    status: "resolved",
  });
  const { client } = rpcClient({ data: [row] });
  currentClient = client;
  const page = await fetchModerationReports("resolved");
  assert.deepEqual(page.items[0], {
    reportId: REPORT_ID_1,
    targetKind: "message",
    category: "spam",
    details: "some details",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "resolved",
    reviewedAt: "2026-01-01T00:01:00.000Z",
    reviewedByDisplayName: "Mod",
    reviewNote: "looked into it",
    reporterDisplayName: "Alice",
    reportedDisplayName: "Bob",
    messageBody: "the reported text",
    messageCreatedAt: "2026-01-01T00:00:05.000Z",
    messageModerationStatus: "visible",
  });
});

test("fetchModerationReports: a profile report row has a null message body/status, never fabricated content", async () => {
  const { client } = rpcClient({
    data: [queueItem({ target_kind: "profile", message_body: null, message_created_at: null, message_moderation_status: null })],
  });
  currentClient = client;
  const page = await fetchModerationReports("pending");
  assert.equal(page.items[0].messageBody, null);
  assert.equal(page.items[0].messageCreatedAt, null);
  assert.equal(page.items[0].messageModerationStatus, null);
});

test("fetchModerationReports: a hidden message report row reflects its current removed_by_moderator status", async () => {
  const { client } = rpcClient({ data: [queueItem({ target_kind: "message", message_moderation_status: "removed_by_moderator" })] });
  currentClient = client;
  const page = await fetchModerationReports("pending");
  assert.equal(page.items[0].messageModerationStatus, "removed_by_moderator");
});

test("fetchModerationReports: a malformed row (unrecognized message_moderation_status) is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: [queueItem({ message_moderation_status: "quarantined" })] });
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending"), (err) => {
    assert.ok(err instanceof ModerationOperationError);
    assert.equal(err.message, SAFE_QUEUE_ERROR);
    return true;
  });
});

test("fetchModerationReports: a malformed combination (message target with a null status) is rejected — a message report must always carry a valid status", async () => {
  const { client } = rpcClient({ data: [queueItem({ target_kind: "message", message_moderation_status: null })] });
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending"), (err) => {
    assert.ok(err instanceof ModerationOperationError);
    assert.equal(err.message, SAFE_QUEUE_ERROR);
    return true;
  });
});

test("fetchModerationReports: a malformed combination (profile target with a non-null status) is rejected — a profile report must never carry one", async () => {
  const { client } = rpcClient({ data: [queueItem({ target_kind: "profile", message_moderation_status: "visible" })] });
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending"), (err) => {
    assert.ok(err instanceof ModerationOperationError);
    assert.equal(err.message, SAFE_QUEUE_ERROR);
    return true;
  });
});

test("fetchModerationReports: has_more=true on the last row produces a nextCursor from that row's own createdAt/reportId", async () => {
  const rows = [
    queueItem({ report_id: REPORT_ID_1, created_at: "2026-01-02T00:00:00.000Z", has_more: true }),
    queueItem({ report_id: REPORT_ID_2, created_at: "2026-01-01T00:00:00.000Z", has_more: true }),
  ];
  const { client } = rpcClient({ data: rows });
  currentClient = client;
  const page = await fetchModerationReports("pending");
  assert.deepEqual(page.nextCursor, { createdAt: "2026-01-01T00:00:00.000Z", id: REPORT_ID_2 });
});

test("fetchModerationReports: has_more=false produces no nextCursor, even on a full page", async () => {
  const { client } = rpcClient({ data: [queueItem({ has_more: false })] });
  currentClient = client;
  const page = await fetchModerationReports("pending");
  assert.equal(page.nextCursor, null);
});

test("fetchModerationReports: a malformed row (invalid target_kind) is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: [queueItem({ target_kind: "conversation" })] });
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending"), (err) => {
    assert.ok(err instanceof ModerationOperationError);
    assert.equal(err.message, SAFE_QUEUE_ERROR);
    return true;
  });
});

test("fetchModerationReports: a malformed row (non-uuid report_id) is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: [queueItem({ report_id: "not-a-uuid" })] });
  currentClient = client;
  await assert.rejects(() => fetchModerationReports("pending"), /could not be loaded/);
});

// ==========================================================================
// reviewReport
// ==========================================================================

test("reviewReport: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => reviewReport(REPORT_ID_1, "resolved"), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("reviewReport: a genuine auth.getUser() failure throws SocialUnavailableError before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: [reviewRow()], error: null };
    },
  };
  await assert.rejects(
    () => reviewReport(REPORT_ID_1, "resolved"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("reviewReport: rejects a malformed report ID before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => reviewReport("not-a-uuid", "resolved"), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("reviewReport: rejects an invalid decision before any RPC call — pending is not a valid decision", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => reviewReport(REPORT_ID_1, "pending"), /resolved or dismissed/);
  assert.equal(rpcCalls.length, 0);
});

test("reviewReport: calls review_report with exactly the merged parameter names and no others — no reviewer identity or timestamp", async () => {
  const { client, rpcCalls } = rpcClient({ data: [reviewRow()] });
  currentClient = client;
  await reviewReport(REPORT_ID_1, "resolved");
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "review_report");
  assert.deepEqual(rpcCalls[0].params, { p_report_id: REPORT_ID_1, p_decision: "resolved", p_note: null });
  assert.deepEqual(Object.keys(rpcCalls[0].params).sort(), ["p_decision", "p_note", "p_report_id"]);
  for (const forbidden of ["reviewer_id", "p_reviewer_id", "reviewed_by", "p_reviewed_by", "reviewed_at", "p_reviewed_at"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});

test("reviewReport: trims a supplied note before sending", async () => {
  const { client, rpcCalls } = rpcClient({ data: [reviewRow()] });
  currentClient = client;
  await reviewReport(REPORT_ID_1, "dismissed", "   looked into it   ");
  assert.equal(rpcCalls[0].params.p_note, "looked into it");
});

test("reviewReport: omitted note is sent as null, matching the RPC's own default-null contract", async () => {
  const { client, rpcCalls } = rpcClient({ data: [reviewRow()] });
  currentClient = client;
  await reviewReport(REPORT_ID_1, "dismissed");
  assert.equal(rpcCalls[0].params.p_note, null);
});

test("reviewReport: rejects a supplied whitespace-only note before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => reviewReport(REPORT_ID_1, "dismissed", "   \n\t  "), /whitespace-only/);
  assert.equal(rpcCalls.length, 0);
});

test("reviewReport: rejects a note over the merged maximum length before any RPC call, but allows exactly the maximum", async () => {
  const over = rpcClient({});
  currentClient = over.client;
  await assert.rejects(() => reviewReport(REPORT_ID_1, "dismissed", "x".repeat(REVIEW_NOTE_MAX_LENGTH + 1)), /1000 characters or fewer/);
  assert.equal(over.rpcCalls.length, 0);

  const exact = rpcClient({ data: [reviewRow()] });
  currentClient = exact.client;
  await reviewReport(REPORT_ID_1, "dismissed", "x".repeat(REVIEW_NOTE_MAX_LENGTH));
  assert.equal(exact.rpcCalls.length, 1, "exactly the maximum length must be accepted, not rejected");
});

test("reviewReport: a valid confirmed result is returned exactly as camelCase fields", async () => {
  const { client } = rpcClient({ data: [reviewRow({ status: "dismissed", reviewed_at: "2026-02-02T00:00:00.000Z" })] });
  currentClient = client;
  const result = await reviewReport(REPORT_ID_1, "dismissed");
  assert.deepEqual(result, { reportId: REPORT_ID_1, status: "dismissed", reviewedAt: "2026-02-02T00:00:00.000Z" });
});

test("reviewReport: a malformed response (zero rows) is rejected rather than assumed successful", async () => {
  const { client } = rpcClient({ data: [] });
  currentClient = client;
  await assert.rejects(() => reviewReport(REPORT_ID_1, "resolved"), /could not be reviewed/);
});

test("reviewReport: a malformed response (more than one row) is rejected", async () => {
  const { client } = rpcClient({ data: [reviewRow(), reviewRow()] });
  currentClient = client;
  await assert.rejects(() => reviewReport(REPORT_ID_1, "resolved"), /could not be reviewed/);
});

test("reviewReport: an already-final/concurrent-finalization RPC rejection remains a safe error, never a silent success, preserving cause", async () => {
  const rawError = { message: "review_report: report is no longer pending", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => reviewReport(REPORT_ID_1, "resolved"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "review_report",
        message: SAFE_REVIEW_ERROR,
        cause: rawError,
        rawFragments: ["review_report", "no longer pending", "P0001"],
      })
  );
});

test("reviewReport: a conflict-of-interest RPC rejection normalizes to the identical safe message, never raw function/schema text", async () => {
  const rawError = { message: "review_report: cannot review a report you submitted", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => reviewReport(REPORT_ID_1, "resolved"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "review_report",
        message: SAFE_REVIEW_ERROR,
        cause: rawError,
        rawFragments: ["review_report", "you submitted", "P0001"],
      })
  );
});

test("reviewReport: never sends a note field when omitted, and never a reporter/target field of any kind", async () => {
  const { client, rpcCalls } = rpcClient({ data: [reviewRow()] });
  currentClient = client;
  await reviewReport(REPORT_ID_1, "resolved");
  for (const forbidden of ["reporter_id", "p_reporter_id", "reported_user_id", "p_reported_user_id", "target_kind", "p_target_kind"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});

// ==========================================================================
// moderateReportedMessage
// ==========================================================================

test("moderateReportedMessage: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "hide_message"), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("moderateReportedMessage: a genuine auth.getUser() failure throws SocialUnavailableError before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: [enforcementRow()], error: null };
    },
  };
  await assert.rejects(
    () => moderateReportedMessage(REPORT_ID_1, "hide_message"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("moderateReportedMessage: rejects a malformed report ID before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage("not-a-uuid", "hide_message"), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("moderateReportedMessage: rejects an invalid action before any RPC call — there is no third action beyond hide/restore", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "delete_message"), /hide or restore/);
  assert.equal(rpcCalls.length, 0);
});

test("moderateReportedMessage: calls moderate_reported_message with exactly the merged parameter names and no others — no moderator identity", async () => {
  const { client, rpcCalls } = rpcClient({ data: [enforcementRow()] });
  currentClient = client;
  await moderateReportedMessage(REPORT_ID_1, "hide_message");
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "moderate_reported_message");
  assert.deepEqual(rpcCalls[0].params, { p_report_id: REPORT_ID_1, p_action: "hide_message", p_note: null });
  assert.deepEqual(Object.keys(rpcCalls[0].params).sort(), ["p_action", "p_note", "p_report_id"]);
  for (const forbidden of ["moderator_id", "p_moderator_id", "acted_at", "p_acted_at"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});

test("moderateReportedMessage: restore_message is sent verbatim as the action", async () => {
  const { client, rpcCalls } = rpcClient({ data: [enforcementRow({ moderation_status: "visible" })] });
  currentClient = client;
  await moderateReportedMessage(REPORT_ID_1, "restore_message");
  assert.equal(rpcCalls[0].params.p_action, "restore_message");
});

test("moderateReportedMessage: trims a supplied note before sending", async () => {
  const { client, rpcCalls } = rpcClient({ data: [enforcementRow()] });
  currentClient = client;
  await moderateReportedMessage(REPORT_ID_1, "hide_message", "   confirmed harassment   ");
  assert.equal(rpcCalls[0].params.p_note, "confirmed harassment");
});

test("moderateReportedMessage: omitted note is sent as null, matching the RPC's own default-null contract", async () => {
  const { client, rpcCalls } = rpcClient({ data: [enforcementRow()] });
  currentClient = client;
  await moderateReportedMessage(REPORT_ID_1, "hide_message");
  assert.equal(rpcCalls[0].params.p_note, null);
});

test("moderateReportedMessage: rejects a supplied whitespace-only note before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "hide_message", "   \n\t  "), /whitespace-only/);
  assert.equal(rpcCalls.length, 0);
});

test("moderateReportedMessage: rejects a note over the merged maximum length before any RPC call, but allows exactly the maximum", async () => {
  const over = rpcClient({});
  currentClient = over.client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "hide_message", "x".repeat(REVIEW_NOTE_MAX_LENGTH + 1)), /1000 characters or fewer/);
  assert.equal(over.rpcCalls.length, 0);

  const exact = rpcClient({ data: [enforcementRow()] });
  currentClient = exact.client;
  await moderateReportedMessage(REPORT_ID_1, "hide_message", "x".repeat(REVIEW_NOTE_MAX_LENGTH));
  assert.equal(exact.rpcCalls.length, 1, "exactly the maximum length must be accepted, not rejected");
});

test("moderateReportedMessage: a valid confirmed result is returned exactly as camelCase fields", async () => {
  const { client } = rpcClient({
    data: [enforcementRow({ action_id: REPORT_ID_2, message_id: REPORT_ID_1, moderation_status: "visible", acted_at: "2026-02-02T00:00:00.000Z" })],
  });
  currentClient = client;
  const result = await moderateReportedMessage(REPORT_ID_1, "restore_message");
  assert.deepEqual(result, { actionId: REPORT_ID_2, messageId: REPORT_ID_1, moderationStatus: "visible", actedAt: "2026-02-02T00:00:00.000Z" });
});

test("moderateReportedMessage: a malformed response (zero rows) is rejected rather than assumed successful", async () => {
  const { client } = rpcClient({ data: [] });
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "hide_message"), /could not be completed/);
});

test("moderateReportedMessage: a malformed response (more than one row) is rejected", async () => {
  const { client } = rpcClient({ data: [enforcementRow(), enforcementRow()] });
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "hide_message"), /could not be completed/);
});

test("moderateReportedMessage: a malformed response (unrecognized moderation_status) is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: [enforcementRow({ moderation_status: "quarantined" })] });
  currentClient = client;
  await assert.rejects(() => moderateReportedMessage(REPORT_ID_1, "hide_message"), (err) => {
    assert.ok(err instanceof ModerationOperationError);
    assert.equal(err.message, SAFE_ENFORCEMENT_ERROR);
    return true;
  });
});

test("moderateReportedMessage: a report-must-be-resolved RPC rejection normalizes to the safe message, never raw function/schema text, preserving cause", async () => {
  const rawError = { message: "moderate_reported_message: report must be resolved before enforcement", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => moderateReportedMessage(REPORT_ID_1, "hide_message"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "moderate_message",
        message: SAFE_ENFORCEMENT_ERROR,
        cause: rawError,
        rawFragments: ["moderate_reported_message", "must be resolved", "P0001"],
      })
  );
});

test("moderateReportedMessage: a not-a-message-report RPC rejection normalizes to the identical safe message", async () => {
  const rawError = { message: "moderate_reported_message: report is not a message report", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => moderateReportedMessage(REPORT_ID_1, "hide_message"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "moderate_message",
        message: SAFE_ENFORCEMENT_ERROR,
        cause: rawError,
        rawFragments: ["moderate_reported_message", "not a message report", "P0001"],
      })
  );
});

test("moderateReportedMessage: a conflict-of-interest RPC rejection normalizes to the identical safe message, never raw function/schema text", async () => {
  const rawError = { message: "moderate_reported_message: cannot enforce a report you submitted", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => moderateReportedMessage(REPORT_ID_1, "hide_message"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "moderate_message",
        message: SAFE_ENFORCEMENT_ERROR,
        cause: rawError,
        rawFragments: ["moderate_reported_message", "you submitted", "P0001"],
      })
  );
});

test("moderateReportedMessage: a concurrent-enforcement (already in the expected state) RPC rejection remains a safe error, never a silent success, preserving cause", async () => {
  const rawError = { message: "moderate_reported_message: message is not currently visible", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => moderateReportedMessage(REPORT_ID_1, "hide_message"),
    (err) =>
      assertSafeModerationError(err, {
        operation: "moderate_message",
        message: SAFE_ENFORCEMENT_ERROR,
        cause: rawError,
        rawFragments: ["moderate_reported_message", "not currently visible", "P0001"],
      })
  );
});

test("moderateReportedMessage: never sends a moderator/target field of any kind", async () => {
  const { client, rpcCalls } = rpcClient({ data: [enforcementRow()] });
  currentClient = client;
  await moderateReportedMessage(REPORT_ID_1, "hide_message");
  for (const forbidden of ["moderator_id", "p_moderator_id", "reporter_id", "p_reporter_id", "message_id", "p_message_id"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});

// ==========================================================================
// listModerationActions (Phase 4 Slice L)
// ==========================================================================

test("listModerationActions: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => listModerationActions());
  assert.equal(rpcCalls.length, 0);
});

test("listModerationActions: a genuine auth.getUser() failure throws SocialUnavailableError before any RPC call, preserving cause", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: null, error: null };
    },
  };
  await assert.rejects(
    () => listModerationActions(),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("listModerationActions: calls list_moderation_actions with exactly the merged parameter names and no others", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await listModerationActions();
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "list_moderation_actions");
  assert.deepEqual(rpcCalls[0].params, { p_limit: 25, p_cursor_created_at: null, p_cursor_id: null, p_report_id: null });
  assert.deepEqual(
    Object.keys(rpcCalls[0].params).sort(),
    ["p_cursor_created_at", "p_cursor_id", "p_limit", "p_report_id"],
    "no moderator-identity parameter of any kind is ever sent"
  );
});

test("listModerationActions: an omitted limit defaults to 25, matching the RPC's own default", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await listModerationActions(null, undefined);
  assert.equal(rpcCalls[0].params.p_limit, 25);
});

test("listModerationActions: a limit is clamped client-side to [1, 50] before the call", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await listModerationActions(null, 0);
  assert.equal(rpcCalls[0].params.p_limit, 1);
  await listModerationActions(null, 999);
  assert.equal(rpcCalls[1].params.p_limit, 50);
});

test("listModerationActions: an optional reportId is validated and sent as p_report_id", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await listModerationActions(null, undefined, REPORT_ID_1);
  assert.equal(rpcCalls[0].params.p_report_id, REPORT_ID_1);
});

test("listModerationActions: rejects a malformed reportId before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => listModerationActions(null, undefined, "not-a-uuid"));
  assert.equal(rpcCalls.length, 0);
});

test("listModerationActions: a cursor missing its id is rejected before any RPC call", async () => {
  const { client, rpcCalls } = rpcClient({});
  currentClient = client;
  await assert.rejects(() => listModerationActions({ createdAt: "2026-01-01T00:00:00.000Z", id: "" }));
  assert.equal(rpcCalls.length, 0);
});

test("listModerationActions: a genuinely empty result is a real successful empty page, never an error", async () => {
  const { client } = rpcClient({ data: [] });
  currentClient = client;
  const page = await listModerationActions();
  assert.deepEqual(page, { items: [], nextCursor: null });
});

test("listModerationActions: a valid row is parsed exactly into camelCase fields", async () => {
  const { client } = rpcClient({ data: [actionHistoryRow()] });
  currentClient = client;
  const page = await listModerationActions();
  assert.deepEqual(page.items[0], {
    actionId: "c1000000-0000-0000-0000-000000000001",
    reportId: REPORT_ID_1,
    messageId: "d1000000-0000-0000-0000-000000000001",
    action: "hide_message",
    moderatorDisplayName: "Dave",
    reportCategory: "harassment",
    reportTargetKind: "message",
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
});

test("listModerationActions: a present note round-trips exactly", async () => {
  const { client } = rpcClient({ data: [actionHistoryRow({ note: "Reconsidered." })] });
  currentClient = client;
  const page = await listModerationActions();
  assert.equal(page.items[0].note, "Reconsidered.");
});

test("listModerationActions: hasMore/nextCursor are derived from the RPC's own has_more flag on the last row, never fabricated client-side", async () => {
  const { client } = rpcClient({
    data: [actionHistoryRow({ has_more: false }), actionHistoryRow({ action_id: "c1000000-0000-0000-0000-000000000002", created_at: "2026-01-02T00:00:00.000Z", has_more: true })],
  });
  currentClient = client;
  const page = await listModerationActions();
  assert.deepEqual(page.nextCursor, { createdAt: "2026-01-02T00:00:00.000Z", id: "c1000000-0000-0000-0000-000000000002" });
});

test("listModerationActions: no has_more on the last row means no next page", async () => {
  const { client } = rpcClient({ data: [actionHistoryRow({ has_more: false })] });
  currentClient = client;
  const page = await listModerationActions();
  assert.equal(page.nextCursor, null);
});

for (const [field, badValue] of [
  ["action_id", "not-a-uuid"],
  ["report_id", "not-a-uuid"],
  ["message_id", "not-a-uuid"],
  ["action", "some_other_action"],
  ["moderator_display_name", 123],
  ["report_category", 123],
  ["report_target_kind", "profile_post"],
  ["created_at", null],
]) {
  test(`listModerationActions: a malformed ${field} is rejected rather than trusted`, async () => {
    const { client } = rpcClient({ data: [actionHistoryRow({ [field]: badValue })] });
    currentClient = client;
    await assert.rejects(
      () => listModerationActions(),
      (err) => assertSafeModerationError(err, { operation: "fetch_action_history", message: SAFE_ACTION_HISTORY_ERROR, rawFragments: [] })
    );
  });
}

test("listModerationActions: note may be null but not any other non-string type", async () => {
  const { client } = rpcClient({ data: [actionHistoryRow({ note: 123 })] });
  currentClient = client;
  await assert.rejects(() => listModerationActions());
});

test("listModerationActions: an RPC failure normalizes to the safe message, never raw PostgREST/RLS/function text, preserving cause", async () => {
  const rawError = { message: "list_moderation_actions: active moderator access required", code: "P0001" };
  const { client } = rpcClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => listModerationActions(),
    (err) =>
      assertSafeModerationError(err, {
        operation: "fetch_action_history",
        message: SAFE_ACTION_HISTORY_ERROR,
        cause: rawError,
        rawFragments: ["list_moderation_actions", "active moderator", "P0001"],
      })
  );
});

test("listModerationActions: a non-array response is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: { not: "an array" } });
  currentClient = client;
  await assert.rejects(() => listModerationActions());
});

test("listModerationActions: never sends a moderator-identity field of any kind", async () => {
  const { client, rpcCalls } = rpcClient({ data: [] });
  currentClient = client;
  await listModerationActions();
  for (const forbidden of ["moderator_id", "p_moderator_id", "reporter_id", "p_reporter_id"]) {
    assert.ok(!(forbidden in rpcCalls[0].params), `must never send ${forbidden}`);
  }
});
