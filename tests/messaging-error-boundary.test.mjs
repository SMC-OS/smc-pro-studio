import { test, mock, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice C.1: end-to-end proof that the confirmed QA issue (a raw
// database/RPC error — including the internal function name
// create_direct_conversation, or raw RLS/policy text on a blocked send —
// reaching the rendered DOM) cannot happen. Unlike message-button.test.mjs
// and conversation-route.test.mjs, which mock messagingClient.ts itself
// (and so only prove the *component's* error/retry contract), this file
// mocks one layer lower — supabaseClient.ts, the same layer
// messaging-client.test.mjs mocks — so the REAL createOrGetDirectConversation/
// fetchMessages/sendMessage normalization in messagingClient.ts runs and
// feeds the REAL MessageButton/ThreadView components. This is what actually
// proves a raw backend error can never reach the DOM, not just that the
// component renders whatever string it's handed.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
    SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { MessageButton } = await import(new URL("../src/social/components/MessageButton.tsx", import.meta.url).href);
const { ThreadView } = await import(new URL("../src/social/components/messaging/ThreadView.tsx", import.meta.url).href);

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "b0000000-0000-0000-0000-000000000002";
const CONVO_ID = "c0000000-0000-0000-0000-000000000001";

function authUser(userId = AUTH_USER_ID) {
  return { getUser: async () => ({ data: { user: { id: userId } }, error: null }) };
}

let currentRoot = null;

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  currentRoot = createRoot(container);
  return currentRoot;
}

async function flush(ms = 50) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

// A string that must never appear anywhere in the rendered output for any
// of these tests — real internal names, an RLS/policy phrase, and a real
// Postgres SQLSTATE, none of which are ever safe to show a user.
const FORBIDDEN_FRAGMENTS = [
  "create_direct_conversation",
  "messages_member_insert",
  "row-level security",
  "P0001",
  "42501",
  "policy",
  "SQLSTATE",
];

function assertNoRawBackendText(container) {
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    assert.ok(!container.textContent.includes(fragment), `rendered text must not contain raw backend fragment ${JSON.stringify(fragment)}`);
    assert.ok(!container.innerHTML.includes(fragment), `rendered DOM markup must not serialize raw backend fragment ${JSON.stringify(fragment)}`);
  }
}

// ==========================================================================
// MessageButton — createOrGetDirectConversation's real normalization.
// ==========================================================================

test("MessageButton (real service layer): a blocked-pair RPC error renders only the safe message and never navigates", async () => {
  currentClient = {
    auth: authUser(),
    rpc: async () => ({
      data: null,
      error: {
        message: "create_direct_conversation: this conversation is not available",
        code: "P0001",
        details: "blocked by conversation_has_blocked_participant policy check",
      },
    }),
  };

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

  await React.act(async () => {
    button.click();
  });
  await flush();

  assert.match(container.textContent, /This conversation is unavailable\. Please try again\./);
  assert.doesNotMatch(container.textContent, /THREAD/, "must never navigate on a blocked/RPC failure");
  assertNoRawBackendText(container);
});

// ==========================================================================
// ThreadView — fetchMessages' real normalization on the initial load.
// ==========================================================================

// Phase 4 Slice G: ThreadView also queries `conversation_members` (its own
// read-only block-state lookup for the counterpart — see
// fetchConversationCounterpart in messagingClient.ts) alongside `messages`.
// Returning a genuinely empty result for it here resolves to "no
// counterpart found", which fetchMyBlockState is then never even called
// for — exactly the same "unknown, stay silent" outcome as any other
// own-block-state lookup failure, and irrelevant to what these two tests
// are actually proving (fetchMessages'/sendMessage's own normalization).
function emptyBuilder() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    neq: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
  };
  return builder;
}

function messagesSelectClient({ error }) {
  return {
    auth: authUser(),
    from: (table) => {
      if (table === "conversation_members") return emptyBuilder();
      assert.equal(table, "messages");
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        then: (resolve, reject) => Promise.resolve({ data: null, error }).then(resolve, reject),
      };
      return builder;
    },
  };
}

test("ThreadView (real service layer): an RLS rejection on the initial load renders only the safe message, not raw RLS/policy text", async () => {
  currentClient = messagesSelectClient({
    error: {
      message: "permission denied for table messages",
      code: "42501",
      details: "Failing row violates policy messages_member_insert",
    },
  });

  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ThreadView, { conversationId: CONVO_ID, authUserId: AUTH_USER_ID })
      )
    );
  });
  await flush();

  const container = document.getElementById("root");
  assert.match(container.textContent, /This conversation could not be loaded\. Please try again\./);
  assertNoRawBackendText(container);
});

// ==========================================================================
// ThreadView — sendMessage's real normalization, including the blocked-send
// case, plus draft preservation on failure.
// ==========================================================================

function blockedSendClient() {
  const insertCalls = [];
  return {
    calls: insertCalls,
    client: {
      auth: authUser(),
      from: (table) => {
        if (table === "conversation_members") return emptyBuilder();
        assert.equal(table, "messages");
        const selectBuilder = {
          select: () => selectBuilder,
          eq: () => selectBuilder,
          order: () => selectBuilder,
          limit: () => selectBuilder,
          then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
          insert: (payload) => {
            insertCalls.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: null,
                  error: {
                    message: 'new row violates row-level security policy for table "messages"',
                    code: "42501",
                    details: "Failing row violates policy messages_member_insert",
                  },
                }),
              }),
            };
          },
        };
        return selectBuilder;
      },
    },
  };
}

test("ThreadView (real service layer): a blocked send preserves the draft and renders only the safe send message, not raw RLS/policy text", async () => {
  const { client, calls } = blockedSendClient();
  currentClient = client;

  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ThreadView, { conversationId: CONVO_ID, authUserId: AUTH_USER_ID })
      )
    );
  });
  await flush();

  const container = document.getElementById("root");
  const textarea = container.querySelector("#message-draft");
  const form = textarea.closest("form");
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;

  await React.act(async () => {
    nativeSetter.call(textarea, "hello, are you there?");
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();

  assert.equal(calls.length, 1, "the blocked send must still count as exactly one attempt");
  assert.equal(textarea.value, "hello, are you there?", "the draft must be preserved after a blocked send");
  assert.match(container.textContent, /This message could not be sent\. Please try again\./);
  assertNoRawBackendText(container);
});

after(async () => {
  if (currentRoot) {
    await React.act(async () => {
      currentRoot.unmount();
    });
  }
});
