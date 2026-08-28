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

mock.module(authUrl, {
  exports: {
    useAuthSession: () => authState,
  },
});

mock.module(messagingClientUrl, {
  exports: {
    fetchMyConversations: async (...args) => {
      fetchMyConversationsCalls.push(args);
      return fetchMyConversationsImpl(...args);
    },
    // Not exercised on this screen, but importable without crashing if
    // something transitively references it.
    fetchMessages: async () => {
      throw new Error("fetchMessages must not be called from the conversation-list screen");
    },
    sendMessage: async () => {
      throw new Error("sendMessage must not be called from the conversation-list screen");
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
  const container = await mount();
  await flush();
  assert.equal(fetchMyConversationsCalls.length, 0, "fetchMyConversations must never be called for a guest");
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
