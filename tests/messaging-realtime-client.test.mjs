import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 4 Slice D: unit coverage for messagingClient.ts's typed Realtime
// subscription boundary (subscribeToConversationMessages), against a fake
// Supabase client exposing auth/channel/removeChannel — same
// node:test --experimental-test-module-mocks convention as
// messaging-client.test.mjs (which this file otherwise mirrors: same mock
// target, same "mock one layer below the function under test" approach).

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const { subscribeToConversationMessages } = await import(new URL("../src/social/services/messagingClient.ts", import.meta.url).href);

const VALID_CONVO_ID = "c0000000-0000-0000-0000-000000000001";
const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";

function authUser(userId) {
  return { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) };
}

function authUserError(err) {
  return { getUser: async () => ({ data: { user: null }, error: err }) };
}

/** A fake RealtimeChannel: records every .on() registration and lets the test drive .subscribe()'s status callback and fire an INSERT notification. */
function fakeChannel(topic) {
  const onCalls = [];
  let statusCallback = null;
  const channel = {
    topic,
    on: (type, filter, cb) => {
      onCalls.push({ type, filter, cb });
      return channel;
    },
    subscribe: (cb) => {
      statusCallback = cb;
      return channel;
    },
    emitStatus(status, err) {
      statusCallback?.(status, err);
    },
    emitInsert(payload) {
      for (const { cb } of onCalls) cb(payload);
    },
    onCalls,
  };
  return channel;
}

function realtimeClient({ userId = AUTH_USER_ID } = {}) {
  const channels = [];
  const removeChannelCalls = [];
  const client = {
    auth: authUser(userId),
    channel: (topic) => {
      const ch = fakeChannel(topic);
      channels.push(ch);
      return ch;
    },
    removeChannel: async (ch) => {
      removeChannelCalls.push(ch);
      return "ok";
    },
  };
  return { client, channels, removeChannelCalls };
}

function trackedHandlers() {
  const signalCalls = [];
  const stateCalls = [];
  return {
    handlers: {
      onSignal: (...args) => signalCalls.push(args),
      onConnectionStateChange: (state) => stateCalls.push(state),
    },
    signalCalls,
    stateCalls,
  };
}

// ==========================================================================
// No channel is ever created for guest / failed-auth / malformed-id callers.
// ==========================================================================

test("subscribeToConversationMessages: fails before any channel is created when not authenticated", async () => {
  const channelCalls = [];
  currentClient = {
    auth: authUser(null),
    channel: (topic) => {
      channelCalls.push(topic);
      throw new Error("channel() must not be called for an unauthenticated caller");
    },
  };
  const { handlers } = trackedHandlers();
  await assert.rejects(() => subscribeToConversationMessages(VALID_CONVO_ID, handlers), /Sign in/);
  assert.equal(channelCalls.length, 0);
});

test("subscribeToConversationMessages: a genuine auth.getUser() failure throws SocialUnavailableError before any channel is created", async () => {
  const channelCalls = [];
  const rawError = { message: "fetch failed" };
  currentClient = {
    auth: authUserError(rawError),
    channel: (topic) => {
      channelCalls.push(topic);
      throw new Error("channel() must not be called when session verification itself fails");
    },
  };
  const { handlers } = trackedHandlers();
  await assert.rejects(
    () => subscribeToConversationMessages(VALID_CONVO_ID, handlers),
    (err) => {
      assert.equal(err.name, "SocialUnavailableError");
      assert.doesNotMatch(err.message, /Sign in/);
      assert.equal(err.cause, rawError);
      return true;
    }
  );
  assert.equal(channelCalls.length, 0);
});

test("subscribeToConversationMessages: rejects a malformed conversation ID before any auth check or channel creation", async () => {
  const getUserCalls = [];
  currentClient = {
    auth: { getUser: async () => { getUserCalls.push(1); return { data: { user: null }, error: null }; } },
    channel: () => {
      throw new Error("channel() must not be called for a malformed conversation ID");
    },
  };
  const { handlers } = trackedHandlers();
  await assert.rejects(() => subscribeToConversationMessages("not-a-uuid", handlers), /valid ID/);
  assert.equal(getUserCalls.length, 0, "auth must never even be checked for a malformed ID");
});

// ==========================================================================
// Channel shape: exactly public.messages, INSERT only, an exact server-side
// conversation_id filter — never a broad subscription filtered in JS.
// ==========================================================================

