import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice C: real-mount interaction coverage for the thread screen
// (ConversationRoute + ThreadView), same jsdom + node:test convention as
// tests/home-route-strictmode.test.mjs and tests/messages-route.test.mjs.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const messagingClientUrl = new URL("../src/social/services/messagingClient.ts", import.meta.url).href;
const socialClientUrl = new URL("../src/social/services/socialClient.ts", import.meta.url).href;

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "b0000000-0000-0000-0000-000000000002";
const CONVO_1 = "c0000000-0000-0000-0000-000000000001";
const CONVO_2 = "c0000000-0000-0000-0000-000000000002";

let authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
let fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
let sendMessageImpl = async () => {
  throw new Error("sendMessage not configured for this test");
};
const fetchMessagesCalls = [];
const sendMessageCalls = [];

// Phase 4 Slice F: this screen also mounts ConversationList (in the left
// pane — hidden on mobile via CSS, not unmounted, so it still fetches).
// Controllable the same way as messages-route.test.mjs's own list mocks
// (default: empty list / empty counts, which every pre-existing Slice C/D
// test here is happy with); a test exercising the cross-component
// "mark-read clears only that one badge" behavior sets these explicitly.
let fetchMyConversationsImpl = async () => [];
let fetchUnreadMessageCountsImpl = null;
let currentConversationsPromise = Promise.resolve([]);

// Phase 4 Slice F: ThreadView's mark-read lifecycle. `markConversationReadImpl`
// defaults to a benign, request-matching success so every pre-existing
// Slice C/D test in this file (none of which care about read state) sees no
// failed-read-status banner and no unexpected console noise; a test that
// specifically exercises mark-read sets this explicitly and resets it
// afterward.
let markConversationReadImpl = null;
const markConversationReadCalls = [];
const knownMessageTimestamps = new Map();

// Phase 4 Slice G: ThreadView's own-block-state lookup for its counterpart.
// Defaults resolve to the fixed OTHER_USER_ID (already the implicit
// counterpart in every message fixture below) and "not blocked", so every
// pre-existing test's composer stays enabled exactly as before; a test
// exercising the block banner/composer-gating overrides these explicitly
// and resets them afterward.
let fetchConversationCounterpartImpl = async () => OTHER_USER_ID;
let fetchMyBlockStateImpl = async () => false;
const fetchConversationCounterpartCalls = [];
const fetchMyBlockStateCalls = [];

// Phase 4 Slice D: a controllable stand-in for the real
// subscribeToConversationMessages boundary. Each call is recorded with the
// handlers ThreadView registered, so a test can reach in and simulate a
// connection-state transition or an INSERT signal exactly as the real
// boundary would deliver it (see tests/messaging-realtime-client.test.mjs
// for unit coverage of the real boundary itself — this file is about
// ThreadView's *reaction* to those signals, not the boundary's own
// Supabase-facing contract). Every call's cleanup is tracked too, so a test
// can assert React StrictMode / unmount never leaves more than one active
// subscription per mounted ThreadView.
let subscribeToConversationMessagesImpl = null; // set per test when a test needs to drive it; otherwise inert.
const subscribeToConversationMessagesCalls = [];
let activeSubscriptionCount = 0;

mock.module(authUrl, {
  exports: { useAuthSession: () => authState },
});

mock.module(messagingClientUrl, {
  exports: {
    fetchMyConversations: async (...args) => {
      currentConversationsPromise = Promise.resolve(fetchMyConversationsImpl(...args));
      return currentConversationsPromise;
    },
    fetchUnreadMessageCounts: async () => {
      if (fetchUnreadMessageCountsImpl) return fetchUnreadMessageCountsImpl();
      const rows = await currentConversationsPromise;
      return new Map((rows ?? []).map((row) => [row.id, 0]));
    },
    fetchMessages: async (...args) => {
      fetchMessagesCalls.push(args);
      const page = await fetchMessagesImpl(...args);
      // Phase 4 Slice F: remembers each fixture message's real created_at by
      // id, so the default markConversationRead mock below can echo back a
      // genuinely chronologically-correct cursor (mirroring the real RPC,
      // which reads the message's actual created_at server-side) instead of
      // a fabricated wall-clock timestamp that would falsely appear "newer"
      // than every 2026-dated fixture message and silently break the
      // isNewerThan monotonicity check ThreadView relies on.
      for (const message of page?.messages ?? []) knownMessageTimestamps.set(message.id, message.created_at);
      return page;
    },
    sendMessage: async (...args) => {
      sendMessageCalls.push(args);
      const confirmed = await sendMessageImpl(...args);
      if (confirmed) knownMessageTimestamps.set(confirmed.id, confirmed.created_at);
      return confirmed;
    },
    markConversationRead: async (conversationId, messageId) => {
      markConversationReadCalls.push([conversationId, messageId]);
      if (markConversationReadImpl) return markConversationReadImpl(conversationId, messageId);
      const createdAt = knownMessageTimestamps.get(messageId) ?? new Date().toISOString();
      return {
        conversationId,
        userId: AUTH_USER_ID,
        lastReadMessageId: messageId,
        lastReadMessageCreatedAt: createdAt,
        updatedAt: createdAt,
      };
    },
    createOrGetDirectConversation: async () => {
      throw new Error("createOrGetDirectConversation must not be called from the thread screen");
    },
    // Phase 4 Slice G: ThreadView's own read-only block-state lookup for its
    // counterpart. Defaults keep every pre-existing test in this file
    // exactly as before (a resolvable counterpart, never blocked); a test
    // exercising the block-state banner overrides these explicitly.
    fetchConversationCounterpart: async (...args) => {
      fetchConversationCounterpartCalls.push(args);
      return fetchConversationCounterpartImpl(...args);
    },
    fetchMyBlockState: async (...args) => {
      fetchMyBlockStateCalls.push(args);
      return fetchMyBlockStateImpl(...args);
    },
    subscribeToConversationMessages: async (conversationId, handlers, options) => {
      if (subscribeToConversationMessagesImpl) return subscribeToConversationMessagesImpl(conversationId, handlers, options);
      const call = { conversationId, handlers, options, cleanedUp: false };
      subscribeToConversationMessagesCalls.push(call);
      activeSubscriptionCount += 1;
      return () => {
        if (call.cleanedUp) return;
        call.cleanedUp = true;
        activeSubscriptionCount -= 1;
      };
    },
  },
});

