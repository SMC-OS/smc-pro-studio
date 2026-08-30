import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice B: unit coverage for src/social/services/messagingClient.ts
// against a fake Supabase client, following this repo's existing
// node:test --experimental-test-module-mocks convention (see
// tests/home-route-strictmode.test.mjs, which mocks socialClient.ts for a
// route test). Here the mock target is one layer lower — supabaseClient.ts
// itself — since these are service-layer unit tests, not route tests.
//
// messagingClient.ts and socialClient.ts both resolve
// "../../services/supabaseClient" to the same file (they live in the same
// directory), so mocking it here also covers socialClient.ts's import of
// it — harmless, since no socialClient.ts function is ever called in this
// file; only its real (unmocked) SocialUnavailableError class is used.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
    // Not exercised by any test here, but importable without crashing if
    // some other module transitively references it.
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const {
  createOrGetDirectConversation,
  fetchMyConversations,
  fetchMessages,
  sendMessage,
  fetchUnreadMessageCounts,
  markConversationRead,
  MessagingOperationError,
} = await import(new URL("../src/social/services/messagingClient.ts", import.meta.url).href);

// Phase 4 Slice C.1: every backend-failure branch below asserts three
// things together — (1) the exact safe message, unconditionally on cause,
// (2) that the original PostgrestError-shaped object survives as `cause`
// for logging, and (3) that none of the raw fixture's own internal-looking
// text (function name, RLS/policy wording, schema/table name) appears
// anywhere in the thrown error's own message. `assertSafeMessagingError` is
// the one shared assertion for all of that, so no test needs to duplicate
// the raw-text-absence check by hand.
function assertSafeMessagingError(err, { operation, message, cause, rawFragments }) {
  assert.ok(err instanceof MessagingOperationError, "must be a MessagingOperationError, not a bare Error");
  assert.equal(err.name, "MessagingOperationError");
  assert.equal(err.operation, operation);
  assert.equal(err.message, message, "the thrown error's own message must be exactly the safe, stable text — never derived from the backend error");
  if (cause !== undefined) assert.equal(err.cause, cause, "the original backend error must survive as `cause` for logging");
  for (const fragment of rawFragments) {
    assert.ok(!err.message.includes(fragment), `safe message must not contain raw backend fragment ${JSON.stringify(fragment)}`);
  }
  return true;
}

const VALID_OTHER_ID = "b0000000-0000-0000-0000-000000000002";
const VALID_CONVO_ID = "c0000000-0000-0000-0000-000000000001";
const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";

function authUser(userId) {
  return { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) };
}

// A genuine auth.getUser() failure (token verification/network problem) is
// distinct from "getUser() succeeded and there's simply no session" — see
// requireAuthenticatedClient in messagingClient.ts. This must surface as
// SocialUnavailableError with a generic session-verification message, never
// the action-specific "Sign in to …" text, since the caller may already be
// signed in and this isn't an auth-state problem at all.
function authUserError(err) {
  return { getUser: async () => ({ data: { user: null }, error: err }) };
}

const AUTH_VERIFICATION_ERROR = { message: "fetch failed" };

// ==========================================================================
// createOrGetDirectConversation
// ==========================================================================

test("createOrGetDirectConversation: fails before any RPC call when not authenticated", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUser(null),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: "should-not-be-reached", error: null };
    },
  };
  await assert.rejects(() => createOrGetDirectConversation(VALID_OTHER_ID), /Sign in/);
  assert.equal(rpcCalls.length, 0, "the RPC must never be invoked for an unauthenticated caller");
});

test("createOrGetDirectConversation: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any RPC call", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: "should-not-be-reached", error: null };
    },
  };
  await assert.rejects(
    () => createOrGetDirectConversation(VALID_OTHER_ID),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0, "the RPC must never be invoked when session verification itself fails");
});

test("createOrGetDirectConversation: rejects a malformed target user ID before any RPC call", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: "should-not-be-reached", error: null };
    },
  };
  await assert.rejects(() => createOrGetDirectConversation("not-a-uuid"), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("createOrGetDirectConversation: calls create_direct_conversation with the target id and returns its uuid", async () => {
  const rpcCalls = [];
  const expectedId = "c0000000-0000-0000-0000-00000000000f";
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: expectedId, error: null };
    },
  };
  const result = await createOrGetDirectConversation(VALID_OTHER_ID);
  assert.equal(result, expectedId);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "create_direct_conversation");
  assert.deepEqual(rpcCalls[0].params, { other_user_id: VALID_OTHER_ID });
});

