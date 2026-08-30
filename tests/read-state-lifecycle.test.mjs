import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice F correction: dedicated regression coverage proving the
// module-scoped read-state event bus (src/social/services/readStateEvents.ts)
// cannot cross an authenticated-session or conversation boundary. This file
// mounts the real ConversationList against the *real, unmocked*
// readStateEvents.ts module — driven directly here exactly the way
// ThreadView drives it after a real confirmed markConversationRead success —
// so these tests exercise the actual production contract between the two
// components, not a re-implementation of it.
//
// `useAuthSession` is mocked with a genuinely live-updating store (backed by
// a real React re-render, via a shared subscriber set) rather than the
// simpler "read a plain variable once" mock used elsewhere in this suite.
// That distinction matters here specifically: ConversationList is not
// remounted on every authentication change (see MessagesRoute/
// ConversationRoute — only a transient guest state remounts it), so the
// worst case these tests must prove safe is exactly this one: the *same*
// mounted ConversationList instance surviving a live authenticated-user
// change, with no route change and no unmount involved at all.

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

const ALICE_ID = "a0000000-0000-0000-0000-000000000001";
const BOB_ID = "b0000000-0000-0000-0000-000000000002";
const OTHER_PARTY_ID = "c9999999-0000-0000-0000-000000000009";
const CONVO_A = "c0000000-0000-0000-0000-000000000001";
const CONVO_B = "c0000000-0000-0000-0000-000000000002";

let authState = { status: "authenticated", session: { subject: ALICE_ID } };
const authSubscribers = new Set();
// Assigned once React is dynamically imported below; the mock's
// useAuthSession closure only ever reads this at call time (during a later
// render), well after the assignment has already happened.
let ReactRef;

function setAuthStateLive(next) {
  authState = next;
  for (const notify of authSubscribers) notify();
}

mock.module(authUrl, {
  exports: {
    // A genuinely live, subscribable store — every mounted consumer
    // re-renders (via a real React state update) whenever setAuthStateLive
    // is called, with no unmount/remount involved. Every other test in this
    // suite that never calls setAuthStateLive sees identical behavior to a
    // plain `() => authState` mock, since the subscription is simply never
    // notified.
    useAuthSession: () => {
      const [, forceUpdate] = ReactRef.useReducer((c) => c + 1, 0);
      ReactRef.useEffect(() => {
        authSubscribers.add(forceUpdate);
        return () => {
          authSubscribers.delete(forceUpdate);
        };
      }, []);
      return authState;
    },
  },
});

let fetchMyConversationsImpl = async () => [];
let fetchUnreadMessageCountsImpl = null;
let currentConversationsPromise = Promise.resolve([]);

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
  },
});

mock.module(socialClientUrl, {
  exports: {
    fetchPublicProfileById: async () => null,
    SocialUnavailableError: class SocialUnavailableError extends Error {},
  },
});

const React = (await import("react")).default;
ReactRef = React;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { ConversationList } = await import(new URL("../src/social/components/messaging/ConversationList.tsx", import.meta.url).href);
const { emitConversationRead } = await import(new URL("../src/social/services/readStateEvents.ts", import.meta.url).href);

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

async function mount() {
  const root = freshRoot();
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(ConversationList, { activeConversationId: null })));
  });
  return document.getElementById("root");
}

async function flush(ms = 30) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function conversationRow(id, otherId, createdAt = "2026-01-01T00:00:00.000Z") {
  return {
    id,
    kind: "direct",
    created_at: createdAt,
    members: [
      { conversation_id: id, user_id: ALICE_ID, joined_at: createdAt },
      { conversation_id: id, user_id: otherId, joined_at: createdAt },
    ],
  };
}

// Mirrors messages-route.test.mjs's own helper: the Avatar's decorative
// initial is also aria-hidden and renders first, so the unread badge — when
// present at all — is always the *last* aria-hidden span in the link.
function badgeTextFor(container, conversationId) {
  const link = container.querySelector(`a[href="/messages/${conversationId}"]`);
  if (!link) return null;
  const hiddenSpans = [...link.querySelectorAll('span[aria-hidden="true"]')];
  return hiddenSpans.length >= 2 ? hiddenSpans[hiddenSpans.length - 1].textContent : null;
}