mock.module(socialClientUrl, {
  exports: {
    fetchPublicProfileById: async () => null,
    SocialUnavailableError: class SocialUnavailableError extends Error {},
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route, useNavigate } = await import("react-router-dom");
const { default: ConversationRoute } = await import(new URL("../src/social/routes/ConversationRoute.tsx", import.meta.url).href);
const { onConversationRead } = await import(new URL("../src/social/services/readStateEvents.ts", import.meta.url).href);

let currentRoot = null;

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  currentRoot = createRoot(container);
  return currentRoot;
}

afterEach(async () => {
  if (!currentRoot) return;
  await React.act(async () => {
    currentRoot.unmount();
  });
  currentRoot = null;
});

async function mount(path) {
  const root = freshRoot();
  currentRoot = root;
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/messages/:conversationId", element: React.createElement(ConversationRoute) })
        )
      )
    );
  });
  return document.getElementById("root");
}

async function flush(ms = 50) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function msg(id, senderId, body, isoTime) {
  return { id, conversation_id: CONVO_1, sender_id: senderId, body, created_at: isoTime };
}

test("a malformed conversation id in the route never queries messages, and offers a way back", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesCalls.length = 0;
  const container = await mount("/messages/not-a-uuid");
  await flush();
  assert.equal(fetchMessagesCalls.length, 0, "fetchMessages must never be called for a malformed id");
  assert.match(container.textContent, /isn't valid/);
  assert.ok(container.querySelector('a[href="/messages"]'), "expected a link back to the conversation list");
});

test("guest visiting a thread URL never queries messages", async () => {
  authState = { status: "guest" };
  fetchMessagesCalls.length = 0;
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(fetchMessagesCalls.length, 0);
  assert.ok(container.querySelector('a[href="/auth"]'));
});

test("loading never renders the confirmed-empty message, and a confirmed empty conversation renders honestly", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let resolveFetch;
  fetchMessagesImpl = () => new Promise((resolve) => { resolveFetch = resolve; });
  const container = await mount(`/messages/${CONVO_1}`);
  await flush(10);
  assert.match(container.textContent, /Loading messages/);
  assert.doesNotMatch(container.textContent, /No messages yet/);
  resolveFetch({ messages: [], nextCursor: null });
  await flush();
  assert.match(container.textContent, /No messages yet/);
});

// Phase 4 Slice C.1: the fixture below deliberately uses the real safe
// message messagingClient.ts's fetch_messages normalization now produces
// (see messaging-client.test.mjs for proof that a raw RLS/Postgres error
// actually gets normalized to this text at the service boundary) rather
// than a raw-looking backend string — this test is about ThreadView's own
// error/Retry rendering contract, not messagingClient's normalization, so
// it should exercise the same shape of message ThreadView will genuinely
// receive in production, never a stand-in for a leak this suite exists to
// prevent.
test("a fetch failure renders the safe error state with Retry, and Retry re-fetches", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let calls = 0;
  fetchMessagesImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("This conversation could not be loaded. Please try again.");
    return { messages: [msg("m1", AUTH_USER_ID, "hi", "2026-01-01T00:00:01.000Z")], nextCursor: null };
  };
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.match(container.textContent, /This conversation could not be loaded\. Please try again\./);
  const retry = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  assert.ok(retry);
  await React.act(async () => { retry.click(); });
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /hi/);
});

test("messages render in chronological order and distinguish own vs. their messages, without fabricated delivery/read state", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesImpl = async () => ({
    messages: [
      msg("m3", OTHER_USER_ID, "third", "2026-01-01T00:00:03.000Z"),
      msg("m1", AUTH_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z"),
    ],
    nextCursor: null,
  });
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  const bodies = [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent);
  assert.deepEqual(bodies, ["first", "second", "third"], "messages must render oldest-first regardless of fetch order");
  assert.doesNotMatch(container.textContent, /\b(?:delivered|read|online|typing)\b/i, "no fabricated delivery/read/presence state");
});

test("the thread remains functional under the app's React StrictMode lifecycle", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesImpl = async () => ({
    messages: [msg("strict-1", OTHER_USER_ID, "strict mode response", "2026-01-01T00:00:01.000Z")],
    nextCursor: null,
  });
  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [`/messages/${CONVO_1}`] },
          React.createElement(Routes, null, React.createElement(Route, { path: "/messages/:conversationId", element: React.createElement(ConversationRoute) }))
        )
      )
    );
  });
  await flush();
  const container = document.getElementById("root");
  assert.match(container.textContent, /strict mode response/);
  assert.equal(document.activeElement?.tagName, "H1", "route entry should move focus to the thread heading");
});