// Phase 4 Slice C.1 regression: this is the confirmed QA issue — a blocked
// user starting a conversation used to see the RPC's raw exception text
// verbatim, including the internal function name. Every RPC failure now
// collapses to the same safe message regardless of cause, which is also
// what makes "blocked" indistinguishable from "any other reason" — the
// caller gets no signal either way, satisfying "do not infer or reveal
// whether another user blocked the caller".
test("createOrGetDirectConversation: a blocked-pair RPC error normalizes to the safe message, never the raw function-name/exception text, with the original error preserved as cause", async () => {
  const rawError = { message: "create_direct_conversation: this conversation is not available", code: "P0001" };
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async () => ({ data: null, error: rawError }),
  };
  await assert.rejects(
    () => createOrGetDirectConversation(VALID_OTHER_ID),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "create_conversation",
        message: "This conversation is unavailable. Please try again.",
        cause: rawError,
        rawFragments: ["create_direct_conversation", "not available", "P0001"],
      })
  );
});

// A second, differently-worded RPC failure (self-message, this time) must
// produce the exact same safe message as the blocked-pair case above —
// proving the two are genuinely indistinguishable to the caller, not just
// coincidentally similar-looking.
test("createOrGetDirectConversation: a self-message RPC error produces the identical safe message as a blocked-pair failure", async () => {
  const rawError = { message: "create_direct_conversation: cannot start a conversation with yourself", code: "P0001" };
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async () => ({ data: null, error: rawError }),
  };
  await assert.rejects(
    () => createOrGetDirectConversation(VALID_OTHER_ID),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "create_conversation",
        message: "This conversation is unavailable. Please try again.",
        cause: rawError,
        rawFragments: ["create_direct_conversation", "yourself"],
      })
  );
});

test("createOrGetDirectConversation: a malformed (non-string/empty) RPC success payload also produces the safe message", async () => {
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async () => ({ data: null, error: null }),
  };
  await assert.rejects(
    () => createOrGetDirectConversation(VALID_OTHER_ID),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "create_conversation",
        message: "This conversation is unavailable. Please try again.",
        rawFragments: ["create_direct_conversation"],
      })
  );
});

// ==========================================================================
// fetchMyConversations
// ==========================================================================

function conversationsClient({ userId = AUTH_USER_ID, result = [], error = null } = {}) {
  const calls = { order: [], limit: null };
  const builder = {
    select: () => builder,
    order: (...args) => {
      calls.order.push(args);
      return builder;
    },
    limit: (n) => {
      calls.limit = n;
      return builder;
    },
    then: (resolve, reject) =>
      Promise.resolve(error ? { data: null, error } : { data: result, error: null }).then(resolve, reject),
  };
  return {
    calls,
    client: {
      auth: authUser(userId),
      from: (table) => {
        assert.equal(table, "conversations");
        return builder;
      },
    },
  };
}

test("fetchMyConversations: fails before any query when not authenticated", async () => {
  currentClient = {
    auth: authUser(null),
    from: () => {
      throw new Error("from() must not be called for an unauthenticated caller");
    },
  };
  await assert.rejects(() => fetchMyConversations(), /Sign in/);
});

test("fetchMyConversations: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any query", async () => {
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    from: () => {
      throw new Error("from() must not be called when session verification itself fails");
    },
  };
  await assert.rejects(
    () => fetchMyConversations(),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
});

test("fetchMyConversations: an authenticated, successful, genuinely empty result returns an empty array, not an error", async () => {
  const { client, calls } = conversationsClient({ result: [] });
  currentClient = client;
  const rows = await fetchMyConversations();
  assert.deepEqual(rows, []);
  assert.equal(calls.limit, 20, "the [] must come from a real query that actually ran, not a short-circuit");
});

