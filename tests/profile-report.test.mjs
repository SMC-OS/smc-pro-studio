import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice I: real-mount interaction coverage for "Report profile" on
// PublicProfileRoute (ReportDialog's own accessibility contract, gating,
// stale-response protection, and coexistence with Message/Block), following
// this repo's existing jsdom + node:test module-mocking convention (see
// tests/block-button.test.mjs, which this file mirrors for its dialog
// instrumentation and stale-navigation pattern).

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
// ReportDialog's Tab-trap checks `active instanceof Node` (the same
// convention BlockButton.tsx's own dialog already uses) — real in a browser,
// but jsdom needs this wired explicitly like HTMLElement above.
globalThis.Node = dom.window.Node;
// jsdom performs no real layout, so `offsetParent` is always null — the exact
// signal ReportDialog's own focus-trap uses (mirroring BlockButton.tsx's
// identical convention) to distinguish a visible focusable control from a
// hidden one. In a real browser a rendered, undisabled dialog control always
// has a non-null offsetParent; this stand-in restores that real-world truth
// for this jsdom environment specifically (scoped to this file's own DOM
// instance only) so the Tab-trap's real logic — not a jsdom artifact — is
// what the test below actually exercises.
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

// Same instrumentation rationale as block-button.test.mjs: ReportDialog is
// the only component in this file that registers a document-level keydown
// listener (its own focus-trap/Escape handling), and a leaked one would
// silently keep firing across every subsequent test.
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

const authUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const messagingClientUrl = new URL("../src/social/services/messagingClient.ts", import.meta.url).href;
const socialClientUrl = new URL("../src/social/services/socialClient.ts", import.meta.url).href;
const reportingClientUrl = new URL("../src/social/services/reportingClient.ts", import.meta.url).href;

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "b0000000-0000-0000-0000-000000000002";
const THIRD_USER_ID = "c0000000-0000-0000-0000-000000000003";
const RECEIPT_ID = "f1000000-0000-0000-0000-000000000001";

let authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
let fetchMyBlockStateImpl = async () => false;

mock.module(authUrl, { exports: { useAuthSession: () => authState } });

mock.module(messagingClientUrl, {
  exports: {
    fetchMyConversations: async () => [],
    fetchMessages: async () => ({ messages: [], nextCursor: null }),
    sendMessage: async () => {
      throw new Error("sendMessage not exercised here");
    },
    createOrGetDirectConversation: async () => "convo-1",
    fetchMyBlockState: async (...args) => fetchMyBlockStateImpl(...args),
    blockUser: async () => {
      throw new Error("blockUser not exercised in this file");
    },
    unblockUser: async () => {
      throw new Error("unblockUser not exercised in this file");
    },
  },
});

function profileFor(userId, displayName) {
  return { profile: { id: userId, display_name: displayName, username: null, avatar_path: null, account_type: "customer", bio: null }, professional: null };
}

let fetchPublicProfileByIdImpl = async (userId) =>
  userId === OTHER_USER_ID ? profileFor(OTHER_USER_ID, "Jordan Rivera") : profileFor(THIRD_USER_ID, "Sam Okafor");