test("load-older pagination merges without duplicates or gaps and stays chronological", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  const cursor = { createdAt: "2026-01-01T00:00:02.000Z", id: "m2" };
  let calls = 0;
  fetchMessagesImpl = async (conversationId, passedCursor) => {
    calls += 1;
    if (!passedCursor) {
      return { messages: [msg("m3", OTHER_USER_ID, "third", "2026-01-01T00:00:03.000Z"), msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z")], nextCursor: cursor };
    }
    return { messages: [msg("m1", AUTH_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null };
  };
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  const loadOlder = [...container.querySelectorAll("button")].find((b) => /load older/i.test(b.textContent));
  assert.ok(loadOlder, "expected a Load older control when nextCursor is present");
  await React.act(async () => { loadOlder.click(); });
  await flush();
  assert.equal(calls, 2);
  const bodies = [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent);
  assert.deepEqual(bodies, ["first", "second", "third"]);
  assert.equal(new Set(bodies).size, bodies.length, "no duplicate message after merging pages");
});

test("send: preserves the draft on failure, disables duplicate submission, and appends only the confirmed row on success", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  let failNext = true;
  let resolveSend;
  sendMessageImpl = (conversationId, body) => {
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error("This message could not be sent. Please try again."));
    }
    return new Promise((resolve) => {
      resolveSend = () => resolve({ id: "srv-1", conversation_id: CONVO_1, sender_id: AUTH_USER_ID, body, created_at: "2026-01-01T00:00:05.000Z" });
    });
  };
  sendMessageCalls.length = 0;
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  const textarea = container.querySelector("#message-draft");
  const form = textarea.closest("form");
  const setValue = (value) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    nativeSetter.call(textarea, value);
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  };

  await React.act(async () => {
    setValue("hello there");
  });
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
  assert.equal(sendMessageCalls.length, 1, "the failed send must still count as exactly one attempt");
  assert.equal(textarea.value, "hello there", "the draft must be preserved after a send failure");
  assert.match(container.textContent, /could not be sent/);

  // Retry the same draft — this time it hangs (pending) so duplicate-submit
  // prevention can be proven.
  const sendButton = [...container.querySelectorAll("button[type=submit]")].find((b) => /send/i.test(b.textContent));
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush(10);
  assert.equal(sendButton.disabled, true, "the send control must disable while a send is pending");
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush(10);
  assert.equal(sendMessageCalls.length, 2, "a second submit attempt while pending must not start a second network call");

  await React.act(async () => {
    resolveSend();
    await new Promise((r) => setTimeout(r, 50));
  });
  assert.equal(textarea.value, "", "the draft is cleared only after the confirmed server response");
  assert.match(container.textContent, /hello there/, "the confirmed message body must appear, appended from the server row");
  const bodies = [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent);
  assert.equal(bodies.filter((b) => b === "hello there").length, 1, "the confirmed message must appear exactly once, not duplicated");
});

test("rapid conversation switching cannot show a stale conversation's messages", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let resolveConvo1;
  fetchMessagesImpl = async (conversationId) => {
    if (conversationId === CONVO_1) {
      return new Promise((resolve) => { resolveConvo1 = () => resolve({ messages: [msg("m1", AUTH_USER_ID, "from convo 1", "2026-01-01T00:00:01.000Z")], nextCursor: null }); });
    }
    return { messages: [{ id: "m2", conversation_id: CONVO_2, sender_id: AUTH_USER_ID, body: "from convo 2", created_at: "2026-01-01T00:00:02.000Z" }], nextCursor: null };
  };

  function SwitchConversation() {
    const navigate = useNavigate();
    return React.createElement("button", { type: "button", onClick: () => navigate(`/messages/${CONVO_2}`) }, "Switch conversation");
  }

  const root = freshRoot();
  currentRoot = root;
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/messages/${CONVO_1}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/messages/:conversationId",
            element: React.createElement(React.Fragment, null, React.createElement(SwitchConversation), React.createElement(ConversationRoute)),
          })
        )
      )
    );
  });
  await flush(10); // convo 1's fetch is now pending (deliberately unresolved)

  const switchButton = [...document.getElementById("root").querySelectorAll("button")].find((button) => button.textContent === "Switch conversation");
  assert.ok(switchButton);
  await React.act(async () => { switchButton.click(); });
  await flush(); // convo 2 mounts fresh (keyed by conversationId) and resolves immediately

  const container = document.getElementById("root");
  assert.match(container.textContent, /from convo 2/);
  assert.doesNotMatch(container.textContent, /from convo 1/, "convo 1's late response must never land in convo 2's view");

  // Now let convo 1's stale response resolve — it must have no effect since
  // ThreadView was remounted (key={conversationId}) when the route changed.
  resolveConvo1?.();
  await flush();
  assert.doesNotMatch(document.getElementById("root").textContent, /from convo 1/);
});

test("refresh adopts the freshly fetched page's nextCursor, so a thread that grew past one page reveals Load older and load-older then honors that new cursor", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  const refreshCursor = { createdAt: "2026-01-01T00:00:04.000Z", id: "m4" };
  let calls = 0;
  fetchMessagesImpl = async (conversationId, passedCursor) => {
    calls += 1;
    if (calls === 1) {
      // Initial load: thread currently fits on one page, so nextCursor is null.
      assert.equal(passedCursor, null);
      return { messages: [msg("m5", OTHER_USER_ID, "fifth", "2026-01-01T00:00:05.000Z")], nextCursor: null };
    }
    if (calls === 2) {
      // Refresh: the thread has since grown past one page.
      assert.equal(passedCursor, null);
      return {
        messages: [
          msg("m5", OTHER_USER_ID, "fifth", "2026-01-01T00:00:05.000Z"),
          msg("m4", OTHER_USER_ID, "fourth", "2026-01-01T00:00:04.000Z"),
        ],
        nextCursor: refreshCursor,
      };
    }
    // Load older: must use the cursor the refresh just produced, not the stale null from initial load.
    assert.deepEqual(passedCursor, refreshCursor);
    return { messages: [msg("m3", AUTH_USER_ID, "third", "2026-01-01T00:00:03.000Z")], nextCursor: null };
  };

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(
    [...container.querySelectorAll("button")].some((b) => /load older/i.test(b.textContent)),
    false,
    "no Load older control while nextCursor is null"
  );

  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  await React.act(async () => { refreshButton.click(); });
  await flush();
  assert.equal(calls, 2);
  const loadOlder = [...container.querySelectorAll("button")].find((b) => /load older/i.test(b.textContent));
  assert.ok(loadOlder, "a refresh that reveals a non-null nextCursor must surface the Load older control");

  await React.act(async () => { loadOlder.click(); });
  await flush();
  assert.equal(calls, 3, "load-older must have fired using the refreshed cursor");
  const bodies = [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent);
  assert.deepEqual(bodies, ["third", "fourth", "fifth"], "merged pages must stay chronological");
  assert.equal(new Set(bodies).size, bodies.length, "no duplicate message after merging the refreshed and older pages");
});