test("subscribeToConversationMessages: subscribes to exactly one channel filtered to INSERT on public.messages for this conversation", async () => {
  const { client, channels } = realtimeClient();
  currentClient = client;
  const { handlers } = trackedHandlers();

  await subscribeToConversationMessages(VALID_CONVO_ID, handlers);

  assert.equal(channels.length, 1, "exactly one channel must be created");
  const [channel] = channels;
  assert.equal(channel.onCalls.length, 1, "exactly one .on() listener must be registered");
  const [{ type, filter }] = channel.onCalls;
  assert.equal(type, "postgres_changes");
  assert.equal(filter.event, "INSERT", "must subscribe to INSERT only — never '*', UPDATE, or DELETE");
  assert.equal(filter.schema, "public");
  assert.equal(filter.table, "messages");
  assert.equal(
    filter.filter,
    `conversation_id=eq.${VALID_CONVO_ID}`,
    "must use an exact server-side conversation_id filter, not a broad subscription filtered client-side"
  );
});

// ==========================================================================
// Connection state mapping and the SUBSCRIBED catch-up signal.
// ==========================================================================

test("subscribeToConversationMessages: reports 'connecting' before the channel has reached SUBSCRIBED, with no catch-up signal yet", async () => {
  const { client } = realtimeClient();
  currentClient = client;
  const { handlers, signalCalls, stateCalls } = trackedHandlers();

  await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
  assert.deepEqual(stateCalls, ["connecting"]);
  assert.equal(signalCalls.length, 0, "no catch-up signal before the channel actually reaches SUBSCRIBED");
});

test("subscribeToConversationMessages: SUBSCRIBED triggers exactly one catch-up signal and reports 'connected'", async () => {
  const { client, channels } = realtimeClient();
  currentClient = client;
  const { handlers, signalCalls, stateCalls } = trackedHandlers();

  await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
  channels[0].emitStatus("SUBSCRIBED");

  assert.deepEqual(stateCalls, ["connecting", "connected"]);
  assert.equal(signalCalls.length, 1, "SUBSCRIBED must trigger exactly one catch-up signal");
});

// ==========================================================================
// Recovery on the SAME channel: supabase-js's RealtimeChannel keeps the
// callback passed to .subscribe() alive for the channel's lifetime and
// invokes it again on every subsequent join/error/close the underlying
// channel adapter's own rejoin logic produces (verified against
// node_modules/@supabase/realtime-js's RealtimeChannel.subscribe(), whose
// _onError/_onClose hooks and postgres_changes join-ack both close over the
// same original `callback` rather than a one-shot reference). This fake
// channel's emitStatus() re-invokes that same stored callback, exactly
// mirroring a real rejoin — no second subscribeToConversationMessages call,
// no new channel, is ever involved in recovery; the existing channel simply
// reports SUBSCRIBED again.
// ==========================================================================

test("subscribeToConversationMessages: a later SUBSCRIBED on the same channel after an outage maps to connected again, emits another catch-up signal, and creates no additional channel", async () => {
  const { client, channels, removeChannelCalls } = realtimeClient();
  currentClient = client;
  const { handlers, signalCalls, stateCalls } = trackedHandlers();

  const cleanup = await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
  channels[0].emitStatus("SUBSCRIBED");
  channels[0].emitStatus("CHANNEL_ERROR", new Error("socket closed"));
  channels[0].emitStatus("SUBSCRIBED");

  assert.deepEqual(
    stateCalls,
    ["connecting", "connected", "unavailable", "connected"],
    "the same channel reporting SUBSCRIBED a second time must map to 'connected' again, exactly like the first time"
  );
  assert.equal(signalCalls.length, 2, "each SUBSCRIBED transition — first and later — must emit its own catch-up signal");
  assert.equal(channels.length, 1, "recovery must never create a second channel — the existing one simply reports SUBSCRIBED again");

  cleanup();
  cleanup();
  assert.equal(removeChannelCalls.length, 1, "the single original cleanup must still remove exactly one channel, no matter how many SUBSCRIBED/error cycles preceded it");
  assert.equal(removeChannelCalls[0], channels[0]);
});