mock.module(socialClientUrl, {
  exports: {
    SocialUnavailableError: class SocialUnavailableError extends Error {},
    fetchPublicProfileById: async (userId) => fetchPublicProfileByIdImpl(userId),
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

let submitProfileReportImpl = async (reportedUserId, category) => ({ id: RECEIPT_ID, targetKind: "profile", category, createdAt: "2026-01-01T00:00:00.000Z" });
const submitProfileReportCalls = [];

mock.module(reportingClientUrl, {
  exports: {
    REPORT_CATEGORIES: ["spam", "harassment", "hate_or_abuse", "threat_or_violence", "sexual_content", "impersonation", "scam_or_fraud", "other"],
    REPORT_DETAILS_MAX_LENGTH: 1000,
    // Must replicate the real class's (operation, message, options) shape —
    // see reportingClient.ts's own ReportingOperationError.
    ReportingOperationError: class ReportingOperationError extends Error {
      constructor(operation, message, options) {
        super(message, options);
        this.name = "ReportingOperationError";
        this.operation = operation;
      }
    },
    submitProfileReport: async (...args) => {
      submitProfileReportCalls.push(args);
      return submitProfileReportImpl(...args);
    },
    submitMessageReport: async () => {
      throw new Error("submitMessageReport not exercised in this file");
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route, useNavigate } = await import("react-router-dom");
const { default: PublicProfileRoute } = await import(new URL("../src/social/routes/PublicProfileRoute.tsx", import.meta.url).href);

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

async function mountProfile(path) {
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

function findButton(container, text) {
  return [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
}

// React overrides the native textarea value setter to track programmatic vs
// user-driven changes, so a plain `.value = x` followed by dispatching
// "change" never reaches a controlled component's onChange under jsdom — the
// same nativeSetter + "input" event workaround this repo's own
// conversation-route.test.mjs/messaging-error-boundary.test.mjs already use
// for ThreadView's own draft textarea.
function typeInto(textarea, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  nativeSetter.call(textarea, value);
  textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function resetAll() {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  fetchMyBlockStateImpl = async () => false;
  submitProfileReportImpl = async (reportedUserId, category) => ({ id: RECEIPT_ID, targetKind: "profile", category, createdAt: "2026-01-01T00:00:00.000Z" });
  submitProfileReportCalls.length = 0;
  fetchPublicProfileByIdImpl = async (userId) =>
    userId === OTHER_USER_ID ? profileFor(OTHER_USER_ID, "Jordan Rivera") : profileFor(THIRD_USER_ID, "Sam Okafor");
}

async function openReportDialog(container) {
  await React.act(async () => {
    findButton(container, "Report profile").click();
  });
}

// ==========================================================================
// Guest / own-profile gating.
// ==========================================================================

test("a guest never sees Report profile and is directed to sign in instead", async () => {
  resetAll();
  authState = { status: "guest" };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  assert.equal(findButton(container, "Report profile"), undefined, "guests must never see the report action");
  assert.ok(container.querySelector('a[href="/auth"]'), "guest should be directed to the existing sign-in path");
  assert.equal(submitProfileReportCalls.length, 0);
});

test("viewing your own profile never renders Report profile", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${AUTH_USER_ID}`);
  await flush();
  assert.equal(container.querySelectorAll("button").length, 0, "own-profile view redirects away before any action can render");
});

// ==========================================================================
// Authenticated, another profile: the action exists and coexists with
// Message/Block/Unblock.
// ==========================================================================

test("an authenticated viewer on someone else's profile sees Report profile alongside Message and Block", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  assert.ok(findButton(container, "Report profile"));
  assert.ok(findButton(container, "Message"));
  assert.ok(findButton(container, "Block"));
});

test("a profile the caller has already blocked remains reportable — Report profile is never gated on block state", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => true;
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  assert.ok(findButton(container, "Unblock"), "sanity: block state really is confirmed blocked");
  const reportButton = findButton(container, "Report profile");
  assert.ok(reportButton, "Report profile must still be present when the profile is already blocked");
  assert.equal(reportButton.disabled, false);
});

test("Report profile is available even while the profile's block-state lookup is still loading", async () => {
  resetAll();
  let resolveBlockState;
  fetchMyBlockStateImpl = () => new Promise((resolve) => { resolveBlockState = () => resolve(false); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush(10);
  assert.ok(findButton(container, "Report profile"), "reporting is not conditioned on block-state resolution");
  await React.act(async () => {
    resolveBlockState();
    await new Promise((r) => setTimeout(r, 20));
  });
});

// ==========================================================================
// Submission: success only after a confirmed receipt, never optimistic.
// ==========================================================================

test("success is shown only after the RPC genuinely resolves — never before, never optimistically", async () => {
  resetAll();
  let resolveSubmit;
  submitProfileReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "profile", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);

  const categorySelect = container.querySelector("select");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  const submitButton = [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0];
  await React.act(async () => {
    submitButton.click();
  });
  await flush(10);
  assert.doesNotMatch(container.textContent, /Report received/, "must not claim success before the RPC resolves");
  assert.equal(submitButton.disabled, true, "must disable to prevent duplicate submission while pending");

  await React.act(async () => {
    resolveSubmit();
    await new Promise((r) => setTimeout(r, 20));
  });
  assert.match(document.getElementById("root").textContent, /Report received/, "must show the neutral confirmation once the RPC genuinely confirms");
  assert.doesNotMatch(document.getElementById("root").textContent, new RegExp(RECEIPT_ID), "the receipt's own id must never be exposed in the UI");
});

test("success copy is neutral — never claims punishment, removal, blocking, or resolution against the reported person", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const categorySelect = container.querySelector("select");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush();
  const dialogText = document.getElementById("root").querySelector('[role="dialog"]').textContent;
  assert.doesNotMatch(dialogText, /remov|delet|banned|suspend|block(ed)?|action has been taken|resolved/i);
  assert.match(dialogText, /review/i, "must state only that the report was received for review");
});

test("a duplicate-pending submission still shows the same neutral confirmed result, never claiming a new report was created", async () => {
  resetAll();
  submitProfileReportImpl = async (reportedUserId, category) => ({ id: RECEIPT_ID, targetKind: "profile", category, createdAt: "2026-01-01T00:00:00.000Z" });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const categorySelect = container.querySelector("select");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Report received/);
  assert.doesNotMatch(document.getElementById("root").textContent, /new report|already reported|duplicate/i);
});

// ==========================================================================
// Failure: input preserved, relationship controls untouched.
// ==========================================================================

test("a failed submission preserves the chosen category and details, and leaves Message/Block state untouched", async () => {
  resetAll();
  submitProfileReportImpl = async () => {
    throw new Error("We couldn't submit this report. Please try again.");
  };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);

  const categorySelect = container.querySelector("select");
  const detailsField = container.querySelector("textarea");
  await React.act(async () => {
    categorySelect.value = "harassment";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    typeInto(detailsField, "This kept happening across posts.");
  });
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush();

  assert.match(container.textContent, /We couldn't submit this report\. Please try again\./);
  assert.equal(container.querySelector("select").value, "harassment", "category must survive a failed submission");
  assert.equal(container.querySelector("textarea").value, "This kept happening across posts.", "details must survive a failed submission");
  assert.ok(findButton(container, "Message"), "Message must remain present");
  assert.equal(findButton(container, "Message").disabled, false, "an unrelated report failure must never disable Message");
  assert.ok(findButton(container, "Block"), "Block must remain present and unaffected by a report failure");
});

test("repeated submit clicks while pending are prevented — exactly one submitProfileReport call", async () => {
  resetAll();
  let resolveSubmit;
  submitProfileReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "profile", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const categorySelect = container.querySelector("select");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  const submitButton = [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0];
  await React.act(async () => {
    submitButton.click();
  });
  await React.act(async () => {
    submitButton.click(); // no-op: disabled while pending
  });
  await flush(10);
  assert.equal(submitProfileReportCalls.length, 1, "a second click while pending must not start a second request");
  await React.act(async () => {
    resolveSubmit();
    await new Promise((r) => setTimeout(r, 20));
  });
});

// ==========================================================================
// Client-side validation before any RPC call.
// ==========================================================================

test("submitting with no category chosen shows a validation message and never calls the RPC", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush(10);
  assert.match(container.textContent, /Choose a reason/);
  assert.equal(submitProfileReportCalls.length, 0);
});

test("category 'other' with empty details is rejected before any RPC call", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const categorySelect = container.querySelector("select");
  await React.act(async () => {
    categorySelect.value = "other";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush(10);
  assert.match(container.textContent, /Details are required/);
  assert.equal(submitProfileReportCalls.length, 0);
});

test("whitespace-only details are rejected before any RPC call", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const categorySelect = container.querySelector("select");
  const detailsField = container.querySelector("textarea");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    typeInto(detailsField, "   ");
  });
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush(10);
  assert.match(container.textContent, /can't be just spaces/);
  assert.equal(submitProfileReportCalls.length, 0);
});

// ==========================================================================
// Dialog accessibility: labeling, initial focus, Tab trap, Escape.
// ==========================================================================

test("the dialog has correct labeling/description and shows the details limit", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const dialog = container.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  const labelledBy = dialog.getAttribute("aria-labelledby");
  const describedBy = dialog.getAttribute("aria-describedby");
  assert.ok(labelledBy && document.getElementById(labelledBy), "aria-labelledby must reference a real element");
  assert.ok(describedBy && document.getElementById(describedBy), "aria-describedby must reference a real element");
  assert.match(dialog.textContent, /1000/, "the details limit must be visible");
});

test("initial focus lands on Cancel, Escape closes and restores focus to the trigger, and Escape never submits", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  const trigger = findButton(container, "Report profile");
  await React.act(async () => {
    trigger.focus();
    trigger.click();
  });
  const cancelButton = findButton(container, "Cancel");
  assert.ok(document.activeElement === cancelButton, "initial focus must land on Cancel, the least-destructive control");

  await React.act(async () => {
    cancelButton.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush(10);
  assert.equal(container.querySelector('[role="dialog"]'), null, "Escape must close the dialog when not submitting");
  assert.equal(submitProfileReportCalls.length, 0, "Escape must never submit a report");
  assert.ok(document.activeElement === trigger, "focus must return to the trigger after Escape");
});

test("Escape is inert while a submission is in flight", async () => {
  resetAll();
  let resolveSubmit;
  submitProfileReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "profile", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const categorySelect = container.querySelector("select");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    [...container.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush(10);
  await React.act(async () => {
    container.querySelector('[role="dialog"]').dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush(10);
  assert.ok(container.querySelector('[role="dialog"]'), "Escape must not close the dialog while a submission is pending");
  await React.act(async () => {
    resolveSubmit();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("Tab wraps focus within the dialog (a focus trap) rather than escaping to the page", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  const dialog = container.querySelector('[role="dialog"]');
  const focusable = [...dialog.querySelectorAll("button:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
  const last = focusable[focusable.length - 1];
  await React.act(async () => {
    last.focus();
  });
  await React.act(async () => {
    last.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  });
  assert.ok(document.activeElement === focusable[0], "Tab from the last focusable control must wrap to the first");
});

test("unmounting while the dialog is still open removes the document-level keydown listener", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await openReportDialog(container);
  assert.ok(container.querySelector('[role="dialog"]'));
  assert.equal(liveDocumentKeydownListeners, 1, "the open dialog's focus-trap listener must be live before unmount");
  await React.act(async () => {
    currentRoot.unmount();
  });
  currentRoot = null;
  assert.equal(liveDocumentKeydownListeners, 0, "unmounting with the dialog still open must still remove the listener");
});

// ==========================================================================
// Stale-response / cross-profile and cross-identity safety.
// ==========================================================================

test("a stale in-flight report result for a previous profile never appears after navigating to a different profile", async () => {
  resetAll();
  let resolveSubmit;
  submitProfileReportImpl = () => new Promise((resolve) => { resolveSubmit = () => resolve({ id: RECEIPT_ID, targetKind: "profile", category: "spam", createdAt: "2026-01-01T00:00:00.000Z" }); });

  function SwitchProfile() {
    const navigate = useNavigate();
    return React.createElement("button", { type: "button", onClick: () => navigate(`/profile/${THIRD_USER_ID}`) }, "Switch profile");
  }

  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/profile/${OTHER_USER_ID}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/profile/:userId",
            element: React.createElement(React.Fragment, null, React.createElement(SwitchProfile), React.createElement(PublicProfileRoute)),
          })
        )
      )
    );
  });
  await flush();

  const initialContainer = document.getElementById("root");
  await React.act(async () => {
    findButton(initialContainer, "Report profile").click();
  });
  const categorySelect = document.getElementById("root").querySelector("select");
  await React.act(async () => {
    categorySelect.value = "spam";
    categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await React.act(async () => {
    [...document.getElementById("root").querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush(10); // profile A's submission is now pending

  const switchButton = [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent === "Switch profile");
  await React.act(async () => {
    switchButton.click();
  });
  await flush();

  let container = document.getElementById("root");
  assert.match(container.textContent, /Sam Okafor/, "must now show profile B");
  assert.doesNotMatch(container.textContent, /Report received/, "profile B's fresh ReportDialog instance must not show profile A's pending/stale result");

  resolveSubmit?.();
  await flush();
  container = document.getElementById("root");
  assert.match(container.textContent, /Sam Okafor/, "must still show profile B");
  assert.doesNotMatch(container.textContent, /Report received/, "profile A's late-resolving submission must never surface on profile B");
});