test("a failed refresh preserves the existing messages and pagination state", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let calls = 0;
  fetchMessagesImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return { messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null };
    }
    // Real safe text (see messaging-client.test.mjs), not a raw-looking stand-in — see the note above the "a fetch failure" test.
    throw new Error("This conversation could not be loaded. Please try again.");
  };
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  await React.act(async () => { refreshButton.click(); });
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /This conversation could not be loaded\. Please try again\./);
  assert.match(container.textContent, /first/, "prior messages must remain visible after a failed refresh");
  assert.equal(
    [...container.querySelectorAll("button")].some((b) => /load older/i.test(b.textContent)),
    false,
    "pagination state (still no older page) must be unchanged by the failed refresh"
  );
});

test("mobile back control links to the conversation list", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  const backLink = container.querySelector('a[aria-label="Back to conversations"]');
  assert.ok(backLink, "expected an accessible back control");
  assert.equal(backLink.getAttribute("href"), "/messages");
});

// ==========================================================================
// Phase 4 Slice D: authenticated Realtime delivery — ThreadView's reaction
// to the subscribeToConversationMessages boundary's signals/state, and the
// honest connected/unavailable UI. The boundary's own Supabase-facing
// contract (channel shape, filter, cleanup, StrictMode-safe abort) is
// covered at the unit level in tests/messaging-realtime-client.test.mjs;
// this file proves ThreadView never trusts a payload directly, coalesces
// convergence fetches, preserves state on failure, and never leaves more
// than one active subscription alive.
// ==========================================================================

test("the thread never claims to be live before Realtime connects, still offers Refresh, and reflects the honest connected/unavailable state once the boundary reports it", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;

  const container = await mount(`/messages/${CONVO_1}`);
  await flush(10);
  assert.match(container.textContent, /Connecting/i, "must not claim to be live before the boundary ever reports a connected state");
  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  assert.ok(refreshButton, "expected an explicit Refresh control regardless of Realtime connection state");

  assert.equal(subscribeToConversationMessagesCalls.length, 1);
  const { handlers } = subscribeToConversationMessagesCalls[0];
  await React.act(async () => { handlers.onConnectionStateChange("connected"); });
  assert.match(container.textContent, /Live updates on/);

  await React.act(async () => { handlers.onConnectionStateChange("unavailable"); });
  assert.match(container.textContent, /Live updates unavailable — use Refresh/);
  assert.doesNotMatch(container.textContent, /\b(?:delivered|read|online|typing)\b/i, "no fabricated delivery/read/presence state in any connection state");
});

test("a Realtime signal triggers an authoritative re-fetch rather than trusting any payload directly", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesCalls.length = 0;
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "hello", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(fetchMessagesCalls.length, 1, "the initial load must be exactly one fetch");

  const { handlers } = subscribeToConversationMessagesCalls[0];
  fetchMessagesImpl = async () => ({
    messages: [msg("m1", OTHER_USER_ID, "hello", "2026-01-01T00:00:01.000Z"), msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z")],
    nextCursor: null,
  });
  await React.act(async () => { handlers.onSignal(); });
  await flush();

  assert.equal(fetchMessagesCalls.length, 2, "a bare signal must trigger exactly one authoritative re-fetch");
  assert.match(container.textContent, /second/, "the newly signalled message must come from the authoritative re-fetch, never a trusted payload");
});

test("multiple signals arriving while a convergence fetch is already in flight coalesce into exactly one further fetch", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesCalls.length = 0;

  let resolveSlow;
  let callCount = 0;
  fetchMessagesImpl = async () => {
    callCount += 1;
    if (callCount === 1) return { messages: [], nextCursor: null }; // initial load
    if (callCount === 2) return new Promise((resolve) => { resolveSlow = () => resolve({ messages: [], nextCursor: null }); });
    return { messages: [], nextCursor: null };
  };

  await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(fetchMessagesCalls.length, 1);

  const { handlers } = subscribeToConversationMessagesCalls[0];
  await React.act(async () => {
    handlers.onSignal(); // starts the slow in-flight fetch (call #2)
  });
  await flush(5);
  assert.equal(fetchMessagesCalls.length, 2, "the first signal must start exactly one fetch");

  await React.act(async () => {
    handlers.onSignal();
    handlers.onSignal();
    handlers.onSignal();
  });
  await flush(5);
  assert.equal(fetchMessagesCalls.length, 2, "signals arriving while a fetch is in flight must not start additional parallel fetches");

  await React.act(async () => {
    resolveSlow();
    await new Promise((r) => setTimeout(r, 20));
  });
  assert.equal(fetchMessagesCalls.length, 3, "exactly one further fetch must run after the in-flight one resolves, to converge on the latest signals");
});

