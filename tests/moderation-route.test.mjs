import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice J: real-mount interaction coverage for /moderation/reports
// (ModerationRoute + ReviewDialog) and the "Report review" discovery link
// on ProfileRoute, following this repo's existing jsdom + node:test
// module-mocking convention (see tests/profile-report.test.mjs, which this
// file mirrors for its dialog-instrumentation and stale-navigation
// patterns).

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

const authUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const moderationClientUrl = new URL("../src/social/services/moderationClient.ts", import.meta.url).href;

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const REPORT_ID_1 = "b1000000-0000-0000-0000-000000000001";
const REPORT_ID_2 = "b1000000-0000-0000-0000-000000000002";
const REPORT_ID_3 = "b1000000-0000-0000-0000-000000000003";

let authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };

let checkAccessImpl = async () => true;
const checkAccessCalls = [];

let fetchQueueImpl = async () => ({ items: [], nextCursor: null });
const fetchQueueCalls = [];

let reviewImpl = async (reportId, decision) => ({ reportId, status: decision, reviewedAt: "2026-01-01T00:00:00.000Z" });
const reviewCalls = [];

// Phase 4 Slice K.
let moderateImpl = async (reportId, action) => ({
  actionId: "c1000000-0000-0000-0000-000000000001",
  messageId: "d1000000-0000-0000-0000-000000000001",
  moderationStatus: action === "hide_message" ? "removed_by_moderator" : "visible",
  actedAt: "2026-01-01T00:00:00.000Z",
});
const moderateCalls = [];

// Phase 4 Slice L.
let listActionsImpl = async () => ({ items: [], nextCursor: null });
const listActionsCalls = [];

mock.module(authUrl, { exports: { useAuthSession: () => authState } });

mock.module(moderationClientUrl, {
  exports: {
    REVIEW_NOTE_MAX_LENGTH: 1000,
    ModerationOperationError: class ModerationOperationError extends Error {
      constructor(operation, message, options) {
        super(message, options);
        this.name = "ModerationOperationError";
        this.operation = operation;
      }
    },
    checkModeratorAccess: async (...args) => {
      checkAccessCalls.push(args);
      return checkAccessImpl(...args);
    },
    fetchModerationReports: async (...args) => {
      fetchQueueCalls.push(args);
      return fetchQueueImpl(...args);
    },
    reviewReport: async (...args) => {
      reviewCalls.push(args);
      return reviewImpl(...args);
    },
    moderateReportedMessage: async (...args) => {
      moderateCalls.push(args);
      return moderateImpl(...args);
    },
    listModerationActions: async (...args) => {
      listActionsCalls.push(args);
      return listActionsImpl(...args);
    },
  },
});

// ProfileRoute is mounted only by the "discovery link" section at the end
// of this file — mocked here regardless (module mocks must be registered
// before any dynamic import of the module graph that reaches them) so that
// section can exercise the real "Report review" link without touching the
// real (unmocked) socialClient.ts/authClient.ts, which would otherwise
// reach the real supabaseClient.ts and crash on `import.meta.env` outside
// a Vite context — the identical class of issue Slice I's own
// block-button.test.mjs/message-button.test.mjs/conversation-route.test.mjs
// already had to guard against for reportingClient.ts.
const socialClientUrl = new URL("../src/social/services/socialClient.ts", import.meta.url).href;
const authClientUrl = new URL("../src/services/authClient.ts", import.meta.url).href;

function ownProfileFor(userId) {
  return {
    id: userId,
    display_name: "Own User",
    username: null,
    avatar_path: null,
    account_type: "customer",
    bio: null,
    visibility: "public",
    onboarding_completed: true,
  };
}

mock.module(socialClientUrl, {
  exports: {
    fetchOwnProfile: async () => ownProfileFor(AUTH_USER_ID),
    fetchOwnProfessionalProfile: async () => {
      throw new Error("not a professional profile");
    },
  },
});

mock.module(authClientUrl, {
  exports: {
    signOut: async () => {},
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: ModerationRoute } = await import(new URL("../src/social/routes/ModerationRoute.tsx", import.meta.url).href);
const { default: ProfileRoute } = await import(new URL("../src/social/routes/ProfileRoute.tsx", import.meta.url).href);

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

async function mountModeration() {
  const root = freshRoot();
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ["/moderation/reports"] }, React.createElement(ModerationRoute)));
  });
  return document.getElementById("root");
}