test("fetchMyConversations: a Supabase query failure throws the safe message rather than becoming a fake empty list, preserving the original error as cause", async () => {
  const rawError = { message: "permission denied for table conversations", code: "42501" };
  const { client } = conversationsClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => fetchMyConversations(),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "list_conversations",
        message: "Your conversations could not be loaded. Please try again.",
        cause: rawError,
        rawFragments: ["permission denied", "42501"],
      })
  );
});

test("fetchMyConversations: limit is bounded to [1, 50] regardless of caller input", async () => {
  let probe = conversationsClient({ result: [] });
  currentClient = probe.client;
  await fetchMyConversations(9999);
  assert.equal(probe.calls.limit, 50, "an oversized limit must clamp to the maximum");

  probe = conversationsClient({ result: [] });
  currentClient = probe.client;
  await fetchMyConversations(-5);
  assert.equal(probe.calls.limit, 1, "a non-positive limit must clamp to the minimum");

  probe = conversationsClient({ result: [] });
  currentClient = probe.client;
  await fetchMyConversations();
  assert.equal(probe.calls.limit, 20, "an omitted limit must use the documented default");
});

// ==========================================================================
// fetchMessages — including the keyset pagination contract.
//
// The fake `messages` table below actually applies the recorded
// eq()/or()/limit() filters against an in-memory fixture (mirroring real
// Postgres semantics for this exact query shape) rather than returning a
// canned page, so the pagination assertions below are proving the real
// cursor-construction logic in messagingClient.ts, not just a mocked
// return value.
// ==========================================================================

function messagesClient({ fixtureRows = [], forceError = null } = {}) {
  const fromCalls = [];
  return {
    fromCalls,
    client: {
      auth: authUser(AUTH_USER_ID),
      from: (table) => {
        fromCalls.push(table);
        assert.equal(table, "messages");
        const state = { eqField: null, eqValue: null, orString: null, limitN: null };
        const builder = {
          select: () => builder,
          eq: (field, value) => {
            state.eqField = field;
            state.eqValue = value;
            return builder;
          },
          order: () => builder,
          limit: (n) => {
            state.limitN = n;
            return builder;
          },
          or: (s) => {
            state.orString = s;
            return builder;
          },
          then: (resolve, reject) => {
            if (forceError) return Promise.resolve({ data: null, error: forceError }).then(resolve, reject);
            let rows = fixtureRows.filter((r) => r[state.eqField] === state.eqValue);
            if (state.orString) {
              const tsMatch = state.orString.match(/created_at\.lt\.("(.*?)")/);
              const idMatch = state.orString.match(/id\.lt\.([0-9a-zA-Z-]+)\)/);
              const cursorTs = JSON.parse(tsMatch[1]);
              const cursorId = idMatch[1];
              rows = rows.filter((r) => r.created_at < cursorTs || (r.created_at === cursorTs && r.id < cursorId));
            }
            rows = rows
              .slice()
              .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id < b.id ? 1 : -1));
            const sliced = rows.slice(0, state.limitN ?? rows.length);
            return Promise.resolve({ data: sliced, error: null }).then(resolve, reject);
          },
        };
        return builder;
      },
    },
  };
}

const CONVO_1 = "c0000000-0000-0000-0000-000000000001";
const CONVO_2 = "c0000000-0000-0000-0000-000000000002";

function msg(id, conversationId, isoTime) {
  return { id, conversation_id: conversationId, sender_id: AUTH_USER_ID, body: `body-${id}`, created_at: isoTime };
}

// Interleaved across two conversations so the conversation_id filter is a
// real discriminator, not incidentally correct because of sort order.
const PAGINATION_FIXTURE = [
  msg("m0000000-0000-0000-0000-000000000001", CONVO_1, "2026-01-01T00:00:01.000Z"),
  msg("m0000000-0000-0000-0000-000000000002", CONVO_2, "2026-01-01T00:00:02.000Z"),
  msg("m0000000-0000-0000-0000-000000000003", CONVO_1, "2026-01-01T00:00:03.000Z"),
  msg("m0000000-0000-0000-0000-000000000004", CONVO_1, "2026-01-01T00:00:04.000Z"),
  msg("m0000000-0000-0000-0000-000000000005", CONVO_2, "2026-01-01T00:00:05.000Z"),
  msg("m0000000-0000-0000-0000-000000000006", CONVO_1, "2026-01-01T00:00:06.000Z"),
  msg("m0000000-0000-0000-0000-000000000007", CONVO_1, "2026-01-01T00:00:07.000Z"),
  msg("m0000000-0000-0000-0000-000000000008", CONVO_2, "2026-01-01T00:00:08.000Z"),
];