test("a sender's own confirmed send plus its Realtime signal converge to exactly one message by id", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  sendMessageImpl = async (conversationId, body) => ({
    id: "srv-1",
    conversation_id: CONVO_1,
    sender_id: AUTH_USER_ID,
    body,
    created_at: "2026-01-01T00:00:05.000Z",
  });

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  const textarea = container.querySelector("#message-draft");
  const form = textarea.closest("form");
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(textarea, "hi there");
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();

  // The confirmed send already appended the row locally; the Realtime signal
  // for that same insert now arrives and triggers a re-fetch that returns
  // the identical row by id.
  fetchMessagesImpl = async () => ({
    messages: [{ id: "srv-1", conversation_id: CONVO_1, sender_id: AUTH_USER_ID, body: "hi there", created_at: "2026-01-01T00:00:05.000Z" }],
    nextCursor: null,
  });
  const { handlers } = subscribeToConversationMessagesCalls[0];
  await React.act(async () => { handlers.onSignal(); });
  await flush();

  const bodies = [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent);
  assert.equal(bodies.filter((b) => b === "hi there").length, 1, "the sender's own confirmed message and its Realtime signal must converge to exactly one message");
});

test("Realtime connection failure preserves existing messages, pagination state, and an unsent draft", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  const textarea = container.querySelector("#message-draft");
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(textarea, "an unsent draft");
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });

  const { handlers } = subscribeToConversationMessagesCalls[0];
  await React.act(async () => { handlers.onConnectionStateChange("unavailable"); });

  assert.match(container.textContent, /Live updates unavailable — use Refresh/);
  assert.match(container.textContent, /first/, "existing messages must survive a Realtime connection failure");
  assert.equal(textarea.value, "an unsent draft", "the draft must survive a Realtime connection failure");

  // Manual Refresh must still work while Realtime is unavailable.
  fetchMessagesImpl = async () => ({
    messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z"), msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z")],
    nextCursor: null,
  });
  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  await React.act(async () => { refreshButton.click(); });
  await flush();
  assert.match(container.textContent, /second/, "manual Refresh must still fetch successfully when Realtime is unavailable");
});

test("the same mounted subscription recovers after the underlying channel reports SUBSCRIBED again — no remount, no second subscription, existing state preserved, and a message sent during the outage arrives via a fresh authoritative catch-up fetch", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesCalls.length = 0;

  const olderCursor = { createdAt: "2026-01-01T00:00:02.000Z", id: "m2" };
  fetchMessagesImpl = async (conversationId, cursor) => {
    if (!cursor) return { messages: [msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z")], nextCursor: olderCursor };
    return { messages: [msg("m1", AUTH_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null };
  };

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(fetchMessagesCalls.length, 1, "initial load");

  // Load the older page before the outage, so recovery is proven to leave
  // already-merged pagination state (not just a single fresh page) intact.
  const loadOlder = [...container.querySelectorAll("button")].find((b) => /load older/i.test(b.textContent));
  await React.act(async () => { loadOlder.click(); });
  await flush();
  assert.equal(fetchMessagesCalls.length, 2);
  assert.deepEqual([...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent), ["first", "second"]);

  const textarea = container.querySelector("#message-draft");
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(textarea, "draft surviving the outage/recovery cycle");
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });

  assert.equal(subscribeToConversationMessagesCalls.length, 1, "exactly one subscription must exist before the outage even starts");
  const { handlers } = subscribeToConversationMessagesCalls[0];

  // 1. The mounted thread begins connected.
  await React.act(async () => { handlers.onConnectionStateChange("connected"); });
  assert.match(container.textContent, /Live updates on/);

  // 2. The existing (same, still-mounted) subscription reports unavailable.
  await React.act(async () => { handlers.onConnectionStateChange("unavailable"); });
  assert.match(container.textContent, /Live updates unavailable — use Refresh/);

  // 3. Existing messages, the already-loaded older page, pagination, and the
  // draft all remain unchanged by the outage — no fetch was triggered by a
  // bare connection-state transition.
  assert.equal(fetchMessagesCalls.length, 2, "a connection-state change alone must never trigger a fetch");
  assert.deepEqual([...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent), ["first", "second"]);
  assert.equal(textarea.value, "draft surviving the outage/recovery cycle");

  // A message arrives (e.g. from the other participant) while unavailable —
  // the next authoritative fetch will surface it.
  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", AUTH_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z"),
      msg("m3", OTHER_USER_ID, "sent during the outage", "2026-01-01T00:00:03.000Z"),
    ],
    nextCursor: null,
  });

  // 4/5. The SAME subscription later reports connected/SUBSCRIBED — exactly
  // as the real boundary's persistent .subscribe() callback does on a real
  // rejoin (onConnectionStateChange("connected") immediately followed by
  // onSignal(), see messagingClient.ts) — never a new subscribeToConversationMessages
  // call, never a second channel.
  await React.act(async () => {
    handlers.onConnectionStateChange("connected");
    handlers.onSignal();
  });
  await flush();

  assert.equal(subscribeToConversationMessagesCalls.length, 1, "recovery must never create a second subscription/channel — the existing one just reports SUBSCRIBED again");
  assert.equal(fetchMessagesCalls.length, 3, "the later SUBSCRIBED transition must trigger exactly one new authoritative catch-up fetch");
  assert.match(container.textContent, /Live updates on/, "the thread must reflect the recovered connected state");

  // 6/7. The message inserted during the outage appears, and everything
  // remains deduplicated and chronological.
  assert.deepEqual(
    [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((el) => el.textContent),
    ["first", "second", "sent during the outage"],
    "the message sent during the outage must appear after the post-recovery catch-up fetch, in chronological order with no duplicates"
  );

  // The draft survived the entire outage/recovery cycle untouched.
  assert.equal(textarea.value, "draft surviving the outage/recovery cycle");

  // 9. Manual Refresh continues to work after recovery.
  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", AUTH_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z"),
      msg("m3", OTHER_USER_ID, "sent during the outage", "2026-01-01T00:00:03.000Z"),
      msg("m4", OTHER_USER_ID, "after recovery via refresh", "2026-01-01T00:00:04.000Z"),
    ],
    nextCursor: null,
  });
  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  await React.act(async () => { refreshButton.click(); });
  await flush();
  assert.match(container.textContent, /after recovery via refresh/, "manual Refresh must still work after the recovery cycle");

  // 10. No raw channel/socket/Postgres detail ever reached the DOM at any
  // point in this outage/recovery cycle.
  assert.doesNotMatch(
    container.textContent,
    /SUBSCRIBED|CHANNEL_ERROR|TIMED_OUT|CLOSED|postgres_changes|realtime|websocket|socket/i,
    "no raw Realtime/Postgres/channel detail may ever reach the DOM"
  );

  // 8. No navigation or remount was used anywhere in this test — the entire
  // outage/recovery cycle above was driven through the one subscription's
  // own handlers.
});

