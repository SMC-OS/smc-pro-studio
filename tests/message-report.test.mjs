import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice I: real-mount interaction coverage for "Report message" in
// ThreadView (ReportDialog's placement/gating on confirmed messages, and its
// isolation from pagination/Realtime/draft/block state), following this
// repo's existing jsdom + node:test module-mocking convention. Mounts
// ThreadView directly (it takes conversationId/authUserId as plain props,
// no route param dependency) rather than the full ConversationRoute +
// MessagingLayout tree tests/conversation-route.test.mjs already covers in
// depth for pagination/Realtime/read-state mechanics — this file is only
// about the new reporting behavior layered on top of that.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
Object.defineProperty(dom.window.HTMLElement.prototype, "offsetParent", {
  get() {
    return this.isConnected ? dom.window.document.body : null;
  },
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let liveDocumentKeydownListeners = 0;
const realDocAddEventListener = dom.window.document.addEventListener.bind(dom.window.document);
const realDocRemoveEventListener = dom.window.document.removeEventListener.bind(dom.window.document);
dom.window.document.addEventListener = function instrumentedAddEventListener(type, ...rest) {
  if (type === "keydown") liveDocumentKeydownListeners += 1;
  return realDocAddEventListener(type, ...rest);
};
dom.window.document.removeEventListener = function instrumentedRemoveEventListener(type, ...rest) {
  if (type === "keydown") liveDocumentKeydownListeners = Math.max(0, liveDocumentKeydownListeners - 1);
  return realDocRemoveEventListener(type, ...rest);
};

const messagingClientUrl = new URL("../src/social/services/messagingClient.ts", import.meta.url).href;
const reportingClientUrl = new URL("../src/social/services/reportingClient.ts", import.meta.url).href;

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "b0000000-0000-0000-0000-000000000002";
const CONVO_1 = "c0000000-0000-0000-0000-000000000001";
const CONVO_2 = "c0000000-0000-0000-0000-000000000002";
const RECEIPT_ID = "f1000000-0000-0000-0000-000000000001";

function msg(id, senderId, body, isoTime, conversationId = CONVO_1) {
  return { id, conversation_id: conversationId, sender_id: senderId, body, created_at: isoTime };
}

let fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
let fetchConversationCounterpartImpl = async () => OTHER_USER_ID;
let fetchMyBlockStateImpl = async () => false;
let markConversationReadImpl = async (conversationId, messageId) => ({
  conversationId,
  userId: AUTH_USER_ID,
  lastReadMessageId: messageId,
  lastReadMessageCreatedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
let subscribeToConversationMessagesImpl = null;
const subscriptions = [];

mock.module(messagingClientUrl, {
  exports: {
    fetchMessages: async (...args) => fetchMessagesImpl(...args),
    sendMessage: async () => {
      throw new Error("sendMessage not exercised in this file");
    },
    markConversationRead: async (...args) => markConversationReadImpl(...args),
    fetchConversationCounterpart: async (...args) => fetchConversationCounterpartImpl(...args),
    fetchMyBlockState: async (...args) => fetchMyBlockStateImpl(...args),
    subscribeToConversationMessages: async (conversationId, handlers, options) => {
      if (subscribeToConversationMessagesImpl) return subscribeToConversationMessagesImpl(conversationId, handlers, options);
      const call = { conversationId, handlers, options, cleanedUp: false };
      subscriptions.push(call);
      return () => {
        call.cleanedUp = true;
      };
    },
  },
});

let submitMessageReportImpl = async (messageId, category) => ({ id: RECEIPT_ID, targetKind: "message", category, createdAt: "2026-01-01T00:00:00.000Z" });
const submitMessageReportCalls = [];

mock.module(reportingClientUrl, {
  exports: {
    REPORT_CATEGORIES: ["spam", "harassment", "hate_or_abuse", "threat_or_violence", "sexual_content", "impersonation", "scam_or_fraud", "other"],
    REPORT_DETAILS_MAX_LENGTH: 1000,
    // Must replicate the real class's (operation, message, options) shape —
    // a bare `extends Error {}` stand-in would forward all three positional
    // args straight to Error's own (message, options) constructor, silently
    // making `operation` the `.message` instead. See reportingClient.ts's
    // own ReportingOperationError for the authoritative shape.
    ReportingOperationError: class ReportingOperationError extends Error {
      constructor(operation, message, options) {
        super(message, options);
        this.name = "ReportingOperationError";
        this.operation = operation;
      }
    },
    submitProfileReport: async () => {
      throw new Error("submitProfileReport not exercised in this file");
    },
    submitMessageReport: async (...args) => {
      submitMessageReportCalls.push(args);
      return submitMessageReportImpl(...args);
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { ThreadView } = await import(new URL("../src/social/components/messaging/ThreadView.tsx", import.meta.url).href);

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
  if (currentRoot) {
    await React.act(async () => {
      currentRoot.unmount();
    });
    currentRoot = null;
  }
  assert.equal(liveDocumentKeydownListeners, 0, "a document-level keydown listener leaked past this test's unmount");
});

async function flush(ms = 50) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function mountThread(conversationId = CONVO_1, authUserId = AUTH_USER_ID) {
  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(MemoryRouter, null, React.createElement(ThreadView, { key: conversationId, conversationId, authUserId }))
    );
  });
  return document.getElementById("root");
}

// For a genuine within-one-root "switch" (real conversation/identity change),
// rather than mounting a second independent React root — a second
// `createRoot` without unmounting the first would leave the first tree's own
// effects (including a still-open ReportDialog's document keydown listener)
// dangling forever, since removing a DOM node does not itself run React's
// cleanup. This mirrors ConversationRoute.tsx's real `key={conversationId}`
// remount contract inside a single root, the same way
// tests/block-button.test.mjs's own stale-navigation test switches profiles
// via in-root navigation rather than a second createRoot.
function ThreadHost({ initial, controllerRef }) {
  const [params, setParams] = React.useState(initial);
  controllerRef.current = setParams;
  return React.createElement(ThreadView, { key: params.conversationId, conversationId: params.conversationId, authUserId: params.authUserId });
}

async function mountSwitchableThread(initialConversationId, initialAuthUserId) {
  const controllerRef = { current: null };
  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ThreadHost, { initial: { conversationId: initialConversationId, authUserId: initialAuthUserId }, controllerRef })
      )
    );
  });
  return { get container() { return document.getElementById("root"); }, switchTo: (conversationId, authUserId) => controllerRef.current({ conversationId, authUserId }) };
}