test("fetchMessages: rejects a malformed conversation ID before any query", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), from: () => { throw new Error("from() must not be called"); } };
  await assert.rejects(() => fetchMessages("not-a-uuid"), /valid ID/);
});

test("fetchMessages: fails before any query when not authenticated", async () => {
  currentClient = {
    auth: authUser(null),
    from: () => {
      throw new Error("from() must not be called for an unauthenticated caller");
    },
  };
  await assert.rejects(() => fetchMessages(VALID_CONVO_ID), /Sign in/);
});

test("fetchMessages: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any query", async () => {
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    from: () => {
      throw new Error("from() must not be called when session verification itself fails");
    },
  };
  await assert.rejects(
    () => fetchMessages(VALID_CONVO_ID),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
});

test("fetchMessages: an authenticated, successful, genuinely empty conversation returns an empty page, not an error", async () => {
  const { client, fromCalls } = messagesClient({ fixtureRows: [] });
  currentClient = client;
  const page = await fetchMessages(VALID_CONVO_ID);
  assert.deepEqual(page, { messages: [], nextCursor: null });
  assert.equal(fromCalls.length, 1, "the empty page must come from a real query that actually ran, not a short-circuit");
});

test("fetchMessages: a Supabase query failure throws the safe message rather than becoming a fake empty conversation, preserving the original error as cause", async () => {
  const rawError = { message: "permission denied for table messages", code: "42501" };
  const { client } = messagesClient({ forceError: rawError });
  currentClient = client;
  await assert.rejects(
    () => fetchMessages(VALID_CONVO_ID),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "fetch_messages",
        message: "This conversation could not be loaded. Please try again.",
        cause: rawError,
        rawFragments: ["permission denied", "for table messages", "42501"],
      })
  );
});

test("fetchMessages: page size is bounded to [1, 50] regardless of caller input", async () => {
  let probe;
  let capturedLimit;
  function trackingMessagesClient() {
    const { client } = messagesClient({ fixtureRows: [] });
    const originalFrom = client.from;
    client.from = (table) => {
      const builder = originalFrom(table);
      const originalLimit = builder.limit;
      builder.limit = (n) => {
        capturedLimit = n;
        return originalLimit(n);
      };
      return builder;
    };
    return client;
  }

  currentClient = trackingMessagesClient();
  await fetchMessages(VALID_CONVO_ID, null, 9999);
  assert.equal(capturedLimit, 51, "an oversized page size must clamp to the maximum (50) plus the one-row overfetch");

  currentClient = trackingMessagesClient();
  await fetchMessages(VALID_CONVO_ID, null, -5);
  assert.equal(capturedLimit, 2, "a non-positive page size must clamp to the minimum (1) plus the one-row overfetch");

  currentClient = trackingMessagesClient();
  await fetchMessages(VALID_CONVO_ID);
  assert.equal(capturedLimit, 31, "an omitted page size must use the documented default (30) plus the one-row overfetch");
});