test("navigating to a different conversation ignores a stale signal from the previous one's (now unmounted) subscription", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesCalls.length = 0;
  fetchMessagesImpl = async (conversationId) =>
    conversationId === CONVO_1
      ? { messages: [msg("m1", AUTH_USER_ID, "from convo 1", "2026-01-01T00:00:01.000Z")], nextCursor: null }
      : { messages: [{ id: "m2", conversation_id: CONVO_2, sender_id: AUTH_USER_ID, body: "from convo 2", created_at: "2026-01-01T00:00:02.000Z" }], nextCursor: null };

  function SwitchConversation() {
    const navigate = useNavigate();
    return React.createElement("button", { type: "button", onClick: () => navigate(`/messages/${CONVO_2}`) }, "Switch conversation");
  }

  const root = freshRoot();
  currentRoot = root;
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/messages/${CONVO_1}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/messages/:conversationId",
            element: React.createElement(React.Fragment, null, React.createElement(SwitchConversation), React.createElement(ConversationRoute)),
          })
        )
      )
    );
  });
  await flush();
  assert.equal(subscribeToConversationMessagesCalls.length, 1);
  const convo1Handlers = subscribeToConversationMessagesCalls[0].handlers;
  assert.ok(subscribeToConversationMessagesCalls[0].cleanedUp === false);

  const switchButton = [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent === "Switch conversation");
  await React.act(async () => { switchButton.click(); });
  await flush();
  assert.equal(subscribeToConversationMessagesCalls[0].cleanedUp, true, "navigating away must clean up the previous conversation's subscription");
  assert.equal(subscribeToConversationMessagesCalls.length, 2, "the new conversation must get its own fresh subscription");

  const fetchCountAfterSwitch = fetchMessagesCalls.length;
  await React.act(async () => { convo1Handlers.onSignal(); });
  await flush();
  assert.equal(fetchMessagesCalls.length, fetchCountAfterSwitch, "a signal from the previous (unmounted) conversation's subscription must be ignored, not trigger a fetch");
  assert.doesNotMatch(document.getElementById("root").textContent, /from convo 1/);
});

test("React StrictMode's synchronous mount -> cleanup -> mount never leaves more than one active Realtime subscription", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  activeSubscriptionCount = 0;
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });

  const root = freshRoot();
  currentRoot = root;
  await React.act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [`/messages/${CONVO_1}`] },
          React.createElement(Routes, null, React.createElement(Route, { path: "/messages/:conversationId", element: React.createElement(ConversationRoute) }))
        )
      )
    );
  });
  await flush();

  assert.ok(activeSubscriptionCount <= 1, "at most one active subscription may exist at any point, even under StrictMode's double-invoked effect");
  assert.equal(activeSubscriptionCount, 1, "exactly one subscription must remain active once mounted");

  await React.act(async () => { currentRoot.unmount(); });
  currentRoot = null;
  assert.equal(activeSubscriptionCount, 0, "unmounting must clean up the remaining active subscription");
});

// ==========================================================================
// Phase 4 Slice F: the mark-read lifecycle — wraps public.mark_conversation_read
// exactly as merged (20260829172436_message_read_state.sql). ThreadView must
// only ever mark the newest message from an already-successful, authoritative
// fetch, never a raw Realtime payload, never regress behind an older page,
// and never leak read-receipt language about another participant.
// ==========================================================================

function resetReadState() {
  fetchMyConversationsImpl = async () => [];
  fetchUnreadMessageCountsImpl = null;
  markConversationReadImpl = null;
  markConversationReadCalls.length = 0;
  fetchConversationCounterpartImpl = async () => OTHER_USER_ID;
  fetchMyBlockStateImpl = async () => false;
  fetchConversationCounterpartCalls.length = 0;
  fetchMyBlockStateCalls.length = 0;
}

test("a malformed conversation id never calls markConversationRead", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  await mount("/messages/not-a-uuid");
  await flush();
  assert.equal(markConversationReadCalls.length, 0);
});

test("a guest never calls markConversationRead", async () => {
  authState = { status: "guest" };
  resetReadState();
  await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(markConversationReadCalls.length, 0);
});

test("a failed initial fetch never calls markConversationRead; a subsequent successful Retry does, for the newest message it returns", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  let calls = 0;
  fetchMessagesImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("This conversation could not be loaded. Please try again.");
    return { messages: [msg("m1", OTHER_USER_ID, "hi", "2026-01-01T00:00:01.000Z")], nextCursor: null };
  };
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(markConversationReadCalls.length, 0, "a failed fetch has nothing confirmed to mark");

  const retry = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  await React.act(async () => { retry.click(); });
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"]], "the retried, now-successful fetch's only message is marked");
});

test("a genuinely empty conversation never calls markConversationRead", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.equal(markConversationReadCalls.length, 0, "there is no confirmed message to mark in a genuinely empty conversation");
});