test("subscribeToConversationMessages: repeated SUBSCRIBED/CHANNEL_ERROR cycles on one channel still leave exactly one idempotent cleanup that removes exactly that channel", async () => {
  const { client, channels, removeChannelCalls } = realtimeClient();
  currentClient = client;
  const { handlers, signalCalls } = trackedHandlers();

  const cleanup = await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
  channels[0].emitStatus("SUBSCRIBED");
  channels[0].emitStatus("TIMED_OUT");
  channels[0].emitStatus("SUBSCRIBED");
  channels[0].emitStatus("CLOSED");
  channels[0].emitStatus("SUBSCRIBED");

  assert.equal(signalCalls.length, 3, "a catch-up signal must fire on every SUBSCRIBED transition, not just the first");
  assert.equal(channels.length, 1, "no cycle of outage/recovery may ever create a second channel");

  cleanup();
  cleanup();
  cleanup();
  assert.equal(removeChannelCalls.length, 1, "removeChannel must still be called exactly once, regardless of how many SUBSCRIBED/error cycles occurred first");
  assert.equal(removeChannelCalls[0], channels[0]);
});

for (const badStatus of ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]) {
  test(`subscribeToConversationMessages: ${badStatus} reports the safe 'unavailable' state, never the raw status string as the UI-facing value`, async () => {
    const { client, channels } = realtimeClient();
    currentClient = client;
    const { handlers, stateCalls } = trackedHandlers();

    await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
    channels[0].emitStatus(badStatus, new Error("socket closed"));

    assert.deepEqual(stateCalls, ["connecting", "unavailable"]);
    assert.ok(!stateCalls.includes(badStatus), "the raw Realtime status string must never be handed to the UI-facing callback");
  });
}

// ==========================================================================
// An INSERT notification is a bare change signal — the payload is never
// exposed to the caller, so it is structurally impossible for a consumer of
// this boundary to append payload.new directly instead of re-fetching.
// ==========================================================================

test("subscribeToConversationMessages: an INSERT notification calls onSignal with no arguments — the row payload is never exposed", async () => {
  const { client, channels } = realtimeClient();
  currentClient = client;
  const { handlers, signalCalls } = trackedHandlers();

  await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
  channels[0].emitInsert({ new: { id: "should-not-be-exposed", conversation_id: VALID_CONVO_ID, body: "hi" } });

  assert.equal(signalCalls.length, 1);
  assert.deepEqual(signalCalls[0], [], "onSignal must be called with zero arguments — never the INSERT payload");
});

// ==========================================================================
// Cleanup: removes exactly the one channel this call created, and is
// idempotent (safe to call more than once, e.g. StrictMode's synchronous
// cleanup followed by an explicit unmount cleanup).
// ==========================================================================

test("subscribeToConversationMessages: cleanup removes exactly the created channel, and calling it again is a safe no-op", async () => {
  const { client, channels, removeChannelCalls } = realtimeClient();
  currentClient = client;
  const { handlers } = trackedHandlers();

  const cleanup = await subscribeToConversationMessages(VALID_CONVO_ID, handlers);
  cleanup();
  cleanup();
  cleanup();

  assert.equal(removeChannelCalls.length, 1, "removeChannel must be called exactly once regardless of how many times cleanup() runs");
  assert.equal(removeChannelCalls[0], channels[0], "cleanup must remove the exact channel this call created");
});

// ==========================================================================
// React StrictMode's synchronous mount -> cleanup -> mount: if the caller's
// effect is already cancelled (signal aborted) by the time the authenticated
// session check resolves, no channel is ever created at all — this is the
// mechanism that keeps a discarded StrictMode-first-mount from ever leaving
// a live channel behind, deterministically (not timing-dependent) at the
// unit level.
// ==========================================================================

test("subscribeToConversationMessages: an already-aborted signal (by the time auth resolves) creates no channel, and the returned cleanup is a safe no-op", async () => {
  const channelCalls = [];
  const removeChannelCalls = [];
  const controller = new AbortController();
  currentClient = {
    auth: {
      getUser: async () => {
        // Simulate the effect being cleaned up (StrictMode's discarded first
        // mount) while the authenticated-session check is still in flight.
        controller.abort();
        return { data: { user: { id: AUTH_USER_ID } }, error: null };
      },
    },
    channel: (topic) => {
      channelCalls.push(topic);
      throw new Error("channel() must not be called once the signal is aborted");
    },
    removeChannel: async (ch) => {
      removeChannelCalls.push(ch);
      return "ok";
    },
  };
  const { handlers } = trackedHandlers();

  const cleanup = await subscribeToConversationMessages(VALID_CONVO_ID, handlers, { signal: controller.signal });
  assert.equal(channelCalls.length, 0, "no channel may ever be created once the effect is already cancelled");
  assert.doesNotThrow(() => cleanup());
  assert.equal(removeChannelCalls.length, 0, "there is nothing to remove — cleanup must be a safe no-op");
});