test("fetchMessages: keyset pagination never mixes conversations, repeats, or skips records", async () => {
  const { client } = messagesClient({ fixtureRows: PAGINATION_FIXTURE });
  currentClient = client;

  const page1 = await fetchMessages(CONVO_1, null, 2);
  assert.deepEqual(
    page1.messages.map((m) => m.id),
    ["m0000000-0000-0000-0000-000000000007", "m0000000-0000-0000-0000-000000000006"]
  );
  assert.ok(page1.nextCursor);

  currentClient = client;
  const page2 = await fetchMessages(CONVO_1, page1.nextCursor, 2);
  assert.deepEqual(
    page2.messages.map((m) => m.id),
    ["m0000000-0000-0000-0000-000000000004", "m0000000-0000-0000-0000-000000000003"]
  );
  assert.ok(page2.nextCursor);

  currentClient = client;
  const page3 = await fetchMessages(CONVO_1, page2.nextCursor, 2);
  assert.deepEqual(page3.messages.map((m) => m.id), ["m0000000-0000-0000-0000-000000000001"]);
  assert.equal(page3.nextCursor, null, "the final page must report no further cursor");

  const seenIds = [...page1.messages, ...page2.messages, ...page3.messages].map((m) => m.id);
  const expectedConvo1Ids = PAGINATION_FIXTURE.filter((m) => m.conversation_id === CONVO_1)
    .map((m) => m.id)
    .sort();
  assert.deepEqual(
    seenIds.slice().sort(),
    expectedConvo1Ids,
    "the union of all pages must equal exactly conversation 1's messages — no duplicate, no gap, no message from conversation 2"
  );
  assert.equal(new Set(seenIds).size, seenIds.length, "no message id may appear on more than one page");
});

// ==========================================================================
// sendMessage
// ==========================================================================

function insertClient({ userId = AUTH_USER_ID, result = null, error = null } = {}) {
  const insertCalls = [];
  return {
    insertCalls,
    client: {
      auth: authUser(userId),
      from: (table) => {
        assert.equal(table, "messages");
        return {
          insert: (payload) => {
            insertCalls.push(payload);
            return {
              select: () => ({
                single: async () => (error ? { data: null, error } : { data: result, error: null }),
              }),
            };
          },
        };
      },
    },
  };
}

test("sendMessage: fails before any insert when not authenticated", async () => {
  const { client, insertCalls } = insertClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => sendMessage(VALID_CONVO_ID, "hello"), /Sign in/);
  assert.equal(insertCalls.length, 0);
});

test("sendMessage: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any insert", async () => {
  const insertCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    from: (table) => {
      assert.equal(table, "messages");
      return {
        insert: (payload) => {
          insertCalls.push(payload);
          return { select: () => ({ single: async () => ({ data: null, error: null }) }) };
        },
      };
    },
  };
  await assert.rejects(
    () => sendMessage(VALID_CONVO_ID, "hello"),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(insertCalls.length, 0, "the insert must never run when session verification itself fails");
});

test("sendMessage: rejects a malformed conversation ID before any insert", async () => {
  const { client, insertCalls } = insertClient();
  currentClient = client;
  await assert.rejects(() => sendMessage("not-a-uuid", "hello"), /valid ID/);
  assert.equal(insertCalls.length, 0);
});

test("sendMessage: trims the body before inserting", async () => {
  const { client, insertCalls } = insertClient({
    result: { id: "x", conversation_id: VALID_CONVO_ID, sender_id: AUTH_USER_ID, body: "hello", created_at: "t" },
  });
  currentClient = client;
  await sendMessage(VALID_CONVO_ID, "   hello   ");
  assert.equal(insertCalls[0].body, "hello");
});

test("sendMessage: rejects an empty or whitespace-only body before any insert", async () => {
  const empty = insertClient();
  currentClient = empty.client;
  await assert.rejects(() => sendMessage(VALID_CONVO_ID, ""), /Write something/);
  assert.equal(empty.insertCalls.length, 0);

  const whitespace = insertClient();
  currentClient = whitespace.client;
  await assert.rejects(() => sendMessage(VALID_CONVO_ID, "   \n\t  "), /Write something/);
  assert.equal(whitespace.insertCalls.length, 0);
});

test("sendMessage: rejects a body over 2000 characters before any insert, but allows exactly 2000", async () => {
  const over = insertClient();
  currentClient = over.client;
  await assert.rejects(() => sendMessage(VALID_CONVO_ID, "x".repeat(2001)), /2000 characters or fewer/);
  assert.equal(over.insertCalls.length, 0);

  const exact = insertClient({
    result: { id: "x", conversation_id: VALID_CONVO_ID, sender_id: AUTH_USER_ID, body: "x".repeat(2000), created_at: "t" },
  });
  currentClient = exact.client;
  await sendMessage(VALID_CONVO_ID, "x".repeat(2000));
  assert.equal(exact.insertCalls.length, 1, "exactly 2000 characters must be accepted, not rejected");
});