test("a non-empty initial load marks the newest confirmed message by (created_at, id), not array/fetch order", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m3", OTHER_USER_ID, "third — newest", "2026-01-01T00:00:03.000Z"),
      msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z"),
    ],
    nextCursor: null,
  });
  await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m3"]], "only the genuinely newest message (m3) is ever marked, regardless of fetch-returned order");
});

test("loading an older page never regresses the cursor — no markConversationRead call for the older page", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  const cursor = { createdAt: "2026-01-01T00:00:02.000Z", id: "m2" };
  fetchMessagesImpl = async (conversationId, passedCursor) => {
    if (!passedCursor) return { messages: [msg("m2", OTHER_USER_ID, "second", "2026-01-01T00:00:02.000Z")], nextCursor: cursor };
    return { messages: [msg("m1", OTHER_USER_ID, "first — older", "2026-01-01T00:00:01.000Z")], nextCursor: null };
  };
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m2"]], "the initial (newer) page marks m2");

  const loadOlder = [...container.querySelectorAll("button")].find((b) => /load older/i.test(b.textContent));
  await React.act(async () => { loadOlder.click(); });
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m2"]], "loading the older page must never call markConversationRead at all — the cursor never regresses to m1");
});

test("Refresh marks a newer confirmed message once one appears", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"]]);

  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "second — newer", "2026-01-01T00:00:02.000Z"),
    ],
    nextCursor: null,
  });
  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  await React.act(async () => { refreshButton.click(); });
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"], [CONVO_1, "m2"]], "Refresh marks the newer message only after the authoritative fetch confirms it");
});

test("a Realtime catch-up fetch marks the newer confirmed message, never the raw signal/payload itself", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"]]);

  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "second — newer", "2026-01-01T00:00:02.000Z"),
    ],
    nextCursor: null,
  });
  const { handlers } = subscribeToConversationMessagesCalls[0];
  // onSignal takes no arguments — see subscribeToConversationMessages's own
  // contract — so there is no payload for ThreadView to ever trust directly.
  await React.act(async () => { handlers.onSignal(); });
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"], [CONVO_1, "m2"]], "the catch-up fetch's confirmed newest message is marked, sourced only from the authoritative re-fetch");
});

test("switching conversations before a stale fetch resolves never marks the stale (previous conversation, previous message) pair", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  let resolveConvo1;
  fetchMessagesImpl = async (conversationId) => {
    if (conversationId === CONVO_1) {
      return new Promise((resolve) => { resolveConvo1 = () => resolve({ messages: [msg("stale", AUTH_USER_ID, "from convo 1", "2026-01-01T00:00:01.000Z")], nextCursor: null }); });
    }
    return { messages: [{ id: "fresh", conversation_id: CONVO_2, sender_id: OTHER_USER_ID, body: "from convo 2", created_at: "2026-01-01T00:00:02.000Z" }], nextCursor: null };
  };

  function SwitchConversation() {
    const navigate = useNavigate();
    return React.createElement("button", { type: "button", onClick: () => navigate(`/messages/${CONVO_2}`) }, "Switch conversation");
  }

  const root = freshRoot();
  currentRoot = root;
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/messages/${CONVO_1}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/messages/:conversationId",
            element: React.createElement(React.Fragment, null, React.createElement(SwitchConversation), React.createElement(ConversationRoute)),
          })
        )
      )
    );
  });
  await flush(10); // convo 1's fetch is pending; nothing has been marked yet

  const switchButton = [...document.getElementById("root").querySelectorAll("button")].find((button) => button.textContent === "Switch conversation");
  await React.act(async () => { switchButton.click(); });
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_2, "fresh"]], "only convo 2's genuinely confirmed message is ever marked");

  resolveConvo1?.();
  await flush();
  assert.deepEqual(
    markConversationReadCalls,
    [[CONVO_2, "fresh"]],
    "convo 1's stale, now-remounted-away-from fetch must never trigger a markConversationRead call for the stale (conversationId, messageId) pair"
  );
});

test("repeated signals resolving to the identical already-attempted message stay bounded — no redundant markConversationRead calls", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"]]);

  const { handlers } = subscribeToConversationMessagesCalls[0];
  await React.act(async () => {
    handlers.onSignal();
    handlers.onSignal();
    handlers.onSignal();
  });
  await flush();
  assert.deepEqual(
    markConversationReadCalls,
    [[CONVO_1, "m1"]],
    "every signal still resolves to the same already-confirmed newest message — none of them should trigger a further markConversationRead call"
  );
});

test("a mark-read failure shows a non-blocking, accessible status with Retry, and messaging remains fully usable — no read-receipt language or raw infrastructure text ever appears", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  markConversationReadImpl = async () => {
    throw new Error("Your read status could not be updated. Please try again.");
  };
  sendMessageImpl = async (conversationId, body) => ({
    id: "srv-1",
    conversation_id: CONVO_1,
    sender_id: AUTH_USER_ID,
    body,
    created_at: "2026-01-01T00:00:05.000Z",
  });
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const emittedReadEvents = [];
  const unsubscribe = onConversationRead((event) => emittedReadEvents.push(event));

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  assert.equal(emittedReadEvents.length, 0, "a failed markConversationRead must never emit a successful-read event onto the shared bus");
  assert.match(container.textContent, /Your read status could not be updated\. Please try again\./);
  const region = container.querySelector('[role="status"]');
  assert.ok(region, "expected an accessible status/live region for the read-state failure");
  assert.match(container.textContent, /Your read status could not be updated\. Please try again\./);
  assert.doesNotMatch(container.textContent, /\bseen\b|\bdelivered\b|read receipt|has read|was read by/i, "must never claim another participant has seen/read anything");
  assert.doesNotMatch(container.textContent, /SQLSTATE|row-level security|policy|P0001|mark_conversation_read/i, "must never leak raw backend/function detail");

  // Messaging itself remains fully usable despite the mark-read failure.
  const textarea = container.querySelector("#message-draft");
  const form = textarea.closest("form");
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(textarea, "still usable");
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
  assert.match(container.textContent, /still usable/, "sending must remain usable after a mark-read failure");

  const retryButton = [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "Retry");
  assert.ok(retryButton, "expected an accessible Retry control for the read-state failure");
  const minHeight = retryButton.className.includes("min-h-[44px]") && retryButton.className.includes("min-w-[44px]");
  assert.ok(minHeight, "the Retry control must meet the 44px minimum touch target");

  assert.equal(emittedReadEvents.length, 0, "still no successful-read event after the failure — nothing here ever confirmed a read");
  unsubscribe();
});

