import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice C: real-mount interaction coverage for the conversation-list
// screen (MessagesRoute + ConversationList), following this repo's existing
// jsdom + node:test convention for behavioral proof (see
// tests/home-route-strictmode.test.mjs) rather than source-regex assertions.

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
const CONVO_ID = "c0000000-0000-0000-0000-000000000001";

let authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
let fetchMyConversationsImpl = async () => [];
let fetchPublicProfileByIdCalls = [];
let fetchPublicProfileByIdImpl = async (id) => ({ profile: { id, display_name: "Jordan Rivera", username: "jordan", avatar_path: null, account_type: "customer", bio: null }, professional: null });
const fetchMyConversationsCalls = [];

// Phase 4 Slice F: `fetchUnreadMessageCounts` is a second, independent round
// trip ConversationList now runs alongside `fetchMyConversations` via
// Promise.all. Most existing tests below only care about the conversation
// list itself and never set `fetchUnreadMessageCountsImpl` — for those, the
// default here derives a genuine zero-count-per-conversation map from the
// *exact same promise* `fetchMyConversations()` just returned (never a
// second, independent call to `fetchMyConversationsImpl`, which would race
// or double-invoke a test's own resolver closure — see the "loading" test
// below, whose `fetchMyConversationsImpl` resolves via a captured
// `resolveList` that must only ever be created once per call). A test that
// needs to exercise unread counts/badges/contract-violation behavior sets
// `fetchUnreadMessageCountsImpl` explicitly instead.
let fetchUnreadMessageCountsImpl = null;
let currentConversationsPromise = Promise.resolve([]);
const fetchUnreadMessageCountsCalls = [];

mock.module(authUrl, {
  exports: {
    useAuthSession: () => authState,
  },
});

mock.module(messagingClientUrl, {
  exports: {
    fetchMyConversations: async (...args) => {
      fetchMyConversationsCalls.push(args);
      currentConversationsPromise = Promise.resolve(fetchMyConversationsImpl(...args));
      return currentConversationsPromise;
    },
    fetchUnreadMessageCounts: async () => {
      fetchUnreadMessageCountsCalls.push([]);
      if (fetchUnreadMessageCountsImpl) return fetchUnreadMessageCountsImpl();
      const rows = await currentConversationsPromise;
      return new Map((rows ?? []).map((row) => [row.id, 0]));
    },
    // Not exercised on this screen, but importable without crashing if
    // something transitively references it.
    fetchMessages: async () => {
      throw new Error("fetchMessages must not be called from the conversation-list screen");
    },
    sendMessage: async () => {
      throw new Error("sendMessage must not be called from the conversation-list screen");
    },
    markConversationRead: async () => {
      throw new Error("markConversationRead must not be called from the conversation-list screen");
    },
    createOrGetDirectConversation: async () => {
      throw new Error("createOrGetDirectConversation must not be called from the conversation-list screen");
    },
  },
});

mock.module(socialClientUrl, {
  exports: {
    fetchPublicProfileById: async (id) => {
      fetchPublicProfileByIdCalls.push(id);
      return fetchPublicProfileByIdImpl(id);
    },
    SocialUnavailableError: class SocialUnavailableError extends Error {},
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { default: MessagesRoute } = await import(new URL("../src/social/routes/MessagesRoute.tsx", import.meta.url).href);

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  return createRoot(container);
}

async function mount({ strict = false } = {}) {
  const root = freshRoot();
  const routeTree = React.createElement(
    MemoryRouter,
    { initialEntries: ["/messages"] },
    React.createElement(Routes, null, React.createElement(Route, { path: "/messages", element: React.createElement(MessagesRoute) }))
  );
  await React.act(async () => {
    root.render(strict ? React.createElement(React.StrictMode, null, routeTree) : routeTree);
  });
  return document.getElementById("root");
}

async function flush(ms = 50) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

test("guest: no conversation query runs, and an accessible sign-in link is shown", async () => {
  authState = { status: "guest" };
  fetchMyConversationsCalls.length = 0;
  fetchUnreadMessageCountsCalls.length = 0;
  const container = await mount();
  await flush();
  assert.equal(fetchMyConversationsCalls.length, 0, "fetchMyConversations must never be called for a guest");
  assert.equal(fetchUnreadMessageCountsCalls.length, 0, "fetchUnreadMessageCounts must never be called for a guest either");
  const link = container.querySelector('a[href="/auth"]');
  assert.ok(link, "expected an accessible link to /auth");
  assert.match(container.textContent, /Sign in to view your messages/);
  assert.doesNotMatch(container.textContent, /No conversations yet/, "a guest must never see a fake empty inbox");
});

test("authenticated: loading state never renders the genuine-empty message", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let resolveList;
  fetchMyConversationsImpl = () => new Promise((resolve) => { resolveList = resolve; });
  const container = await mount();
  await flush(10);
  assert.match(container.textContent, /Loading conversations/);
  assert.doesNotMatch(container.textContent, /No conversations yet/);
  resolveList([]);
  await flush();
});

test("authenticated: a confirmed zero-row result renders a genuine empty state", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [];
  const container = await mount();
  await flush();
  assert.match(container.textContent, /No conversations yet/);
});

