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

const { createOrGetDirectConversation, fetchMyConversations, fetchMessages, sendMessage } = await import(
  new URL("../src/social/services/messagingClient.ts", import.meta.url).href
);

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

test("createOrGetDirectConversation: propagates the RPC's own error message verbatim", async () => {
  currentClient = {
    auth: authUser(AUTH_USER_ID),
    rpc: async () => ({
      data: null,
      error: { message: "create_direct_conversation: cannot start a conversation with yourself" },
    }),
  };
  await assert.rejects(
    () => createOrGetDirectConversation(VALID_OTHER_ID),
    (err) => {
      assert.equal(err.message, "create_direct_conversation: cannot start a conversation with yourself");
      return true;
    }
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

test("fetchMyConversations: a Supabase query failure throws rather than becoming a fake empty list", async () => {
  const { client } = conversationsClient({ error: { message: "connection reset" } });
  currentClient = client;
  await assert.rejects(() => fetchMyConversations(), /could not be loaded/);
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

test("fetchMessages: a Supabase query failure throws rather than becoming a fake empty conversation", async () => {
  const { client } = messagesClient({ forceError: { message: "permission denied for table messages" } });
  currentClient = client;
  await assert.rejects(() => fetchMessages(VALID_CONVO_ID), /could not be loaded/);
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

test("sendMessage: an insert/RLS/block failure propagates as a thrown error, never a fabricated success", async () => {
  const { client } = insertClient({ error: { message: "new row violates row-level security policy for table messages" } });
  currentClient = client;
  await assert.rejects(() => sendMessage(VALID_CONVO_ID, "hi"), /could not be sent/);
});