test("Retry always targets the newest currently confirmed message, not a stale failed target", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  subscribeToConversationMessagesImpl = null;
  subscribeToConversationMessagesCalls.length = 0;
  let markAttempts = 0;
  markConversationReadImpl = async (conversationId, messageId) => {
    markAttempts += 1;
    // Every attempt so far fails, up to and including the automatic one
    // Refresh triggers for m2 — only the eventual manual Retry (attempt #3)
    // succeeds, proving Retry recomputed the target rather than reusing m1.
    if (markAttempts < 3) throw new Error("Your read status could not be updated. Please try again.");
    return {
      conversationId,
      userId: AUTH_USER_ID,
      lastReadMessageId: messageId,
      lastReadMessageCreatedAt: "2026-01-01T00:00:02.000Z",
      updatedAt: "2026-01-01T00:00:02.000Z",
    };
  };
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"]], "the first (failing) attempt targets m1");

  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "second — newer", "2026-01-01T00:00:02.000Z"),
    ],
    nextCursor: null,
  });
  const refreshButton = [...container.querySelectorAll("button")].find((b) => /^refresh$/i.test(b.textContent));
  await React.act(async () => { refreshButton.click(); });
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"], [CONVO_1, "m2"]], "the automatic post-refresh attempt targets the now-newest m2, and also fails");

  const retryButton = [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "Retry");
  assert.ok(retryButton);
  await React.act(async () => { retryButton.click(); });
  await flush();
  assert.deepEqual(
    markConversationReadCalls,
    [[CONVO_1, "m1"], [CONVO_1, "m2"], [CONVO_1, "m2"]],
    "Retry recomputes and targets the newest currently confirmed message (m2), never the original stale m1 target"
  );
  assert.doesNotMatch(container.textContent, /Your read status could not be updated/, "a successful Retry clears the failure banner");
});

test("a confirmed mark-read success clears only the selected conversation's badge in the sibling ConversationList pane, and never a different conversation's", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  fetchMyConversationsImpl = async () => [
    { id: CONVO_1, kind: "direct", created_at: "2026-01-01T00:00:00.000Z", members: [] },
    { id: CONVO_2, kind: "direct", created_at: "2026-01-01T00:00:00.000Z", members: [] },
  ];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_1, 4], [CONVO_2, 2]]);
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.deepEqual(markConversationReadCalls, [[CONVO_1, "m1"]], "opening the thread marks convo 1's newest message");

  const badgeFor = (conversationId) => {
    const link = container.querySelector(`a[href="/messages/${conversationId}"]`);
    const hiddenSpans = link ? [...link.querySelectorAll('span[aria-hidden="true"]')] : [];
    return hiddenSpans.length >= 2 ? hiddenSpans[hiddenSpans.length - 1].textContent : null;
  };
  assert.equal(badgeFor(CONVO_1), null, "convo 1's badge is cleared once its mark-read is confirmed");
  assert.equal(badgeFor(CONVO_2), "2", "convo 2's badge — a different conversation — must be completely unaffected");
});

// ==========================================================================
// Phase 4 Slice G: ThreadView's own read-only block-state banner/gating.
// ==========================================================================

test("a confirmed own-block state disables composing and shows a neutral own-action banner — never a claim about the other participant", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  fetchConversationCounterpartImpl = async () => OTHER_USER_ID;
  fetchMyBlockStateImpl = async () => true;
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  assert.deepEqual(fetchConversationCounterpartCalls, [[CONVO_1]], "the counterpart lookup must be scoped to this exact conversation");
  assert.deepEqual(fetchMyBlockStateCalls, [[OTHER_USER_ID]], "the block-state lookup must target the resolved counterpart, not a raw conversation id");
  assert.match(container.textContent, /You've blocked this person\. Messages can't be sent until you unblock them from their profile\./);
  assert.doesNotMatch(container.textContent, /blocked you|they blocked|they've blocked/i, "must never claim the other participant did anything");

  const textarea = container.querySelector("#message-draft");
  assert.equal(textarea.disabled, true, "the composer textarea must be disabled while confirmed blocked");

  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(textarea, "should not be sendable");
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const sendButton = [...container.querySelectorAll("button[type=submit]")].find((b) => /send/i.test(b.textContent));
  assert.equal(sendButton.disabled, true, "Send must stay disabled even with draft text present while confirmed blocked");

  // Existing messages remain fully visible — a block never hides prior history.
  assert.match(container.textContent, /first/);
});

test("an own-block-state lookup failure stays silent — no banner, composing remains available, nothing surfaces as a thread-level error", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  resetReadState();
  fetchConversationCounterpartImpl = async () => {
    throw new Error("boom");
  };
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const container = await mount(`/messages/${CONVO_1}`);
  await flush();

  assert.doesNotMatch(container.textContent, /blocked/i, "an unknown own-block state must never render the block banner or any 'blocked' text");
  const textarea = container.querySelector("#message-draft");
  assert.equal(textarea.disabled, false, "composing must remain available when own-block state is merely unknown, not confirmed blocked");
});