// Phase 4 Slice C.1: the fixture uses the real safe message
// messagingClient.ts's list_conversations normalization produces (see
// messaging-client.test.mjs) rather than a raw-looking backend string —
// this test is about ConversationList's own error/Retry contract, not
// messagingClient's normalization.
test("authenticated: a query failure renders the safe error state with Retry, and Retry re-fetches", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let calls = 0;
  fetchMyConversationsImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("Your conversations could not be loaded. Please try again.");
    return [];
  };
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Your conversations could not be loaded\. Please try again\./);
  const retryButton = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  assert.ok(retryButton, "expected a Retry control");
  await React.act(async () => {
    retryButton.click();
  });
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /No conversations yet/);
});

test("authenticated: conversations render with the counterpart's real display name, never a raw UUID", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [
    {
      id: CONVO_ID,
      kind: "direct",
      created_at: "2026-01-01T00:00:00.000Z",
      members: [
        { conversation_id: CONVO_ID, user_id: AUTH_USER_ID, joined_at: "2026-01-01T00:00:00.000Z" },
        { conversation_id: CONVO_ID, user_id: OTHER_USER_ID, joined_at: "2026-01-01T00:00:00.000Z" },
      ],
    },
  ];
  fetchPublicProfileByIdImpl = async (id) => ({
    profile: { id, display_name: "Jordan Rivera", username: "jordan", avatar_path: null, account_type: "customer", bio: null },
    professional: null,
  });
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Jordan Rivera/);
  assert.doesNotMatch(container.textContent, new RegExp(OTHER_USER_ID), "the raw counterpart UUID must never be shown as the visible name");
  const link = container.querySelector(`a[href="/messages/${CONVO_ID}"]`);
  assert.ok(link, "expected a link into the conversation's thread");
});

test("authenticated: an unresolvable counterpart profile falls back to a neutral label, not the whole list failing", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [
    {
      id: CONVO_ID,
      kind: "direct",
      created_at: "2026-01-01T00:00:00.000Z",
      members: [
        { conversation_id: CONVO_ID, user_id: AUTH_USER_ID, joined_at: "2026-01-01T00:00:00.000Z" },
        { conversation_id: CONVO_ID, user_id: OTHER_USER_ID, joined_at: "2026-01-01T00:00:00.000Z" },
      ],
    },
  ];
  fetchPublicProfileByIdImpl = async () => {
    throw new Error("profile fetch failed");
  };
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Conversation/);
  assert.doesNotMatch(container.textContent, /profile fetch failed/, "one enrichment failure must not surface as a list-wide error");
});

test("authenticated: a stale StrictMode list response cannot replace the newer request", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  let resolveFirst;
  let callCount = 0;
  fetchMyConversationsImpl = () => {
    callCount += 1;
    if (callCount === 1) return new Promise((resolve) => { resolveFirst = resolve; });
    return Promise.resolve([]);
  };
  const container = await mount({ strict: true });
  await flush();
  assert.equal(callCount, 2, "StrictMode must have started a newer list request");
  assert.match(container.textContent, /No conversations yet/);

  resolveFirst([
    {
      id: CONVO_ID,
      kind: "direct",
      created_at: "2026-01-01T00:00:00.000Z",
      members: [
        { conversation_id: CONVO_ID, user_id: AUTH_USER_ID, joined_at: "2026-01-01T00:00:00.000Z" },
        { conversation_id: CONVO_ID, user_id: OTHER_USER_ID, joined_at: "2026-01-01T00:00:00.000Z" },
      ],
    },
  ]);
  await flush();
  assert.match(container.textContent, /No conversations yet/, "the later (empty) response must win over the earlier, now-stale one");
  assert.doesNotMatch(container.textContent, /Jordan Rivera/);
});

// ==========================================================================
// Phase 4 Slice F: unread badges + the unread/conversation contract.
// ==========================================================================

function conversationRow(id, otherId, createdAt = "2026-01-01T00:00:00.000Z") {
  return {
    id,
    kind: "direct",
    created_at: createdAt,
    members: [
      { conversation_id: id, user_id: AUTH_USER_ID, joined_at: createdAt },
      { conversation_id: id, user_id: otherId, joined_at: createdAt },
    ],
  };
}