function reportButtonsIn(container) {
  return [...container.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Report message");
}

function resetAll() {
  fetchMessagesImpl = async () => ({ messages: [], nextCursor: null });
  fetchConversationCounterpartImpl = async () => OTHER_USER_ID;
  fetchMyBlockStateImpl = async () => false;
  markConversationReadImpl = async (conversationId, messageId) => ({
    conversationId,
    userId: AUTH_USER_ID,
    lastReadMessageId: messageId,
    lastReadMessageCreatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  subscribeToConversationMessagesImpl = null;
  subscriptions.length = 0;
  submitMessageReportImpl = async (messageId, category) => ({ id: RECEIPT_ID, targetKind: "message", category, createdAt: "2026-01-01T00:00:00.000Z" });
  submitMessageReportCalls.length = 0;
}

const nativeTextareaSetter = () => Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;

function typeInto(textarea, value) {
  nativeTextareaSetter().call(textarea, value);
  textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function openReport(button) {
  await React.act(async () => {
    button.click();
  });
}

async function chooseCategoryAndSubmit(container, category = "spam", details) {
  const select = container.querySelector('[role="dialog"] select');
  await React.act(async () => {
    select.value = category;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    if (details !== undefined) typeInto(container.querySelector('[role="dialog"] textarea'), details);
  });
  await React.act(async () => {
    container.querySelector('[role="dialog"] button[type="submit"]').click();
  });
}

// ==========================================================================
// Placement/gating: only the other participant's confirmed messages.
// ==========================================================================

test("Report message appears only on the other participant's messages, never on the caller's own", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({
    messages: [
      msg("m1", AUTH_USER_ID, "hi there", "2026-01-01T00:00:01.000Z"),
      msg("m2", OTHER_USER_ID, "hello back", "2026-01-01T00:00:02.000Z"),
      msg("m3", AUTH_USER_ID, "how are you", "2026-01-01T00:00:03.000Z"),
    ],
    nextCursor: null,
  });
  const container = await mountThread();
  await flush();
  const reportButtons = reportButtonsIn(container);
  assert.equal(reportButtons.length, 1, "exactly one Report message action — only for the other participant's message");
});

test("a conversation with only the caller's own messages shows no Report message action at all", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({
    messages: [msg("m1", AUTH_USER_ID, "just me", "2026-01-01T00:00:01.000Z")],
    nextCursor: null,
  });
  const container = await mountThread();
  await flush();
  assert.equal(reportButtonsIn(container).length, 0);
});

test("Report message is bound only to message.id — no sender or conversation id is ever sent to the reporting service", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({
    messages: [msg("m-target", OTHER_USER_ID, "reportable", "2026-01-01T00:00:02.000Z")],
    nextCursor: null,
  });
  const container = await mountThread();
  await flush();
  await openReport(reportButtonsIn(container)[0]);
  await chooseCategoryAndSubmit(container, "spam");
  await flush();
  assert.equal(submitMessageReportCalls.length, 1);
  assert.equal(submitMessageReportCalls[0][0], "m-target", "must bind to the exact confirmed message id");
  assert.equal(submitMessageReportCalls[0].length <= 3, true);
  // submitMessageReport's own signature is (messageId, category, details) —
  // there is no fourth positional argument through which a conversation or
  // sender id could ever be smuggled.
});

test("a message from an already-blocked sender remains reportable", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => true; // caller has blocked the counterpart
  fetchMessagesImpl = async () => ({
    messages: [msg("m1", OTHER_USER_ID, "blocked sender's message", "2026-01-01T00:00:02.000Z")],
    nextCursor: null,
  });
  const container = await mountThread();
  await flush();
  assert.match(container.textContent, /You've blocked this person/, "sanity: block banner really is showing");
  const reportButtons = reportButtonsIn(container);
  assert.equal(reportButtons.length, 1);
  assert.equal(reportButtons[0].disabled, false, "reporting must remain available even though sending is disabled");
});

// ==========================================================================
// Pagination / Realtime: correct confirmed message id either way.
// ==========================================================================

test("an older message loaded via pagination gets the correct Report message binding", async () => {
  resetAll();
  const newerPage = { messages: [msg("m-new", OTHER_USER_ID, "newer", "2026-01-02T00:00:00.000Z")], nextCursor: { createdAt: "2026-01-02T00:00:00.000Z", id: "m-new" } };
  const olderPage = { messages: [msg("m-old", OTHER_USER_ID, "older", "2026-01-01T00:00:00.000Z")], nextCursor: null };
  let call = 0;
  fetchMessagesImpl = async (conversationId, cursor) => {
    call += 1;
    return cursor ? olderPage : newerPage;
  };
  const container = await mountThread();
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => /Load older messages/.test(b.textContent)).click();
  });
  await flush();

  const reportButtons = reportButtonsIn(container);
  assert.equal(reportButtons.length, 2, "both the newer and the older other-participant message must offer Report message");

  // Click the one attached to the older message specifically and confirm the
  // exact id reaches the service.
  await openReport(reportButtons.find((b) => b.closest("li")?.textContent.includes("older")));
  await chooseCategoryAndSubmit(container, "spam");
  await flush();
  assert.equal(submitMessageReportCalls[0][0], "m-old");
});