test("sendMessage: sender_id always comes from the authenticated session, never a caller-supplied value", async () => {
  const { client, insertCalls } = insertClient({
    userId: AUTH_USER_ID,
    result: { id: "x", conversation_id: VALID_CONVO_ID, sender_id: AUTH_USER_ID, body: "hi", created_at: "t" },
  });
  currentClient = client;
  // sendMessage's signature has no sender parameter at all — this proves
  // the inserted row's sender_id matches the authenticated session's id.
  await sendMessage(VALID_CONVO_ID, "hi");
  assert.equal(insertCalls[0].sender_id, AUTH_USER_ID);
});

test("sendMessage: a successful insert returns exactly the server-confirmed row", async () => {
  const serverRow = {
    id: "s0000000-0000-0000-0000-000000000001",
    conversation_id: VALID_CONVO_ID,
    sender_id: AUTH_USER_ID,
    body: "hi",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const { client } = insertClient({ result: serverRow });
  currentClient = client;
  const returned = await sendMessage(VALID_CONVO_ID, "hi");
  assert.deepEqual(returned, serverRow);
});

test("sendMessage: an insert/RLS/block failure normalizes to the safe message, never a fabricated success and never the raw RLS/policy text, preserving the original error as cause", async () => {
  const rawError = {
    message: "new row violates row-level security policy for table \"messages\"",
    code: "42501",
    details: "Failing row contains policy messages_member_insert.",
  };
  const { client } = insertClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => sendMessage(VALID_CONVO_ID, "hi"),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "send_message",
        message: "This message could not be sent. Please try again.",
        cause: rawError,
        rawFragments: ["row-level security", "messages_member_insert", "42501"],
      })
  );
});

// Confirms a block specifically (not just any RLS violation) also
// collapses to the identical safe message — the caller gets no signal
// distinguishing "the other party blocked you" from "any other send
// failure", matching createOrGetDirectConversation's equivalent guarantee.
test("sendMessage: a block-caused RLS rejection produces the identical safe message as any other insert failure", async () => {
  const rawError = { message: "new row violates row-level security policy for table \"messages\"", code: "42501" };
  const { client } = insertClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => sendMessage(VALID_CONVO_ID, "hi"),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "send_message",
        message: "This message could not be sent. Please try again.",
        cause: rawError,
        rawFragments: ["row-level security"],
      })
  );
});

// ==========================================================================
// Phase 4 Slice F: fetchUnreadMessageCounts
// ==========================================================================

function unreadCountsClient({ userId = AUTH_USER_ID, data = [], error = null } = {}) {
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

test("fetchUnreadMessageCounts: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = unreadCountsClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => fetchUnreadMessageCounts(), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("fetchUnreadMessageCounts: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any RPC call", async () => {
  const { client, rpcCalls } = unreadCountsClient({});
  client.auth = authUserError(AUTH_VERIFICATION_ERROR);
  currentClient = client;
  await assert.rejects(
    () => fetchUnreadMessageCounts(),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("fetchUnreadMessageCounts: calls get_unread_message_counts with no arguments at all", async () => {
  const { client, rpcCalls } = unreadCountsClient({ data: [] });
  currentClient = client;
  await fetchUnreadMessageCounts();
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "get_unread_message_counts");
  assert.equal(rpcCalls[0].params, undefined, "no arguments — not even an empty object — are ever fabricated for this zero-parameter RPC");
});

test("fetchUnreadMessageCounts: a genuine zero-row success returns a genuinely empty map, not an error and not a fabricated entry", async () => {
  const { client } = unreadCountsClient({ data: [] });
  currentClient = client;
  const result = await fetchUnreadMessageCounts();
  assert.ok(result instanceof Map);
  assert.equal(result.size, 0);
});

test("fetchUnreadMessageCounts: parses valid rows into a deterministic conversation-id-keyed map", async () => {
  const { client } = unreadCountsClient({
    data: [
      { conversation_id: CONVO_1, unread_count: 3 },
      { conversation_id: CONVO_2, unread_count: 0 },
    ],
  });
  currentClient = client;
  const result = await fetchUnreadMessageCounts();
  assert.equal(result.size, 2);
  assert.equal(result.get(CONVO_1), 3);
  assert.equal(result.get(CONVO_2), 0);
});

test("fetchUnreadMessageCounts: accepts a numeric-string bigint representation of unread_count", async () => {
  const { client } = unreadCountsClient({ data: [{ conversation_id: CONVO_1, unread_count: "42" }] });
  currentClient = client;
  const result = await fetchUnreadMessageCounts();
  assert.equal(result.get(CONVO_1), 42);
});

test("fetchUnreadMessageCounts: rejects a malformed conversation id in a row rather than dropping or coercing it", async () => {
  const { client } = unreadCountsClient({ data: [{ conversation_id: "not-a-uuid", unread_count: 1 }] });
  currentClient = client;
  await assert.rejects(
    () => fetchUnreadMessageCounts(),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "fetch_unread_counts",
        message: "Your unread counts could not be loaded. Please try again.",
        rawFragments: ["not-a-uuid"],
      })
  );
});