function findButton(container, text) {
  return [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
}

function typeInto(textarea, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  nativeSetter.call(textarea, value);
  textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function queueItem(overrides = {}) {
  return {
    reportId: REPORT_ID_1,
    targetKind: "profile",
    category: "spam",
    details: "some details",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    reviewedAt: null,
    reviewedByDisplayName: null,
    reviewNote: null,
    reporterDisplayName: "Alice",
    reportedDisplayName: "Bob",
    messageBody: null,
    messageCreatedAt: null,
    // Phase 4 Slice K: always present in the real client shape (null for a
    // profile report).
    messageModerationStatus: null,
    ...overrides,
  };
}

// Phase 4 Slice L.
function actionHistoryItem(overrides = {}) {
  return {
    actionId: "c1000000-0000-0000-0000-000000000001",
    reportId: REPORT_ID_1,
    messageId: "d1000000-0000-0000-0000-000000000001",
    action: "hide_message",
    moderatorDisplayName: "Dave",
    reportCategory: "harassment",
    reportTargetKind: "message",
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function resetAll() {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  checkAccessImpl = async () => true;
  checkAccessCalls.length = 0;
  fetchQueueImpl = async () => ({ items: [], nextCursor: null });
  fetchQueueCalls.length = 0;
  reviewImpl = async (reportId, decision) => ({ reportId, status: decision, reviewedAt: "2026-01-01T00:00:00.000Z" });
  reviewCalls.length = 0;
  moderateImpl = async (reportId, action) => ({
    actionId: "c1000000-0000-0000-0000-000000000001",
    messageId: "d1000000-0000-0000-0000-000000000001",
    moderationStatus: action === "hide_message" ? "removed_by_moderator" : "visible",
    actedAt: "2026-01-01T00:00:00.000Z",
  });
  moderateCalls.length = 0;
  listActionsImpl = async () => ({ items: [], nextCursor: null });
  listActionsCalls.length = 0;
}

// ==========================================================================
// Guest / access gating.
// ==========================================================================

test("a guest sees a sign-in prompt and makes no queue call — checkModeratorAccess is never called either", async () => {
  resetAll();
  authState = { status: "guest" };
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /Sign in to access moderation/);
  assert.ok(container.querySelector('a[href="/auth"]'));
  assert.equal(checkAccessCalls.length, 0, "checkModeratorAccess must never be called for a guest");
  assert.equal(fetchQueueCalls.length, 0, "fetchModerationReports must never be called for a guest");
});

test("moderator-access loading never shows an empty-queue or denied state", async () => {
  resetAll();
  let resolveAccess;
  checkAccessImpl = () => new Promise((resolve) => { resolveAccess = () => resolve(true); });
  const container = await mountModeration();
  await flush(10);
  assert.doesNotMatch(container.textContent, /don't have access/);
  assert.doesNotMatch(container.textContent, /No pending reports/);
  assert.equal(fetchQueueCalls.length, 0, "the queue must never be fetched before access is confirmed");
  await React.act(async () => {
    resolveAccess();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("a confirmed non-moderator sees a neutral access-denied state, never an empty queue, and the queue is never fetched", async () => {
  resetAll();
  checkAccessImpl = async () => false;
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /don't have access/i);
  assert.doesNotMatch(container.textContent, /No pending reports/, "denial must never be worded like or confused with a genuine empty queue");
  assert.equal(fetchQueueCalls.length, 0, "fetchModerationReports must never be called for a confirmed non-moderator");
});

test("an access-check failure shows a safe error state with Retry, distinct from denial", async () => {
  resetAll();
  let calls = 0;
  checkAccessImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("We couldn't verify your access. Please try again.");
    return true;
  };
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /We couldn't verify your access\. Please try again\./);
  const retry = findButton(container, "Try again");
  assert.ok(retry);
  await React.act(async () => {
    retry.click();
  });
  await flush();
  assert.equal(calls, 2);
  assert.match(document.getElementById("root").textContent, /Report review/, "a successful retry must reveal the real workspace");
});

// ==========================================================================
// Queue: loading / empty / error / populated.
// ==========================================================================

test("queue loading never renders as an empty state", async () => {
  resetAll();
  let resolveQueue;
  fetchQueueImpl = () => new Promise((resolve) => { resolveQueue = () => resolve({ items: [], nextCursor: null }); });
  const container = await mountModeration();
  await flush(10);
  assert.doesNotMatch(container.textContent, /No pending reports/);
  await React.act(async () => {
    resolveQueue();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("a confirmed empty queue is shown honestly", async () => {
  resetAll();
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /No pending reports/);
});

test("a queue query failure shows a safe error state with Retry", async () => {
  resetAll();
  let calls = 0;
  fetchQueueImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("The moderation queue could not be loaded. Please try again.");
    return { items: [queueItem()], nextCursor: null };
  };
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /The moderation queue could not be loaded\. Please try again\./);
  const retry = findButton(container, "Try again");
  assert.ok(retry);
  await React.act(async () => {
    retry.click();
  });
  await flush();
  assert.equal(calls, 2);
  assert.match(document.getElementById("root").textContent, /Spam/, "a successful retry must reveal the real queue");
});

test("a populated queue renders category and target kind for each item", async () => {
  resetAll();
  fetchQueueImpl = async () => ({
    items: [queueItem({ reportId: REPORT_ID_1, category: "harassment", targetKind: "message" })],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /Harassment/);
  assert.match(container.textContent, /message/);
});

// Community Guidelines owner-review pass: the queue header links to the
// guidelines the moderator is expected to enforce against.
test("the queue header links to the Community Guidelines", async () => {
  resetAll();
  const container = await mountModeration();
  await flush();
  const guidelinesLink = [...container.querySelectorAll("a")].find((a) => a.textContent.trim() === "Community Guidelines");
  assert.ok(guidelinesLink, "a Community Guidelines link must be present in the queue header");
  assert.equal(guidelinesLink.getAttribute("href"), "/community-guidelines");
});

// ==========================================================================
// Filters do not mix or duplicate; pagination.
// ==========================================================================

test("switching the status filter fetches only that status and never mixes results", async () => {
  resetAll();
  fetchQueueImpl = async (status) => ({
    items: status === "pending" ? [queueItem({ reportId: REPORT_ID_1, category: "spam" })] : [queueItem({ reportId: REPORT_ID_2, category: "harassment", status })],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /Spam/);

  const resolvedTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Resolved");
  await React.act(async () => {
    resolvedTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Harassment/);
  assert.doesNotMatch(document.getElementById("root").textContent, /Spam/, "the pending item must not remain visible under the resolved filter");
  assert.equal(fetchQueueCalls.at(-1)[0], "resolved");
});

test("Load more appends a second page without duplicating or losing the first page's items", async () => {
  resetAll();
  let call = 0;
  fetchQueueImpl = async (status, cursor) => {
    call += 1;
    if (!cursor) {
      return { items: [queueItem({ reportId: REPORT_ID_1, category: "spam" })], nextCursor: { createdAt: "2026-01-01T00:00:00.000Z", id: REPORT_ID_1 } };
    }
    return { items: [queueItem({ reportId: REPORT_ID_2, category: "harassment" })], nextCursor: null };
  };
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /Spam/);
  const loadMore = findButton(container, "Load more");
  assert.ok(loadMore);
  await React.act(async () => {
    loadMore.click();
  });
  await flush();
  const finalText = document.getElementById("root").textContent;
  assert.match(finalText, /Spam/);
  assert.match(finalText, /Harassment/);
  assert.equal(call, 2);
  assert.equal(findButton(document.getElementById("root"), "Load more"), undefined, "no further page exists once nextCursor is null");
});

// ==========================================================================
// Stale-response protection.
// ==========================================================================

test("a stale queue response for a previous status filter cannot overwrite the newer filter's rendered state", async () => {
  resetAll();
  let resolvePending;
  let call = 0;
  fetchQueueImpl = (status) => {
    call += 1;
    if (call === 1) return new Promise((resolve) => { resolvePending = () => resolve({ items: [queueItem({ reportId: REPORT_ID_1, category: "spam" })], nextCursor: null }); });
    return Promise.resolve({ items: [queueItem({ reportId: REPORT_ID_2, category: "harassment", status })], nextCursor: null });
  };
  const container = await mountModeration();
  await flush(10); // pending's own fetch is now in flight

  const resolvedTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Resolved");
  await React.act(async () => {
    resolvedTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Harassment/, "the newer (resolved) filter's real result must render");

  resolvePending?.();
  await flush();
  assert.doesNotMatch(document.getElementById("root").textContent, /Spam/, "the stale pending fetch's late resolution must never appear once a newer filter is active");
});

test("a stale queue response for a previous authenticated identity cannot overwrite the newer identity's state", async () => {
  resetAll();
  let resolveFirst;
  let call = 0;
  fetchQueueImpl = () => {
    call += 1;
    if (call === 1) return new Promise((resolve) => { resolveFirst = () => resolve({ items: [queueItem({ reportId: REPORT_ID_1, category: "spam" })], nextCursor: null }); });
    return Promise.resolve({ items: [queueItem({ reportId: REPORT_ID_2, category: "impersonation" })], nextCursor: null });
  };
  const container = await mountModeration();
  await flush(10); // first identity's fetch is now in flight

  await React.act(async () => {
    authState = { status: "authenticated", session: { subject: "z9999999-0000-0000-0000-000000000009" } };
    // Re-render is triggered by the mocked useAuthSession returning a new
    // value on the next render pass — force one via a state-changing act.
    currentRoot.render(React.createElement(MemoryRouter, { initialEntries: ["/moderation/reports"] }, React.createElement(ModerationRoute)));
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Impersonation/);

  resolveFirst?.();
  await flush();
  assert.doesNotMatch(document.getElementById("root").textContent, /Spam/, "the previous identity's stale fetch must never surface after switching identities");
});

// ==========================================================================
// Evidence rendering: exact message only, plain text (never HTML).
// ==========================================================================

test("selecting a message report shows only its exact reported message, never surrounding conversation content", async () => {
  resetAll();
  fetchQueueImpl = async () => ({
    items: [
      queueItem({
        reportId: REPORT_ID_1,
        targetKind: "message",
        category: "threat_or_violence",
        messageBody: "This is the exact reported message.",
        messageCreatedAt: "2026-01-01T00:05:00.000Z",
      }),
    ],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Threat or violence")).click();
  });
  await flush(10);
  assert.match(document.getElementById("root").textContent, /This is the exact reported message\./);
});

test("message content is rendered as a plain text node — an HTML-looking payload never executes and appears only as literal text", async () => {
  resetAll();
  const payload = '<img src=x onerror="window.__xss = true">';
  fetchQueueImpl = async () => ({
    items: [queueItem({ reportId: REPORT_ID_1, targetKind: "message", messageBody: payload, messageCreatedAt: "2026-01-01T00:00:00.000Z" })],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Spam"))?.click();
  });
  await flush(10);
  const root = document.getElementById("root");
  assert.equal(window.__xss, undefined, "an injected onerror handler must never actually execute");
  const anyDdHasPayload = [...root.querySelectorAll("dd")].some((dd) => dd.textContent.includes("<img"));
  assert.ok(anyDdHasPayload, "the payload must appear as literal visible text, not be parsed as markup");
  assert.equal(root.querySelectorAll("img").length, 0, "no <img> element may ever be created from message content");
});

test("a profile report never shows a message body — no fabricated message content", async () => {
  resetAll();
  fetchQueueImpl = async () => ({ items: [queueItem({ reportId: REPORT_ID_1, targetKind: "profile", messageBody: null })], nextCursor: null });
  const container = await mountModeration();
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Spam"))?.click();
  });
  await flush(10);
  assert.doesNotMatch(document.getElementById("root").textContent, /Reported message/);
});

// ==========================================================================
// Actions only on pending; resolve/dismiss confirmed-only; duplicate prevention.
// ==========================================================================

test("Resolve/Dismiss actions appear only for a pending report — never for a resolved or dismissed one", async () => {
  resetAll();
  fetchQueueImpl = async () => ({
    items: [queueItem({ reportId: REPORT_ID_1, status: "resolved", reviewedByDisplayName: "Mod", reviewedAt: "2026-01-01T00:00:00.000Z" })],
    nextCursor: null,
  });
  const container = await mountModeration();
  await React.act(async () => {}); // let statusFilter default settle before switching
  const resolvedTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Resolved");
  await React.act(async () => {
    resolvedTab.click();
  });
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Spam"))?.click();
  });
  await flush(10);
  assert.equal(findButton(document.getElementById("root"), "Resolve"), undefined, "no Resolve action on an already-resolved report");
  assert.equal(findButton(document.getElementById("root"), "Dismiss"), undefined, "no Dismiss action either");
  assert.match(document.getElementById("root").textContent, /Resolved by Mod/);
});

async function mountWithPendingReport() {
  fetchQueueImpl = async () => ({ items: [queueItem({ reportId: REPORT_ID_1, category: "spam" })], nextCursor: null });
  const container = await mountModeration();
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Spam"))?.click();
  });
  await flush(10);
  return document.getElementById("root");
}

test("Resolve waits for a confirmed response before showing success or removing the item from the queue", async () => {
  resetAll();
  let resolveReview;
  reviewImpl = () => new Promise((resolve) => { resolveReview = () => resolve({ reportId: REPORT_ID_1, status: "resolved", reviewedAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Resolve").click();
  });
  const submit = [...document.getElementById("root").querySelectorAll('[role="dialog"] button[type="submit"]')][0];
  await React.act(async () => {
    submit.click();
  });
  await flush(10);
  assert.doesNotMatch(document.getElementById("root").textContent, /No automatic action was taken/, "must not claim success before the RPC resolves");
  assert.equal(reviewCalls.length, 1);

  await React.act(async () => {
    resolveReview();
    await new Promise((r) => setTimeout(r, 20));
  });
  assert.match(document.getElementById("root").textContent, /No automatic action was taken/);
});

test("success wording states only that the decision was recorded — never a warning, removal, suspension, block, or notification claim", async () => {
  resetAll();
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Dismiss").click();
  });
  await React.act(async () => {
    [...document.getElementById("root").querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush();
  const dialogText = document.getElementById("root").querySelector('[role="dialog"]').textContent;
  assert.doesNotMatch(dialogText, /warn|remov|suspend|block(ed)?|notif/i);
  assert.match(dialogText, /No automatic action was taken/);
});

test("a reviewed report is removed from the pending queue only after confirmation", async () => {
  resetAll();
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Resolve").click();
  });
  await React.act(async () => {
    [...document.getElementById("root").querySelectorAll('[role="dialog"] button[type="submit"]')][0].click();
  });
  await flush();
  await React.act(async () => {
    findButton(document.getElementById("root"), "Close").click();
  });
  await flush(10);
  assert.doesNotMatch(document.getElementById("root").textContent, /Spam/, "the resolved item must no longer appear in the pending queue view");
});

test("repeated submit clicks while pending are prevented — exactly one reviewReport call", async () => {
  resetAll();
  let resolveReview;
  reviewImpl = () => new Promise((resolve) => { resolveReview = () => resolve({ reportId: REPORT_ID_1, status: "dismissed", reviewedAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Dismiss").click();
  });
  const submit = [...document.getElementById("root").querySelectorAll('[role="dialog"] button[type="submit"]')][0];
  await React.act(async () => {
    submit.click();
  });
  await React.act(async () => {
    submit.click(); // no-op: disabled while pending
  });
  await flush(10);
  assert.equal(reviewCalls.length, 1);
  await React.act(async () => {
    resolveReview();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("a failed review preserves the note and keeps the report in the pending queue", async () => {
  resetAll();
  reviewImpl = async () => {
    throw new Error("This report could not be reviewed. Please try again.");
  };
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Resolve").click();
  });
  const dialog = document.getElementById("root").querySelector('[role="dialog"]');
  const textarea = dialog.querySelector("textarea");
  await React.act(async () => {
    typeInto(textarea, "my review note");
  });
  await React.act(async () => {
    dialog.querySelector('button[type="submit"]').click();
  });
  await flush();
  const rootAfter = document.getElementById("root");
  assert.match(rootAfter.textContent, /This report could not be reviewed\. Please try again\./);
  assert.equal(rootAfter.querySelector('[role="dialog"] textarea').value, "my review note", "the note must survive a failed submission");
  assert.match(rootAfter.textContent, /Spam/, "the report must remain visible in the pending queue after a failed review");
});

test("a concurrent-finalization failure (already reviewed by someone else) is a recoverable error, not a crash or silent success", async () => {
  resetAll();
  reviewImpl = async () => {
    throw new Error("This report could not be reviewed. Please try again.");
  };
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Resolve").click();
  });
  await React.act(async () => {
    document.getElementById("root").querySelector('[role="dialog"] button[type="submit"]').click();
  });
  await flush();
  const dialog = document.getElementById("root").querySelector('[role="dialog"]');
  assert.ok(dialog, "the dialog must remain open and usable after a concurrent-finalization-shaped failure");
  const cancel = [...dialog.querySelectorAll("button")].find((b) => b.textContent.trim() === "Cancel");
  await React.act(async () => {
    cancel.click();
  });
  await flush(10);
  assert.equal(document.getElementById("root").querySelector('[role="dialog"]'), null);
  assert.match(document.getElementById("root").textContent, /Spam/, "recovery via Cancel leaves the item visible for a manual Refresh, never silently removed");
});

// ==========================================================================
// No raw backend text ever reaches the DOM.
// ==========================================================================

test("no raw PostgREST/RLS/constraint/function text ever reaches the DOM on a review failure", async () => {
  resetAll();
  const { ModerationOperationError } = await import(moderationClientUrl);
  reviewImpl = async () => {
    throw new ModerationOperationError("review_report", "This report could not be reviewed. Please try again.", {
      cause: { message: 'new row violates row-level security policy for table "reports"', code: "42501" },
    });
  };
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Dismiss").click();
  });
  await React.act(async () => {
    document.getElementById("root").querySelector('[role="dialog"] button[type="submit"]').click();
  });
  await flush();
  const text = document.getElementById("root").textContent;
  assert.match(text, /This report could not be reviewed\. Please try again\./);
  for (const rawFragment of ["row-level security", "42501", "review_report", "reports_", "constraint", "PostgREST"]) {
    assert.ok(!text.includes(rawFragment), `must never leak raw fragment ${JSON.stringify(rawFragment)}`);
  }
});

// ==========================================================================
// Phase 4 Slice K: message enforcement (Hide/Restore) — offered only for a
// resolved, message-target report, mutually exclusive on the message's own
// current moderation status.
// ==========================================================================

async function mountWithResolvedMessageReport(messageModerationStatus = "visible") {
  fetchQueueImpl = async (status) => ({
    items:
      status === "resolved"
        ? [
            queueItem({
              reportId: REPORT_ID_1,
              targetKind: "message",
              category: "harassment",
              status: "resolved",
              reviewedByDisplayName: "Mod",
              reviewedAt: "2026-01-01T00:00:00.000Z",
              messageBody: "The reported text.",
              messageModerationStatus,
            }),
          ]
        : [],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  const resolvedTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Resolved");
  await React.act(async () => {
    resolvedTab.click();
  });
  await flush();
  await React.act(async () => {
    [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent.includes("Harassment"))?.click();
  });
  await flush(10);
  return document.getElementById("root");
}

test("Hide message appears for a resolved, visible message report — Restore does not", async () => {
  resetAll();
  const container = await mountWithResolvedMessageReport("visible");
  assert.ok(findButton(container, "Hide message"));
  assert.equal(findButton(container, "Restore message"), undefined);
});

test("Restore message appears for a resolved, already-hidden message report — Hide does not", async () => {
  resetAll();
  const container = await mountWithResolvedMessageReport("removed_by_moderator");
  assert.ok(findButton(container, "Restore message"));
  assert.equal(findButton(container, "Hide message"), undefined);
  assert.match(container.textContent, /Hidden from conversation/);
});

test("neither Hide nor Restore appears for a resolved profile-target report — enforcement is message-only", async () => {
  resetAll();
  fetchQueueImpl = async (status) => ({
    items: status === "resolved" ? [queueItem({ reportId: REPORT_ID_1, targetKind: "profile", status: "resolved", reviewedByDisplayName: "Mod", reviewedAt: "2026-01-01T00:00:00.000Z" })] : [],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  const resolvedTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Resolved");
  await React.act(async () => {
    resolvedTab.click();
  });
  await flush();
  await React.act(async () => {
    [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent.includes("Spam"))?.click();
  });
  await flush(10);
  const root = document.getElementById("root");
  assert.equal(findButton(root, "Hide message"), undefined);
  assert.equal(findButton(root, "Restore message"), undefined);
});

test("neither Hide nor Restore appears for a pending message report — review must happen first", async () => {
  resetAll();
  const container = await mountWithPendingReport();
  assert.equal(findButton(container, "Hide message"), undefined);
  assert.equal(findButton(container, "Restore message"), undefined);
});

// Phase 4 safety-checkpoint audit (2026-09-03): the only two "neither"
// combinations previously exercised were pending and profile-target-resolved
// — a dismissed message report was never given its own fixture, even though
// the component's gate (item.status === "resolved") makes dismissed behave
// identically to pending by construction. This closes that coverage gap
// directly rather than relying on the shared gate alone.
test("neither Hide nor Restore appears for a dismissed message report — dismissal is not enforceable either", async () => {
  resetAll();
  fetchQueueImpl = async (status) => ({
    items:
      status === "dismissed"
        ? [
            queueItem({
              reportId: REPORT_ID_1,
              targetKind: "message",
              category: "harassment",
              status: "dismissed",
              reviewedByDisplayName: "Mod",
              reviewedAt: "2026-01-01T00:00:00.000Z",
              messageBody: "The reported text.",
              messageModerationStatus: "visible",
            }),
          ]
        : [],
    nextCursor: null,
  });
  const container = await mountModeration();
  await flush();
  const dismissedTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Dismissed");
  await React.act(async () => {
    dismissedTab.click();
  });
  await flush();
  await React.act(async () => {
    [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent.includes("Harassment"))?.click();
  });
  await flush(10);
  const root = document.getElementById("root");
  assert.equal(findButton(root, "Hide message"), undefined);
  assert.equal(findButton(root, "Restore message"), undefined);
});

test("the Hide confirmation states plainly that both people, including the sender, lose visibility, and that it can be reversed", async () => {
  resetAll();
  const container = await mountWithResolvedMessageReport("visible");
  await React.act(async () => {
    findButton(container, "Hide message").click();
  });
  const dialogText = document.getElementById("root").querySelector('[role="dialog"]').textContent;
  assert.match(dialogText, /both people/i);
  assert.match(dialogText, /sender/i);
  assert.match(dialogText, /reversed/i);
});

test("Hide waits for a confirmed response before showing success, and the button switches to Restore only after Close, without leaving the Resolved tab", async () => {
  resetAll();
  let resolveModerate;
  moderateImpl = () =>
    new Promise((resolve) => {
      resolveModerate = () =>
        resolve({ actionId: "c1000000-0000-0000-0000-000000000001", messageId: "d1000000-0000-0000-0000-000000000001", moderationStatus: "removed_by_moderator", actedAt: "2026-01-01T00:00:00.000Z" });
    });
  const container = await mountWithResolvedMessageReport("visible");
  await React.act(async () => {
    findButton(container, "Hide message").click();
  });
  const submit = document.getElementById("root").querySelector('[role="dialog"] button[type="submit"]');
  await React.act(async () => {
    submit.click();
  });
  await flush(10);
  assert.doesNotMatch(document.getElementById("root").textContent, /Message hidden/, "must not claim success before the RPC resolves");
  assert.equal(moderateCalls.length, 1);
  assert.deepEqual(moderateCalls[0], [REPORT_ID_1, "hide_message", undefined]);

  await React.act(async () => {
    resolveModerate();
    await new Promise((r) => setTimeout(r, 20));
  });
  assert.match(document.getElementById("root").textContent, /Message hidden/);
  // Community Guidelines owner-review pass: tells the moderator plainly that
  // an already-open participant thread does not update live — see
  // EnforcementDialog.tsx's own module comment for the underlying "no live/
  // polling update" boundary this sentence discloses.
  assert.match(document.getElementById("root").textContent, /already open will see this after they refresh or reconnect/i);
  assert.equal(findButton(document.getElementById("root"), "Restore message"), undefined, "the parent is only told, and the button only swaps, once Close is clicked");

  await React.act(async () => {
    findButton(document.getElementById("root"), "Close").click();
  });
  await flush(10);
  const rootAfter = document.getElementById("root");
  assert.ok(findButton(rootAfter, "Restore message"), "after confirmation, the action swaps to Restore in place");
  assert.equal(findButton(rootAfter, "Hide message"), undefined);
  assert.match(rootAfter.textContent, /Harassment/, "the item stays in the Resolved tab — enforcement never changes report status");
});

test("a failed Hide preserves the typed note and the prior (visible) state — the trigger stays Hide, never silently swaps to Restore", async () => {
  resetAll();
  moderateImpl = async () => {
    throw new Error("This action could not be completed. Please try again.");
  };
  const container = await mountWithResolvedMessageReport("visible");
  await React.act(async () => {
    findButton(container, "Hide message").click();
  });
  const dialog = document.getElementById("root").querySelector('[role="dialog"]');
  const textarea = dialog.querySelector("textarea");
  await React.act(async () => {
    typeInto(textarea, "confirmed harassment");
  });
  await React.act(async () => {
    dialog.querySelector('button[type="submit"]').click();
  });
  await flush();
  const rootAfter = document.getElementById("root");
  assert.match(rootAfter.textContent, /This action could not be completed\. Please try again\./);
  assert.equal(rootAfter.querySelector('[role="dialog"] textarea').value, "confirmed harassment", "the typed note must survive a failed submission — never cleared on failure");
  assert.ok(rootAfter.querySelector('[role="dialog"]'), "the dialog stays open for correction, not dismissed on failure");

  await React.act(async () => {
    const cancel = [...rootAfter.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === "Cancel");
    cancel.click();
  });
  await flush(10);
  const rootFinal = document.getElementById("root");
  assert.ok(findButton(rootFinal, "Hide message"), "prior state (visible) is untouched by the failure — Hide remains the offered action");
  assert.equal(findButton(rootFinal, "Restore message"), undefined, "a failed enforcement attempt must never swap the offered action to Restore");
});

test("no raw PostgREST/RLS/constraint/function text ever reaches the DOM on an enforcement failure", async () => {
  resetAll();
  const { ModerationOperationError } = await import(moderationClientUrl);
  moderateImpl = async () => {
    throw new ModerationOperationError("moderate_message", "This action could not be completed. Please try again.", {
      cause: { message: "moderate_reported_message: message is not currently visible", code: "P0001" },
    });
  };
  const container = await mountWithResolvedMessageReport("visible");
  await React.act(async () => {
    findButton(container, "Hide message").click();
  });
  await React.act(async () => {
    document.getElementById("root").querySelector('[role="dialog"] button[type="submit"]').click();
  });
  await flush();
  const text = document.getElementById("root").textContent;
  assert.match(text, /This action could not be completed\. Please try again\./);
  for (const rawFragment of ["moderate_reported_message", "not currently visible", "P0001", "constraint"]) {
    assert.ok(!text.includes(rawFragment), `must never leak raw fragment ${JSON.stringify(rawFragment)}`);
  }
});

test("the enforcement dialog focuses Cancel initially, Tab wraps within the dialog, and Escape closes without acting, restoring focus to its own trigger", async () => {
  resetAll();
  const container = await mountWithResolvedMessageReport("visible");
  const trigger = findButton(container, "Hide message");
  await React.act(async () => {
    trigger.focus();
    trigger.click();
  });
  const dialog = document.getElementById("root").querySelector('[role="dialog"]');
  const cancelButton = [...dialog.querySelectorAll("button")].find((b) => b.textContent.trim() === "Cancel");
  assert.ok(document.activeElement === cancelButton, "initial focus must land on Cancel");

  const focusable = [...dialog.querySelectorAll("button:not([disabled]), textarea:not([disabled])")];
  const last = focusable[focusable.length - 1];
  await React.act(async () => {
    last.focus();
  });
  await React.act(async () => {
    last.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  });
  assert.ok(document.activeElement === focusable[0], "Tab from the last focusable control must wrap to the first — a genuine focus trap, not merely initial-focus placement");

  await React.act(async () => {
    document.activeElement.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush(10);
  assert.equal(document.getElementById("root").querySelector('[role="dialog"]'), null);
  assert.ok(document.activeElement === trigger, "focus must return to the Hide trigger after Escape");
  assert.equal(moderateCalls.length, 0, "Escape must never submit an enforcement action");
});

// ==========================================================================
// Mobile Back behavior.
// ==========================================================================

test("selecting a report on mobile shows Back, and Back returns to the queue", async () => {
  resetAll();
  fetchQueueImpl = async () => ({ items: [queueItem({ reportId: REPORT_ID_1, category: "spam" })], nextCursor: null });
  const container = await mountModeration();
  await flush();
  await React.act(async () => {
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Spam")).click();
  });
  await flush(10);
  const back = findButton(document.getElementById("root"), "Back to queue");
  assert.ok(back, "expected a Back control in the detail view");
  await React.act(async () => {
    back.click();
  });
  await flush(10);
  assert.equal(findButton(document.getElementById("root"), "Back to queue"), undefined, "Back must return to the queue view");
});

// ==========================================================================
// Dialog keyboard/focus accessibility.
// ==========================================================================

test("the review dialog focuses Cancel initially, Escape closes and restores focus to its own trigger, and Tab wraps within the dialog", async () => {
  resetAll();
  const container = await mountWithPendingReport();
  const resolveTrigger = findButton(container, "Resolve");
  await React.act(async () => {
    resolveTrigger.focus();
    resolveTrigger.click();
  });
  const dialog = document.getElementById("root").querySelector('[role="dialog"]');
  const cancelButton = [...dialog.querySelectorAll("button")].find((b) => b.textContent.trim() === "Cancel");
  assert.ok(document.activeElement === cancelButton, "initial focus must land on Cancel");

  const focusable = [...dialog.querySelectorAll("button:not([disabled]), textarea:not([disabled])")];
  const last = focusable[focusable.length - 1];
  await React.act(async () => {
    last.focus();
  });
  await React.act(async () => {
    last.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  });
  assert.ok(document.activeElement === focusable[0], "Tab from the last focusable control must wrap to the first");

  await React.act(async () => {
    document.activeElement.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush(10);
  assert.equal(document.getElementById("root").querySelector('[role="dialog"]'), null);
  assert.ok(document.activeElement === resolveTrigger, "focus must return to the Resolve trigger after Escape");
  assert.equal(reviewCalls.length, 0, "Escape must never submit a review decision");
});

test("focus moves to the success view's Close button only after a confirmed review, never before", async () => {
  resetAll();
  let resolveReview;
  reviewImpl = () => new Promise((resolve) => { resolveReview = () => resolve({ reportId: REPORT_ID_1, status: "resolved", reviewedAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountWithPendingReport();
  const resolveTrigger = findButton(container, "Resolve");
  await React.act(async () => {
    resolveTrigger.focus();
    resolveTrigger.click();
  });
  const submit = document.getElementById("root").querySelector('[role="dialog"] button[type="submit"]');
  await React.act(async () => {
    submit.focus();
    submit.click();
  });
  await flush(10);
  assert.ok(document.activeElement === submit, "focus must still be on submit while the review is pending");

  await React.act(async () => {
    resolveReview();
    await new Promise((r) => setTimeout(r, 20));
  });
  const closeButton = [...document.getElementById("root").querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === "Close");
  assert.ok(document.activeElement === closeButton, "focus must move to Close only after the confirmed success");
});

test("unmounting while the review dialog is still open removes the document-level keydown listener", async () => {
  resetAll();
  const container = await mountWithPendingReport();
  await React.act(async () => {
    findButton(container, "Resolve").click();
  });
  assert.ok(document.getElementById("root").querySelector('[role="dialog"]'));
  assert.equal(liveDocumentKeydownListeners, 1);
  await React.act(async () => {
    currentRoot.unmount();
  });
  currentRoot = null;
  assert.equal(liveDocumentKeydownListeners, 0);
});

// ==========================================================================
// "Report review" discovery link on ProfileRoute — appears only after
// confirmed active-moderator access.
// ==========================================================================

async function mountOwnProfile() {
  const root = freshRoot();
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ["/profile"] }, React.createElement(ProfileRoute)));
  });
  return document.getElementById("root");
}

test("the Report review link is absent while moderator access is still loading", async () => {
  resetAll();
  let resolveAccess;
  checkAccessImpl = () => new Promise((resolve) => { resolveAccess = () => resolve(true); });
  const container = await mountOwnProfile();
  await flush();
  assert.equal(findButton(container, "Report review"), undefined);
  await React.act(async () => {
    resolveAccess();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("the Report review link is absent for a confirmed non-moderator", async () => {
  resetAll();
  checkAccessImpl = async () => false;
  const container = await mountOwnProfile();
  await flush();
  assert.equal(findButton(container, "Report review"), undefined);
});

test("the Report review link is absent when the access check itself fails", async () => {
  resetAll();
  checkAccessImpl = async () => {
    throw new Error("unavailable");
  };
  const container = await mountOwnProfile();
  await flush();
  assert.equal(findButton(container, "Report review"), undefined);
});

test("the Report review link appears only after confirmed active-moderator access, and points at /moderation/reports", async () => {
  resetAll();
  checkAccessImpl = async () => true;
  const container = await mountOwnProfile();
  await flush();
  const link = findButton(container, "Report review") ?? [...container.querySelectorAll("a")].find((a) => a.textContent.trim() === "Report review");
  assert.ok(link, "expected the Report review link once access is confirmed");
  assert.equal(link.getAttribute("href"), "/moderation/reports");
});

// Community Guidelines owner-review pass: unlike "Report review" above, this
// link must render for an ordinary non-moderator and must never be
// conditioned on the moderator-access check in any of its four states.
test("Community Guidelines renders for an ordinary authenticated non-moderator, and links to /community-guidelines", async () => {
  resetAll();
  checkAccessImpl = async () => false;
  const container = await mountOwnProfile();
  await flush();
  const link = [...container.querySelectorAll("a")].find((a) => a.textContent.trim() === "Community Guidelines");
  assert.ok(link, "Community Guidelines must render for a confirmed non-moderator");
  assert.equal(link.getAttribute("href"), "/community-guidelines");
  // Preserves the existing moderator-only behavior alongside it — a
  // non-moderator gets Guidelines but never Report review.
  assert.equal(findButton(container, "Report review"), undefined);
});

test("Community Guidelines is not conditional on moderator access — it renders identically while access is still loading, denied, unavailable, and granted", async () => {
  const states = [
    { name: "loading", impl: () => new Promise(() => {}) },
    { name: "denied", impl: async () => false },
    { name: "unavailable", impl: async () => { throw new Error("unavailable"); } },
    { name: "granted", impl: async () => true },
  ];
  for (const { name, impl } of states) {
    resetAll();
    checkAccessImpl = impl;
    const container = await mountOwnProfile();
    await flush();
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent.trim() === "Community Guidelines");
    assert.ok(link, `Community Guidelines must render while moderator access is ${name}`);
    assert.equal(link.getAttribute("href"), "/community-guidelines");
  }
});

// ==========================================================================
// Phase 4 Slice L: the "History" tab — read-only moderation-actions ledger.
// ==========================================================================

test("switching to the History tab calls listModerationActions and renders a populated list", async () => {
  resetAll();
  listActionsImpl = async () => ({ items: [actionHistoryItem()], nextCursor: null });
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  assert.equal(listActionsCalls.length, 1);
  const text = document.getElementById("root").textContent;
  assert.match(text, /Hid/);
  assert.match(text, /Harassment/);
  assert.match(text, /Dave/);
});

test("the History tab shows a loading state before the first response", async () => {
  resetAll();
  listActionsImpl = () => new Promise(() => {});
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Loading moderation history/i);
});

test("a History load failure shows a safe error state with a retry control, and it re-fetches", async () => {
  resetAll();
  let calls = 0;
  listActionsImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("The moderation history could not be loaded. Please try again.");
    return { items: [actionHistoryItem()], nextCursor: null };
  };
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /could not be loaded/i);
  const retry = [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent.trim() === "Try again");
  assert.ok(retry, "expected the shared ErrorState's own retry control");
  await React.act(async () => {
    retry.click();
  });
  await flush();
  assert.equal(listActionsCalls.length, 2);
  assert.match(document.getElementById("root").textContent, /Harassment/);
});

// The mocked listModerationActions stands in for the *entire* real client
// function, including its own safe-error wrapping (see moderationClient.ts's
// own SAFE_ACTION_HISTORY_ERROR discipline) — so, mirroring the identical
// convention the enforcement-failure test above already establishes, the
// mock throws the already-safe ModerationOperationError with the raw
// backend text only as `cause`, proving the component renders nothing but
// that safe message rather than asserting the component itself sanitizes
// raw text it was never designed to see.
test("no raw PostgREST/RLS/constraint/function text ever reaches the DOM on a History load failure", async () => {
  resetAll();
  const { ModerationOperationError } = await import(moderationClientUrl);
  listActionsImpl = async () => {
    throw new ModerationOperationError("fetch_action_history", "The moderation history could not be loaded. Please try again.", {
      cause: { message: "list_moderation_actions: active moderator access required", code: "P0001" },
    });
  };
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  const text = document.getElementById("root").textContent;
  assert.doesNotMatch(text, /list_moderation_actions|P0001|active moderator access required/);
  assert.match(text, /could not be loaded/i);
});

test("a confirmed empty History is shown honestly, never as a loading or error state", async () => {
  resetAll();
  listActionsImpl = async () => ({ items: [], nextCursor: null });
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /No moderation actions yet/i);
});

test("Load more in History appends a second page without duplicating or losing the first page's items", async () => {
  resetAll();
  listActionsImpl = async (cursor) =>
    cursor
      ? { items: [actionHistoryItem({ actionId: "c1000000-0000-0000-0000-000000000002", action: "restore_message" })], nextCursor: null }
      : { items: [actionHistoryItem()], nextCursor: { createdAt: "2026-01-01T00:00:00.000Z", id: "c1000000-0000-0000-0000-000000000001" } };
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  const loadMore = [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent.trim() === "Load more");
  assert.ok(loadMore, "expected a Load more control while a next cursor exists");
  await React.act(async () => {
    loadMore.click();
  });
  await flush();
  assert.equal(listActionsCalls.length, 2);
  const items = document.getElementById("root").querySelectorAll("li");
  assert.equal(items.length, 2, "both pages' items must be present, none lost or duplicated");
});

test("switching from a status tab to History, and back, correctly toggles which panel is shown", async () => {
  resetAll();
  fetchQueueImpl = async () => ({ items: [queueItem({ reportId: REPORT_ID_1, category: "spam" })], nextCursor: null });
  listActionsImpl = async () => ({ items: [actionHistoryItem()], nextCursor: null });
  const container = await mountModeration();
  await flush();
  assert.match(container.textContent, /Spam/);
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Harassment/);
  assert.doesNotMatch(document.getElementById("root").textContent, /Select a report/, "the queue's own two-pane layout must not render while History is active");
  const pendingTab = [...document.getElementById("root").querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "Pending");
  await React.act(async () => {
    pendingTab.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Spam/);
});

test("a stale History response for a previous authenticated identity cannot overwrite the newer identity's state", async () => {
  resetAll();
  let resolveFirst;
  let callCount = 0;
  listActionsImpl = () => {
    callCount += 1;
    if (callCount === 1) return new Promise((resolve) => { resolveFirst = () => resolve({ items: [actionHistoryItem({ moderatorDisplayName: "Stale" })], nextCursor: null }); });
    return Promise.resolve({ items: [actionHistoryItem({ moderatorDisplayName: "Fresh" })], nextCursor: null });
  };
  const container = await mountModeration();
  await flush();
  const historyTab = [...container.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab.click();
  });
  await flush(10); // first history fetch now in flight

  await React.act(async () => {
    authState = { status: "authenticated", session: { subject: "a0000000-0000-0000-0000-000000000099" } };
  });
  const container2 = await mountModeration();
  await flush();
  const historyTab2 = [...container2.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === "History");
  await React.act(async () => {
    historyTab2.click();
  });
  await flush();
  assert.match(document.getElementById("root").textContent, /Fresh/);

  await React.act(async () => {
    resolveFirst();
    await new Promise((r) => setTimeout(r, 20));
  });
  assert.doesNotMatch(document.getElementById("root").textContent, /Stale/, "the earlier identity's stale response must never overwrite the newer identity's rendered state");
});