test("a Realtime-delivered message gets the correct Report message binding once it converges into the authoritative fetch", async () => {
  resetAll();
  let signalHandler = null;
  subscribeToConversationMessagesImpl = async (conversationId, handlers) => {
    signalHandler = handlers.onSignal;
    return () => {};
  };
  let realtimeMessageVisible = false;
  fetchMessagesImpl = async () => ({
    messages: realtimeMessageVisible ? [msg("m-live", OTHER_USER_ID, "just arrived", "2026-01-01T00:00:05.000Z")] : [],
    nextCursor: null,
  });
  const container = await mountThread();
  await flush();
  assert.equal(reportButtonsIn(container).length, 0);

  realtimeMessageVisible = true;
  await React.act(async () => {
    signalHandler?.();
    await new Promise((r) => setTimeout(r, 20));
  });
  await flush();

  const reportButtons = reportButtonsIn(document.getElementById("root"));
  assert.equal(reportButtons.length, 1);
  await openReport(reportButtons[0]);
  await chooseCategoryAndSubmit(document.getElementById("root"), "spam");
  await flush();
  assert.equal(submitMessageReportCalls[0][0], "m-live", "the Realtime-converged message's real confirmed id must be what gets reported, never a raw payload guess");
});

// ==========================================================================
// Isolation: reporting must not disturb ordering/content/draft/block state.
// ==========================================================================