test("fetchUnreadMessageCounts: rejects a negative unread_count", async () => {
  const { client } = unreadCountsClient({ data: [{ conversation_id: CONVO_1, unread_count: -1 }] });
  currentClient = client;
  await assert.rejects(() => fetchUnreadMessageCounts(), /Your unread counts could not be loaded/);
});

test("fetchUnreadMessageCounts: rejects a fractional unread_count", async () => {
  const { client } = unreadCountsClient({ data: [{ conversation_id: CONVO_1, unread_count: 1.5 }] });
  currentClient = client;
  await assert.rejects(() => fetchUnreadMessageCounts(), /Your unread counts could not be loaded/);
});

test("fetchUnreadMessageCounts: rejects an unsafe unread_count (beyond Number.MAX_SAFE_INTEGER) rather than silently coercing it", async () => {
  const { client } = unreadCountsClient({ data: [{ conversation_id: CONVO_1, unread_count: Number.MAX_SAFE_INTEGER + 1 }] });
  currentClient = client;
  await assert.rejects(() => fetchUnreadMessageCounts(), /Your unread counts could not be loaded/);
});

test("fetchUnreadMessageCounts: rejects a malformed (non-numeric) string unread_count", async () => {
  const { client } = unreadCountsClient({ data: [{ conversation_id: CONVO_1, unread_count: "12abc" }] });
  currentClient = client;
  await assert.rejects(() => fetchUnreadMessageCounts(), /Your unread counts could not be loaded/);
});

test("fetchUnreadMessageCounts: rejects a duplicate conversation id anywhere in the result, never silently overwriting one with the other", async () => {
  const { client } = unreadCountsClient({
    data: [
      { conversation_id: CONVO_1, unread_count: 1 },
      { conversation_id: CONVO_1, unread_count: 5 },
    ],
  });
  currentClient = client;
  await assert.rejects(() => fetchUnreadMessageCounts(), /Your unread counts could not be loaded/);
});

test("fetchUnreadMessageCounts: an RPC failure throws the safe message, preserving the original error as cause, never becoming a fake empty/zero result", async () => {
  const rawError = { message: "permission denied for function get_unread_message_counts", code: "42501" };
  const { client } = unreadCountsClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => fetchUnreadMessageCounts(),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "fetch_unread_counts",
        message: "Your unread counts could not be loaded. Please try again.",
        cause: rawError,
        rawFragments: ["permission denied", "42501"],
      })
  );
});

// ==========================================================================
// Phase 4 Slice F: markConversationRead
// ==========================================================================

const VALID_MESSAGE_ID = "e1000000-0000-0000-0000-000000000001";
const OTHER_MESSAGE_ID = "e1000000-0000-0000-0000-000000000099";
const OTHER_CONVO_ID = "c0000000-0000-0000-0000-000000000099";
const OTHER_USER_ID_2 = "b0000000-0000-0000-0000-000000000002";

function validCursorRow(overrides = {}) {
  return {
    conversation_id: VALID_CONVO_ID,
    user_id: AUTH_USER_ID,
    last_read_message_id: VALID_MESSAGE_ID,
    last_read_message_created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:01.000Z",
    ...overrides,
  };
}