test("an emitted read event clears only the exact matching conversation — a different conversation in the same list is unaffected", async () => {
  authState = { status: "authenticated", session: { subject: ALICE_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_A, BOB_ID), conversationRow(CONVO_B, OTHER_PARTY_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([
    [CONVO_A, 3],
    [CONVO_B, 5],
  ]);
  const container = await mount();
  await flush();
  assert.equal(badgeTextFor(container, CONVO_A), "3");
  assert.equal(badgeTextFor(container, CONVO_B), "5");

  await React.act(async () => {
    emitConversationRead({
      conversationId: CONVO_A,
      userId: ALICE_ID,
      lastReadMessageId: "m1",
      lastReadMessageCreatedAt: "2026-01-01T00:00:01.000Z",
    });
  });
  await flush();
  assert.equal(badgeTextFor(container, CONVO_A), null, "conversation A's badge is cleared by its own matching event");
  assert.equal(badgeTextFor(container, CONVO_B), "5", "conversation B's badge must be completely unaffected by A's event");
});

test("an event carrying a different (foreign) user id than the currently authenticated user is ignored — cannot clear another user's badge", async () => {
  authState = { status: "authenticated", session: { subject: ALICE_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_A, BOB_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_A, 3]]);
  const container = await mount();
  await flush();
  assert.equal(badgeTextFor(container, CONVO_A), "3");

  // Simulates a stale/foreign confirmation reaching this process — e.g. a
  // different signed-in user's own in-flight markConversationRead call
  // resolving after this list is already rendering for Alice.
  await React.act(async () => {
    emitConversationRead({
      conversationId: CONVO_A,
      userId: BOB_ID,
      lastReadMessageId: "m1",
      lastReadMessageCreatedAt: "2026-01-01T00:00:01.000Z",
    });
  });
  await flush();
  assert.equal(
    badgeTextFor(container, CONVO_A),
    "3",
    "a foreign user id's confirmation must never clear a badge rendered for a different authenticated user"
  );
});

test("a live authenticated-user change resets prior confirmed-read memory, so a stale confirmation from the old user cannot suppress the new user's genuinely unread badge", async () => {
  authState = { status: "authenticated", session: { subject: ALICE_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_A, BOB_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_A, 3]]);
  const container = await mount();
  await flush();
  assert.equal(badgeTextFor(container, CONVO_A), "3");

  // Alice's own confirmed mark-read legitimately clears her own badge.
  await React.act(async () => {
    emitConversationRead({
      conversationId: CONVO_A,
      userId: ALICE_ID,
      lastReadMessageId: "m1",
      lastReadMessageCreatedAt: "2026-01-01T00:00:01.000Z",
    });
  });
  await flush();
  assert.equal(badgeTextFor(container, CONVO_A), null);

  // The authenticated session now changes to Bob — WITHOUT this component
  // ever unmounting. This is the worst case: the same ConversationList
  // instance re-renders in place with a new authUserId, exactly as it would
  // if MessagesRoute/ConversationRoute never happened to pass through a
  // guest-state remount in between (which they normally would on a real
  // sign-out, but this proves the guarantee does not depend on that).
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_A, ALICE_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_A, 4]]); // Bob's own, genuinely different unread count
  await React.act(async () => {
    setAuthStateLive({ status: "authenticated", session: { subject: BOB_ID } });
  });
  await flush();
  assert.equal(
    badgeTextFor(container, CONVO_A),
    "4",
    "Bob's own genuinely unread count must render — never suppressed by Alice's stale confirmed-read memory for the same conversation id"
  );
});

test("unmounting removes the read-state listener — a later emitted event neither throws nor updates anything", async () => {
  authState = { status: "authenticated", session: { subject: ALICE_ID } };
  fetchMyConversationsImpl = async () => [conversationRow(CONVO_A, BOB_ID)];
  fetchUnreadMessageCountsImpl = async () => new Map([[CONVO_A, 3]]);
  await mount();
  await flush();

  await React.act(async () => {
    currentRoot.unmount();
  });
  currentRoot = null;

  assert.doesNotThrow(() => {
    emitConversationRead({
      conversationId: CONVO_A,
      userId: ALICE_ID,
      lastReadMessageId: "m1",
      lastReadMessageCreatedAt: "2026-01-01T00:00:01.000Z",
    });
  }, "an event emitted after unmount must be a safe no-op, not an error");
});