test("submitting a report changes nothing about message ordering or content, the draft, or block state", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({
    messages: [msg("m1", OTHER_USER_ID, "first", "2026-01-01T00:00:01.000Z"), msg("m2", AUTH_USER_ID, "second", "2026-01-01T00:00:02.000Z")],
    nextCursor: null,
  });
  const container = await mountThread();
  await flush();

  const draft = container.querySelector("#message-draft");
  await React.act(async () => {
    typeInto(draft, "still typing this");
  });

  const messagesBefore = [...container.querySelectorAll("li p.whitespace-pre-wrap")].map((p) => p.textContent);
  const composerDisabledBefore = container.querySelector('button[aria-label="Send message"]').disabled;

  await openReport(reportButtonsIn(container)[0]);
  await chooseCategoryAndSubmit(container, "spam", "some details");
  await flush();

  const after = document.getElementById("root");
  const messagesAfter = [...after.querySelectorAll("li p.whitespace-pre-wrap")].map((p) => p.textContent);
  assert.deepEqual(messagesAfter, messagesBefore, "message list content/order must be unchanged by reporting");
  assert.equal(after.querySelector("#message-draft").value, "still typing this", "the draft must survive reporting untouched");
  assert.equal(
    after.querySelector('button[aria-label="Send message"]').disabled,
    composerDisabledBefore,
    "reporting must never itself send, block, or otherwise change composer state"
  );
});

test("reporting never removes, hides, or blurs the reported message", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "visible content", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mountThread();
  await flush();
  await openReport(reportButtonsIn(container)[0]);
  await chooseCategoryAndSubmit(container, "spam");
  await flush();
  assert.match(document.getElementById("root").textContent, /visible content/, "the reported message's own content must remain fully visible");
});

// ==========================================================================
// Success / failure copy and behavior.
// ==========================================================================

test("success is shown only after a confirmed receipt and never exposes the receipt id or claims punishment", async () => {
  resetAll();
  let resolveSubmit;
  submitMessageReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "message", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "text", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mountThread();
  await flush();
  await openReport(reportButtonsIn(container)[0]);
  const select = container.querySelector('[role="dialog"] select');
  await React.act(async () => {
    select.value = "spam";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    container.querySelector('[role="dialog"] button[type="submit"]').click();
  });
  await flush(10);
  assert.doesNotMatch(document.getElementById("root").textContent, /Report received/, "must not claim success before the RPC resolves");

  await React.act(async () => {
    resolveSubmit();
    await new Promise((r) => setTimeout(r, 20));
  });
  const finalText = document.getElementById("root").textContent;
  assert.match(finalText, /Report received/);
  assert.doesNotMatch(finalText, new RegExp(RECEIPT_ID));
  assert.doesNotMatch(finalText, /remov|delet|banned|suspend|block(ed)?|resolved/i);
});