// The link's Avatar is also `aria-hidden="true"` (a decorative initial
// letter) and renders before the unread badge, so the badge — when present
// at all — is always the *last* aria-hidden span, never the first.
function badgeTextFor(container, conversationId) {
  const link = container.querySelector(`a[href="/messages/${conversationId}"]`);
  if (!link) return null;
  const hiddenSpans = [...link.querySelectorAll('span[aria-hidden="true"]')];
  return hiddenSpans.length >= 2 ? hiddenSpans[hiddenSpans.length - 1].textContent : null;
}

test("authenticated: loading never renders any badge, fake-zero or otherwise", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchPublicProfileByIdImpl = async (id) => ({
    profile: { id, display_name: "Jordan Rivera", username: "jordan", avatar_path: null, account_type: "customer", bio: null },
    professional: null,
  });
  fetchUnreadMessageCountsImpl = null;
  let resolveList;
  fetchMyConversationsImpl = () => new Promise((resolve) => { resolveList = resolve; });
  const container = await mount();
  await flush(10);
  assert.equal(container.querySelector('span[aria-hidden="true"]'), null, "no badge markup at all while loading");
  resolveList([conversationRow(CONVO_ID, OTHER_USER_ID)]);
  await flush();
});

test("authenticated: a confirmed zero unread count renders no badge for that conversation", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_ID, 0]]);
  const container = await mount();
  await flush();
  assert.equal(badgeTextFor(container, CONVO_ID), null, "zero must never render a visible badge");
  const link = container.querySelector(`a[href="/messages/${CONVO_ID}"]`);
  assert.doesNotMatch(link.textContent, /unread/i, "no accessible unread text either when the confirmed count is zero");
});

test("authenticated: a positive unread count renders an accessible badge stating the exact count", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_ID, 3]]);
  const container = await mount();
  await flush();
  assert.equal(badgeTextFor(container, CONVO_ID), "3", "the visible badge shows the exact count when at or below the display cap");
  const link = container.querySelector(`a[href="/messages/${CONVO_ID}"]`);
  assert.match(link.textContent, /3 unread messages/, "the accessible text must state the exact count and plural wording");
});

test("authenticated: exactly one unread message uses singular accessible wording", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_ID, 1]]);
  const container = await mount();
  await flush();
  const link = container.querySelector(`a[href="/messages/${CONVO_ID}"]`);
  assert.match(link.textContent, /1 unread message(?!s)/, "singular, not '1 unread messages'");
});

test("authenticated: an unread count above 99 caps the visible badge at '99+' while the accessible label states the exact count", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_ID, 142]]);
  const container = await mount();
  await flush();
  assert.equal(badgeTextFor(container, CONVO_ID), "99+", "the visible badge caps at 99+");
  const link = container.querySelector(`a[href="/messages/${CONVO_ID}"]`);
  assert.match(link.textContent, /142 unread messages/, "the accessible label must still state the real, uncapped count");
});

test("authenticated: a missing unread-count row for a real conversation is a contract error, not an assumed zero", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map(); // missing the one conversation's row entirely
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Your conversations could not be loaded\. Please try again\./);
  assert.doesNotMatch(container.textContent, /Jordan Rivera/, "the list must not render with a fabricated/assumed count");
});

test("authenticated: an unread-count row for an unknown conversation is a contract error", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([
    [CONVO_ID, 0],
    ["c0000000-0000-0000-0000-000000000fff", 5], // a conversation the caller doesn't (or no longer) belong to
  ]);
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Your conversations could not be loaded\. Please try again\./);
});

test("authenticated: a genuine unread-count RPC failure renders the safe error state with Retry, not a silently-zeroed list", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  let calls = 0;
  fetchUnreadMessageCountsImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("Your unread counts could not be loaded. Please try again.");
    return new Map([[CONVO_ID, 0]]);
  };
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Your unread counts could not be loaded\. Please try again\./);
  const retryButton = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  assert.ok(retryButton, "expected a Retry control");
  await React.act(async () => {
    retryButton.click();
  });
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /Jordan Rivera/, "retry succeeds once the count RPC succeeds");
});

test("authenticated: a stale unread-count response under StrictMode cannot replace the newer request's badge", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_ID, OTHER_USER_ID)];
  let resolveFirstCounts;
  let countCallCount = 0;
  fetchUnreadMessageCountsImpl = () => {
    countCallCount += 1;
    if (countCallCount === 1) return new Promise((resolve) => { resolveFirstCounts = resolve; });
    return Promise.resolve(new Map([[CONVO_ID, 7]]));
  };
  const container = await mount({ strict: true });
  await flush();
  assert.equal(countCallCount, 2, "StrictMode must have started a newer unread-counts request");
  assert.equal(badgeTextFor(container, CONVO_ID), "7", "the newer (second) response's count must be the one shown");

  resolveFirstCounts(new Map([[CONVO_ID, 999]]));
  await flush();
  assert.equal(badgeTextFor(container, CONVO_ID), "7", "the earlier, now-stale count must never overwrite the newer one");
});
