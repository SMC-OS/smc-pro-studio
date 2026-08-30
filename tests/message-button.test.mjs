import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice C: real-mount interaction coverage for the profile "Message"
// entry point — both the standalone MessageButton (RPC-then-navigate
// contract) and its gating inside PublicProfileRoute (own profile / guest).

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
let createOrGetDirectConversationImpl = async () => CONVO_ID;
const createOrGetDirectConversationCalls = [];
// Phase 4 Slice G: PublicProfileRoute's own block-state lookup. Defaults to
// "not blocked" so every pre-existing test here (none of which care about
// blocking) sees Message enabled exactly as before; the dedicated
// block/unblock test file covers the gating itself in depth.
let fetchMyBlockStateImpl = async () => false;
let blockUserImpl = async () => {
  throw new Error("blockUser not exercised in this file");
};
let unblockUserImpl = async () => {
  throw new Error("unblockUser not exercised in this file");
};

mock.module(authUrl, {
  exports: { useAuthSession: () => authState },
});

mock.module(messagingClientUrl, {
  exports: {
    fetchMyConversations: async () => [],
    fetchMessages: async () => ({ messages: [], nextCursor: null }),
    sendMessage: async () => {
      throw new Error("sendMessage not exercised here");
    },
    createOrGetDirectConversation: async (...args) => {
      createOrGetDirectConversationCalls.push(args);
      return createOrGetDirectConversationImpl(...args);
    },
    fetchMyBlockState: async (...args) => fetchMyBlockStateImpl(...args),
    blockUser: async (...args) => blockUserImpl(...args),
    unblockUser: async (...args) => unblockUserImpl(...args),
  },
});

const OTHER_PROFILE = {
  profile: { id: OTHER_USER_ID, display_name: "Jordan Rivera", username: "jordan", avatar_path: null, account_type: "customer", bio: "Hi" },
  professional: null,
};

mock.module(socialClientUrl, {
  exports: {
    SocialUnavailableError: class SocialUnavailableError extends Error {},
    fetchPublicProfileById: async () => OTHER_PROFILE,
    fetchPublicPostsByAuthor: async () => [],
    fetchFollowState: async () => false,
    fetchConnectionState: async () => ({ state: "none", connectionId: null }),
    followUser: async () => {},
    unfollowUser: async () => {},
    requestConnection: async () => "conn-1",
    respondToConnection: async () => {},
    revokeConnectionRequest: async () => {},
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { MessageButton } = await import(new URL("../src/social/components/MessageButton.tsx", import.meta.url).href);
const { default: PublicProfileRoute } = await import(new URL("../src/social/routes/PublicProfileRoute.tsx", import.meta.url).href);

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  return createRoot(container);
}

async function flush(ms = 50) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

// ==========================================================================
// MessageButton: RPC-then-navigate contract.
// ==========================================================================

test("MessageButton: navigates to the new conversation only after the RPC confirms success", async () => {
  let resolveRpc;
  createOrGetDirectConversationImpl = () => new Promise((resolve) => { resolveRpc = () => resolve(CONVO_ID); });
  createOrGetDirectConversationCalls.length = 0;

  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/profile/other"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/profile/other", element: React.createElement(MessageButton, { userId: OTHER_USER_ID, blocked: false }) }),
          React.createElement(Route, { path: "/messages/:conversationId", element: React.createElement("div", null, "THREAD") })
        )
      )
    );
  });
  const container = document.getElementById("root");
  const button = container.querySelector("button");

  await React.act(async () => { button.click(); });
  await flush(10);
  assert.equal(createOrGetDirectConversationCalls.length, 1);
  assert.doesNotMatch(container.textContent, /THREAD/, "must not navigate before the RPC resolves");
  assert.equal(button.disabled, true, "must disable to prevent duplicate submission while pending");

  await React.act(async () => { resolveRpc(); await new Promise((r) => setTimeout(r, 20)); });
  assert.match(document.getElementById("root").textContent, /THREAD/, "must navigate once the RPC confirms success");
});

// Phase 4 Slice C.1: the fixture uses the real safe message
// messagingClient.ts's create_conversation normalization produces for
// every RPC failure — including a block — (see messaging-client.test.mjs
// for proof of that normalization) rather than a raw-looking backend
// string; this test is about MessageButton's own error/retry contract, not
// messagingClient's normalization. See tests/messaging-error-boundary.test.mjs
// for the end-to-end proof that a real blocked-pair RPC error never
// reaches the DOM in its raw form.
test("MessageButton: an RPC failure stays visible and retryable, and never navigates", async () => {
  let attempt = 0;
  createOrGetDirectConversationImpl = async () => {
    attempt += 1;
    if (attempt === 1) throw new Error("This conversation is unavailable. Please try again.");
    return CONVO_ID;
  };
  createOrGetDirectConversationCalls.length = 0;

  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/profile/other"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/profile/other", element: React.createElement(MessageButton, { userId: OTHER_USER_ID, blocked: false }) }),
          React.createElement(Route, { path: "/messages/:conversationId", element: React.createElement("div", null, "THREAD") })
        )
      )
    );
  });
  const container = document.getElementById("root");
  const button = container.querySelector("button");

  await React.act(async () => { button.click(); });
  await flush();
  assert.match(container.textContent, /This conversation is unavailable\. Please try again\./);
  assert.doesNotMatch(container.textContent, /THREAD/);
  assert.equal(button.disabled, false, "must be retryable after a failure");

  await React.act(async () => { button.click(); });
  await flush();
  assert.equal(createOrGetDirectConversationCalls.length, 2);
  assert.match(document.getElementById("root").textContent, /THREAD/, "a retried, now-successful RPC must navigate");
});

// ==========================================================================
// PublicProfileRoute gating: own profile never shows it; a guest is
// directed to sign in rather than the RPC ever being invoked.
// ==========================================================================

async function mountProfile(path, routeUserId = OTHER_USER_ID) {
  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/profile/:userId", element: React.createElement(PublicProfileRoute) }),
          React.createElement(Route, { path: "/profile", element: React.createElement("div", null, "OWN PROFILE") })
        )
      )
    );
  });
  return document.getElementById("root");
}

test("PublicProfileRoute: viewing your own profile never renders the Message action", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  const container = await mountProfile(`/profile/${AUTH_USER_ID}`);
  await flush();
  assert.match(container.textContent, /OWN PROFILE/, "must redirect to /profile rather than rendering the public view for yourself");
  assert.equal(container.querySelectorAll("button").length, 0, "no Message/Follow/Connect action can render on a redirected-away page");
});

test("PublicProfileRoute: a guest sees a sign-in prompt and never invokes createOrGetDirectConversation", async () => {
  authState = { status: "guest" };
  createOrGetDirectConversationCalls.length = 0;
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  assert.match(container.textContent, /follow, connect, or message/i);
  assert.ok(container.querySelector('a[href="/auth"]'));
  assert.doesNotMatch(container.textContent, /^Message$/m);
  assert.equal(createOrGetDirectConversationCalls.length, 0);
});

test("PublicProfileRoute: an authenticated viewer on someone else's profile sees the Message action", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  const messageButton = [...container.querySelectorAll("button")].find((b) => /^Message$/.test(b.textContent.trim()));
  assert.ok(messageButton, "expected a Message action on another member's profile");
});