// Copilot finding (Issue 1, merged Slice I) — see profile-report.test.mjs's
// identical test for the full rationale. Proven here too since ReportDialog
// is mounted fresh per message inside ThreadView, with its own distinct
// trigger; this confirms the fix holds through the message-reporting route
// as well, not only the profile route.
test("focus moves to the success view's Close button only after a confirmed RPC receipt, never before, and closing restores focus to the Report message trigger", async () => {
  resetAll();
  let resolveSubmit;
  submitMessageReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "message", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "text", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mountThread();
  await flush();
  const trigger = reportButtonsIn(container)[0];
  await React.act(async () => {
    trigger.focus();
    trigger.click();
  });
  const select = container.querySelector('[role="dialog"] select');
  await React.act(async () => {
    select.value = "spam";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  const submitButton = container.querySelector('[role="dialog"] button[type="submit"]');
  await React.act(async () => {
    submitButton.focus();
    submitButton.click();
  });
  await flush(10);

  assert.doesNotMatch(document.getElementById("root").textContent, /Report received/, "success must not appear before the RPC resolves");
  assert.equal(
    [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent.trim() === "Close"),
    undefined,
    "no Close control can exist before a confirmed receipt"
  );
  assert.ok(document.activeElement === submitButton, "focus must still be on the submit control while the RPC is pending — never moved early");

  await React.act(async () => {
    resolveSubmit();
    await new Promise((r) => setTimeout(r, 20));
  });

  const rootAfterSuccess = document.getElementById("root");
  assert.match(rootAfterSuccess.textContent, /Report received/, "sanity: the success view is now showing");
  const closeButton = [...rootAfterSuccess.querySelectorAll("button")].find((b) => b.textContent.trim() === "Close");
  assert.ok(closeButton, "expected the success view's own Close button");
  assert.ok(document.activeElement === closeButton, "focus must move to the confirmed-success Close button, not be stranded on the removed submit button");

  await React.act(async () => {
    closeButton.click();
  });
  await flush(10);
  const rootAfterClose = document.getElementById("root");
  assert.equal(rootAfterClose.querySelector('[role="dialog"]'), null, "dialog must close");
  assert.ok(document.activeElement === trigger, "focus must be restored to the original Report message trigger after Close");
});

test("a failed report submission preserves the chosen category and details", async () => {
  resetAll();
  submitMessageReportImpl = async () => {
    throw new Error("We couldn't submit this report. Please try again.");
  };
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "text", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mountThread();
  await flush();
  await openReport(reportButtonsIn(container)[0]);
  await chooseCategoryAndSubmit(container, "harassment", "kept happening");
  await flush();
  assert.match(container.textContent, /We couldn't submit this report\. Please try again\./);
  assert.equal(container.querySelector('[role="dialog"] select').value, "harassment");
  assert.equal(container.querySelector('[role="dialog"] textarea').value, "kept happening");
});

test("no raw PostgREST/RLS/constraint/function text ever reaches the DOM on a report failure", async () => {
  resetAll();
  const { ReportingOperationError } = await import(reportingClientUrl);
  submitMessageReportImpl = async () => {
    throw new ReportingOperationError("submit_message_report", "We couldn't submit this report. Please try again.", {
      cause: { message: "new row violates row-level security policy for table \"reports\"", code: "42501" },
    });
  };
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "text", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mountThread();
  await flush();
  await openReport(reportButtonsIn(container)[0]);
  await chooseCategoryAndSubmit(container, "spam");
  await flush();
  const text = document.getElementById("root").textContent;
  assert.match(text, /We couldn't submit this report\. Please try again\./);
  for (const rawFragment of ["row-level security", "42501", "submit_message_report", "reports_", "constraint", "PostgREST"]) {
    assert.ok(!text.includes(rawFragment), `must never leak raw fragment ${JSON.stringify(rawFragment)}`);
  }
});

// ==========================================================================
// Stale-response protection across conversation/auth changes.
// ==========================================================================

test("switching conversations (a fresh ThreadView mount) discards a previous conversation's pending report result", async () => {
  resetAll();
  let resolveSubmit;
  submitMessageReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "message", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });
  fetchMessagesImpl = async (conversationId) => ({
    messages: [msg(conversationId === CONVO_1 ? "m-convo1" : "m-convo2", OTHER_USER_ID, `text for ${conversationId}`, "2026-01-01T00:00:01.000Z", conversationId)],
    nextCursor: null,
  });

  const thread = await mountSwitchableThread(CONVO_1, AUTH_USER_ID);
  await flush();
  await openReport(reportButtonsIn(thread.container)[0]);
  const select = thread.container.querySelector('[role="dialog"] select');
  await React.act(async () => {
    select.value = "spam";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    thread.container.querySelector('[role="dialog"] button[type="submit"]').click();
  });
  await flush(10); // conversation 1's submission is now pending

  // A genuine key={conversationId} remount within the same root — exactly
  // ConversationRoute.tsx's real contract for a conversation switch.
  await React.act(async () => {
    thread.switchTo(CONVO_2, AUTH_USER_ID);
  });
  await flush();
  assert.doesNotMatch(thread.container.textContent, /Report received/, "a fresh conversation's ThreadView must never show a previous conversation's result");

  resolveSubmit?.();
  await flush();
  assert.doesNotMatch(thread.container.textContent, /Report received/, "the stale conversation's late resolution must never surface after switching");
});

test("switching the authenticated identity while viewing the same conversation clears a stale report result", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({ messages: [msg("m1", OTHER_USER_ID, "text", "2026-01-01T00:00:01.000Z")], nextCursor: null });

  const thread = await mountSwitchableThread(CONVO_1, AUTH_USER_ID);
  await flush();
  await openReport(reportButtonsIn(thread.container)[0]);
  await chooseCategoryAndSubmit(thread.container, "spam");
  await flush();
  assert.match(thread.container.textContent, /Report received/, "sanity: the first identity's report really did succeed");

  // Same conversationId, a different authenticated identity. ThreadView
  // itself isn't remounted by conversationId alone here, but each
  // ReportDialog instance is keyed on `${message.id}:${authUserId}` (see
  // ThreadView.tsx), so a fresh identity must still get a fresh dialog —
  // this exercises that inner key, not ThreadView's own outer remount.
  const OTHER_AUTH_USER_ID = "d0000000-0000-0000-0000-000000000004";
  await React.act(async () => {
    thread.switchTo(CONVO_1, OTHER_AUTH_USER_ID);
  });
  await flush();
  assert.doesNotMatch(thread.container.textContent, /Report received/, "a new authenticated identity must never inherit a previous identity's report result");
});

// ==========================================================================
// Dialog wiring smoke test (full accessibility contract already proven in
// tests/profile-report.test.mjs against the same shared ReportDialog).
// ==========================================================================

test("the message report dialog identifies itself as reporting a message, without exposing any raw id, and Escape restores focus to its own trigger", async () => {
  resetAll();
  fetchMessagesImpl = async () => ({ messages: [msg("m-abc123", OTHER_USER_ID, "text", "2026-01-01T00:00:01.000Z")], nextCursor: null });
  const container = await mountThread();
  await flush();
  const trigger = reportButtonsIn(container)[0];
  await React.act(async () => {
    trigger.focus();
    trigger.click();
  });
  const dialog = container.querySelector('[role="dialog"]');
  assert.match(dialog.textContent, /Report this message/i);
  assert.doesNotMatch(dialog.textContent, /m-abc123/, "the raw message id must never appear in the dialog's own text");

  await React.act(async () => {
    container.querySelector('[role="dialog"] button').dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush(10);
  assert.equal(container.querySelector('[role="dialog"]'), null);
  assert.ok(document.activeElement === trigger, "focus must return to this message's own Report trigger");
});
