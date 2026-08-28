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

mock.module(authUrl, {
  exports: { useAuthSession: () => authState },
});

mock.module(messagingClientUrl, {
  exports: {
    fetchMyConversations: async () => [],
    fetchMessages: async (...args) => {
      fetchMessagesCalls.push(args);
      return fetchMessagesImpl(...args);
    },
    sendMessage: async (...args) => {
      sendMessageCalls.push(args);
      return sendMessageImpl(...args);
    },
    createOrGetDirectConversation: async () => {
      throw new Error("createOrGetDirectConversation must not be called from the thread screen");
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

test("the thread does not claim to be live", async () => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  const container = await mount(`/messages/${CONVO_1}`);
  await flush();
  assert.match(container.textContent, /isn't live/i);
  assert.ok(container.querySelector("button")?.textContent !== undefined);
  const refreshButton = [...container.querySelectorAll("button")].find((b) => /refresh/i.test(b.textContent));
  assert.ok(refreshButton, "expected an explicit Refresh control since there is no Realtime");
});