function markReadClient({ userId = AUTH_USER_ID, data, error = null } = {}) {
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

test("markConversationRead: rejects a malformed conversation ID before authentication or any RPC call", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: [validCursorRow()], error: null };
    },
  };
  await assert.rejects(() => markConversationRead("not-a-uuid", VALID_MESSAGE_ID), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("markConversationRead: rejects a malformed message ID before authentication or any RPC call", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: [validCursorRow()], error: null };
    },
  };
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, "not-a-uuid"), /valid ID/);
  assert.equal(rpcCalls.length, 0);
});

test("markConversationRead: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = markReadClient({ userId: null, data: [validCursorRow()] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("markConversationRead: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message, before any RPC call", async () => {
  const rpcCalls = [];
  currentClient = {
    auth: authUserError(AUTH_VERIFICATION_ERROR),
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: [validCursorRow()], error: null };
    },
  };
  await assert.rejects(
    () => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
      return true;
    }
  );
  assert.equal(rpcCalls.length, 0);
});

test("markConversationRead: calls mark_conversation_read with the exact merged parameter names and no others — no caller-suppliable user id", async () => {
  const { client, rpcCalls } = markReadClient({ data: [validCursorRow()] });
  currentClient = client;
  await markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "mark_conversation_read");
  assert.deepEqual(rpcCalls[0].params, { p_conversation_id: VALID_CONVO_ID, p_message_id: VALID_MESSAGE_ID });
  assert.deepEqual(
    Object.keys(rpcCalls[0].params).sort(),
    ["p_conversation_id", "p_message_id"],
    "no user-id parameter (or any other) is ever sent — the RPC binds to the session internally"
  );
});

test("markConversationRead: a successful call returns exactly the server-confirmed cursor", async () => {
  const row = validCursorRow();
  const { client } = markReadClient({ data: [row] });
  currentClient = client;
  const result = await markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID);
  assert.deepEqual(result, {
    conversationId: row.conversation_id,
    userId: row.user_id,
    lastReadMessageId: row.last_read_message_id,
    lastReadMessageCreatedAt: row.last_read_message_created_at,
    updatedAt: row.updated_at,
  });
});

test("markConversationRead: zero returned rows is a malformed response, never an assumed success", async () => {
  const { client } = markReadClient({ data: [] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Your read status could not be updated/);
});

test("markConversationRead: more than one returned row is a malformed response", async () => {
  const { client } = markReadClient({ data: [validCursorRow(), validCursorRow()] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Your read status could not be updated/);
});

test("markConversationRead: a row with a malformed/missing cursor field is rejected", async () => {
  const { client } = markReadClient({ data: [validCursorRow({ last_read_message_created_at: null })] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Your read status could not be updated/);
});

test("markConversationRead: a returned conversation_id that doesn't match the request is rejected, never trusted", async () => {
  const { client } = markReadClient({ data: [validCursorRow({ conversation_id: OTHER_CONVO_ID })] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Your read status could not be updated/);
});

test("markConversationRead: a returned last_read_message_id that doesn't match the requested message id is rejected", async () => {
  const { client } = markReadClient({ data: [validCursorRow({ last_read_message_id: OTHER_MESSAGE_ID })] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Your read status could not be updated/);
});

test("markConversationRead: a returned user_id that doesn't match the authenticated caller is rejected — never another user's row", async () => {
  const { client } = markReadClient({ data: [validCursorRow({ user_id: OTHER_USER_ID_2 })] });
  currentClient = client;
  await assert.rejects(() => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID), /Your read status could not be updated/);
});

test("markConversationRead: an RPC failure (membership/RLS/network) throws the safe message, preserving the original error as cause, with no optimistic success", async () => {
  const rawError = { message: "mark_conversation_read: not a member of this conversation", code: "P0001" };
  const { client } = markReadClient({ error: rawError });
  currentClient = client;
  await assert.rejects(
    () => markConversationRead(VALID_CONVO_ID, VALID_MESSAGE_ID),
    (err) =>
      assertSafeMessagingError(err, {
        operation: "mark_read",
        message: "Your read status could not be updated. Please try again.",
        cause: rawError,
        rawFragments: ["mark_conversation_read", "not a member", "P0001"],
      })
  );
});
