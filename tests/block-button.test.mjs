import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 4 Slice G: real-mount interaction coverage for block/unblock on
// PublicProfileRoute (BlockButton + MessageButton's own-block gating),
// following this repo's existing jsdom + node:test module-mocking
// convention (see message-button.test.mjs, which this file mirrors).

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// BlockButton's focus-trap effect checks `document.activeElement instanceof
// HTMLElement` (the same convention CommentsDrawer.tsx already uses,
// correct in a real browser where HTMLElement is a global) — jsdom needs
// this wired explicitly, the same way `navigator` is below.
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Instrumentation, not mocking: BlockButton's confirmation dialog is the only
// component in this file that registers a document-level listener
// (`document.addEventListener("keydown", ...)` for its focus trap/Escape
// handling), and a leaked one would silently keep firing across every
// subsequent test in the file. Wrapping the real addEventListener/
// removeEventListener lets every test assert the live count directly instead
// of only inferring "probably fine" from the dialog being visually closed.
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

let authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
let createOrGetDirectConversationCalls = [];

let fetchMyBlockStateImpl = async () => false;
let blockUserImpl = async (targetUserId) => ({ blockerId: AUTH_USER_ID, blockedId: targetUserId, createdAt: "2026-01-01T00:00:00.000Z" });
let unblockUserImpl = async (targetUserId) => ({ blockerId: AUTH_USER_ID, blockedId: targetUserId, removed: true });
const fetchMyBlockStateCalls = [];
const blockUserCalls = [];
const unblockUserCalls = [];

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
      return "convo-1";
    },
    fetchMyBlockState: async (...args) => {
      fetchMyBlockStateCalls.push(args);
      return fetchMyBlockStateImpl(...args);
    },
    blockUser: async (...args) => {
      blockUserCalls.push(args);
      return blockUserImpl(...args);
    },
    unblockUser: async (...args) => {
      unblockUserCalls.push(args);
      return unblockUserImpl(...args);
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

// Phase 4 Slice I: PublicProfileRoute now also renders ReportDialog, which
// imports reportingClient.ts. Mocked here purely so that real (unmocked)
// module — and, transitively, the real supabaseClient.ts it imports, which
// throws on `import.meta.env` outside a Vite context — is never loaded; this
// file predates reporting and never exercises the Report profile action
// itself (see tests/profile-report.test.mjs for that coverage).
mock.module(reportingClientUrl, {
  exports: {
    REPORT_CATEGORIES: ["spam", "harassment", "hate_or_abuse", "threat_or_violence", "sexual_content", "impersonation", "scam_or_fraud", "other"],
    REPORT_DETAILS_MAX_LENGTH: 1000,
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

// BlockButton's confirmation dialog registers a document-level keydown
// listener while open (the same focus-trap convention CommentsDrawer.tsx
// uses) — unlike the simpler Follow/Connect/Message buttons this repo's
// other mounted tests exercise, an un-unmounted root here would leave that
// listener (and the component's effects generally) dangling across tests,
// so every test in this file must actually unmount before the next runs.
afterEach(async () => {
  if (currentRoot) {
    await React.act(async () => {
      currentRoot.unmount();
    });
    currentRoot = null;
  }
  // Belt-and-suspenders proof, enforced every test rather than eyeballed
  // once: unmounting must have run every mounted BlockButton dialog's own
  // cleanup, so no document-level keydown listener should ever survive past
  // a test boundary — regardless of whether that test left the dialog open,
  // closed it via Cancel/Escape/confirmed action, or never opened it at all.
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
        React.createElement(Routes, null, React.createElement(Route, { path: "/profile/:userId", element: React.createElement(PublicProfileRoute) }))
      )
    );
  });
  return document.getElementById("root");
}

function findButton(container, text) {
  return [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
}

function resetAll() {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  createOrGetDirectConversationCalls = [];
  fetchMyBlockStateImpl = async () => false;
  blockUserImpl = async (targetUserId) => ({ blockerId: AUTH_USER_ID, blockedId: targetUserId, createdAt: "2026-01-01T00:00:00.000Z" });
  unblockUserImpl = async (targetUserId) => ({ blockerId: AUTH_USER_ID, blockedId: targetUserId, removed: true });
  fetchMyBlockStateCalls.length = 0;
  blockUserCalls.length = 0;
  unblockUserCalls.length = 0;
  fetchPublicProfileByIdImpl = async (userId) =>
    userId === OTHER_USER_ID ? profileFor(OTHER_USER_ID, "Jordan Rivera") : profileFor(THIRD_USER_ID, "Sam Okafor");
}

// ==========================================================================
// Guest / own-profile gating.
// ==========================================================================

test("guest never queries block state or writes a block", async () => {
  resetAll();
  authState = { status: "guest" };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  assert.equal(fetchMyBlockStateCalls.length, 0, "fetchMyBlockState must never be called for a guest");
  assert.doesNotMatch(container.textContent, /^Block$/m);
  assert.ok(container.querySelector('a[href="/auth"]'), "guest should be directed to the existing sign-in path");
});

// ==========================================================================
// Loading / retry.
// ==========================================================================

test("initial block-state loading shows neither Block nor Unblock — never an incorrect guess", async () => {
  resetAll();
  let resolveBlockState;
  fetchMyBlockStateImpl = () => new Promise((resolve) => { resolveBlockState = () => resolve(false); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush(10);
  assert.equal(findButton(container, "Block"), undefined, "no Block button while block state is still loading");
  assert.equal(findButton(container, "Unblock"), undefined, "no Unblock button while block state is still loading");
  await React.act(async () => {
    resolveBlockState();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("a block-state query failure shows a safe Retry state, and Retry re-fetches", async () => {
  resetAll();
  let calls = 0;
  fetchMyBlockStateImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("Your block status could not be checked. Please try again.");
    return false;
  };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  assert.match(container.textContent, /Your block status could not be checked\. Please try again\./);
  const retry = findButton(container, "Retry");
  assert.ok(retry, "expected a Retry control for the block-state failure");
  await React.act(async () => {
    retry.click();
  });
  await flush();
  assert.equal(calls, 2);
  assert.ok(findButton(container, "Block"), "Retry succeeding must reveal the real Block/Unblock state");
});

// ==========================================================================
// Confirmed not-blocked: Block action + confirmation dialog.
// ==========================================================================

test("a confirmed not-blocked state shows Block, and cancelling the confirmation performs no write", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => false;
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  const blockButton = findButton(container, "Block");
  assert.ok(blockButton);

  await React.act(async () => {
    blockButton.click();
  });
  const dialog = container.querySelector('[role="dialog"]');
  assert.ok(dialog, "expected an accessible confirmation dialog");
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  assert.ok(dialog.getAttribute("aria-labelledby"), "dialog must have an accessible name");
  assert.ok(dialog.getAttribute("aria-describedby"), "dialog must have an accessible description");
  assert.match(dialog.textContent, /messaging between the two users will become unavailable|won't be able to message each other/i);

  const cancel = findButton(container, "Cancel");
  await React.act(async () => {
    cancel.click();
  });
  await flush(10);
  assert.equal(container.querySelector('[role="dialog"]'), null, "dialog must close on Cancel");
  assert.equal(blockUserCalls.length, 0, "cancelling must never call blockUser");
  assert.ok(findButton(container, "Block"), "state must remain Block after a cancelled confirmation");
});

// Community Guidelines owner-review pass: the block confirmation dialog is
// deliberately never given a Community Guidelines link — blocking and
// reporting must stay clearly separated, and only ReportDialog/
// ModerationRoute/the signup checkbox/ProfileRoute link to the Guidelines.
test("the block confirmation dialog never links to Community Guidelines — blocking and reporting stay clearly separated", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => false;
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await React.act(async () => {
    findButton(container, "Block").click();
  });
  const dialog = container.querySelector('[role="dialog"]');
  assert.doesNotMatch(dialog.textContent, /community guidelines/i);
  assert.equal([...dialog.querySelectorAll("a")].length, 0, "the block confirmation dialog must contain no links at all");
});

test("repeated Block confirmation clicks while pending are prevented — exactly one blockUser call", async () => {
  resetAll();
  let resolveBlock;
  blockUserImpl = () => new Promise((resolve) => { resolveBlock = () => resolve({ blockerId: AUTH_USER_ID, blockedId: OTHER_USER_ID, createdAt: "2026-01-01T00:00:00.000Z" }); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await React.act(async () => {
    findButton(container, "Block").click();
  });
  const confirmButtons = [...container.querySelectorAll('[role="dialog"] button')].filter((b) => /^Block$/.test(b.textContent.trim()));
  await React.act(async () => {
    confirmButtons[0].click();
  });
  await flush(10);
  await React.act(async () => {
    // A second click while pending must be a no-op, not a second request.
    confirmButtons[0].click();
  });
  await flush(10);
  assert.equal(blockUserCalls.length, 1, "a second click while pending must not start a second request");

  await React.act(async () => {
    resolveBlock();
    await new Promise((r) => setTimeout(r, 20));
  });
  assert.ok(findButton(container, "Unblock"), "a confirmed block must change the UI to Unblock");
});

test("a confirmed block changes the UI to Unblock, disables Message, and shows a neutral own-action explanation", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await React.act(async () => {
    findButton(container, "Block").click();
  });
  const confirmButtons = [...container.querySelectorAll('[role="dialog"] button')].filter((b) => /^Block$/.test(b.textContent.trim()));
  await React.act(async () => {
    confirmButtons[0].click();
  });
  await flush();

  assert.equal(blockUserCalls.length, 1);
  assert.deepEqual(blockUserCalls[0], [OTHER_USER_ID]);
  assert.ok(findButton(container, "Unblock"), "expected the button to flip to Unblock after confirmed success");
  assert.equal(findButton(container, "Block"), undefined);
  const messageButton = findButton(container, "Message");
  assert.equal(messageButton.disabled, true, "Message must be disabled once blocked is confirmed");
  assert.match(container.textContent, /You've blocked this person\. Unblock them to send a message\./);
  assert.doesNotMatch(container.textContent, /blocked you|they blocked/i, "must never claim the other person did anything");

  await React.act(async () => {
    messageButton.click();
  });
  await flush(10);
  assert.equal(createOrGetDirectConversationCalls.length, 0, "Message must never call the create-conversation RPC while confirmed blocked");
});

test("a failed block preserves the Block state — no optimistic flip to Unblock", async () => {
  resetAll();
  blockUserImpl = async () => {
    throw new Error("This person could not be blocked right now. Please try again.");
  };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await React.act(async () => {
    findButton(container, "Block").click();
  });
  const confirmButtons = [...container.querySelectorAll('[role="dialog"] button')].filter((b) => /^Block$/.test(b.textContent.trim()));
  await React.act(async () => {
    confirmButtons[0].click();
  });
  await flush();

  assert.match(container.textContent, /This person could not be blocked right now\. Please try again\./);
  assert.ok(findButton(container, "Block"), "Block state must be preserved after a failed attempt");
  assert.equal(findButton(container, "Unblock"), undefined);
  const messageButton = findButton(container, "Message");
  assert.equal(messageButton.disabled, false, "Message must remain available — the block was never actually confirmed");
});

// ==========================================================================
// Confirmed blocked: Unblock action (no confirmation step).
// ==========================================================================

test("a confirmed unblock restores Block and Message availability", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => true;
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  const unblockButton = findButton(container, "Unblock");
  assert.ok(unblockButton);
  const messageButtonBefore = findButton(container, "Message");
  assert.equal(messageButtonBefore.disabled, true);

  await React.act(async () => {
    unblockButton.click();
  });
  await flush();

  assert.equal(unblockUserCalls.length, 1);
  assert.deepEqual(unblockUserCalls[0], [OTHER_USER_ID]);
  assert.ok(findButton(container, "Block"), "expected Block to reappear after a confirmed unblock");
  const messageButtonAfter = findButton(container, "Message");
  assert.equal(messageButtonAfter.disabled, false, "Message must become available again after a confirmed unblock");
});

test("a failed unblock preserves the Unblock state", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => true;
  unblockUserImpl = async () => {
    throw new Error("This person could not be unblocked right now. Please try again.");
  };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await React.act(async () => {
    findButton(container, "Unblock").click();
  });
  await flush();

  assert.match(container.textContent, /This person could not be unblocked right now\. Please try again\./);
  assert.ok(findButton(container, "Unblock"), "Unblock state must be preserved after a failed attempt");
  assert.equal(findButton(container, "Block"), undefined);
});

// ==========================================================================
// MessageButton's own-block gating in isolation.
// ==========================================================================

test("Message never calls createOrGetDirectConversation while own-block state is still loading", async () => {
  resetAll();
  let resolveBlockState;
  fetchMyBlockStateImpl = () => new Promise((resolve) => { resolveBlockState = () => resolve(false); });
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush(10);
  const messageButton = findButton(container, "Message");
  assert.equal(messageButton.disabled, true, "Message must be disabled while block state is unresolved");
  await React.act(async () => {
    messageButton.click();
  });
  await flush(10);
  assert.equal(createOrGetDirectConversationCalls.length, 0);
  await React.act(async () => {
    resolveBlockState();
    await new Promise((r) => setTimeout(r, 20));
  });
});

test("Message never calls createOrGetDirectConversation while own-block state is unavailable (query failure)", async () => {
  resetAll();
  fetchMyBlockStateImpl = async () => {
    throw new Error("Your block status could not be checked. Please try again.");
  };
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  const messageButton = findButton(container, "Message");
  assert.equal(messageButton.disabled, true, "Message must stay disabled when block state is unavailable, not assumed safe");
  await React.act(async () => {
    messageButton.click();
  });
  await flush(10);
  assert.equal(createOrGetDirectConversationCalls.length, 0);
});

// ==========================================================================
// Stale-response / cross-profile safety.
// ==========================================================================

test("a stale block-state response for a previous profile cannot replace the newer profile's confirmed state after rapid navigation", async () => {
  resetAll();
  let resolveFirst;
  let call = 0;
  fetchMyBlockStateImpl = (...args) => {
    call += 1;
    if (call === 1) return new Promise((resolve) => { resolveFirst = () => resolve(true); });
    return Promise.resolve(false);
  };

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
  await flush(10); // profile A's block-state fetch is now pending

  const switchButton = [...document.getElementById("root").querySelectorAll("button")].find((b) => b.textContent === "Switch profile");
  await React.act(async () => {
    switchButton.click();
  });
  await flush();

  const container = document.getElementById("root");
  assert.match(container.textContent, /Sam Okafor/, "must now show profile B");
  assert.ok(findButton(container, "Block"), "profile B's own genuinely-not-blocked state must render");

  resolveFirst?.();
  await flush();
  assert.match(document.getElementById("root").textContent, /Sam Okafor/, "profile A's late response must never replace profile B's rendered state");
  assert.ok(findButton(document.getElementById("root"), "Block"), "profile B's Block state must remain unaffected by profile A's stale resolution");
});

// ==========================================================================
// Confirmation dialog accessibility.
// ==========================================================================

test("confirmation dialog focuses Cancel initially, Escape cancels without writing, and focus returns to the Block trigger", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  const blockButton = findButton(container, "Block");
  // jsdom's `.click()` — unlike a real browser's click — does not itself move
  // focus to the activated button, so the trigger must be focused explicitly
  // first to faithfully simulate the real-world "user clicks the trigger"
  // sequence BlockButton's dialog effect relies on (it captures
  // `document.activeElement` as `previouslyFocused` when the dialog opens).
  await React.act(async () => {
    blockButton.focus();
    blockButton.click();
  });
  const cancelButton = findButton(container, "Cancel");
  // DOM/jsdom nodes are never passed to assert.equal/deepEqual: on a mismatch
  // node:assert's failure-message diff has to util.inspect the node, whose
  // graph (ownerDocument, defaultView, and — while this dialog is open — the
  // document-level keydown listener's closure over the whole component tree)
  // is enormous and circular enough to make the diff itself take upwards of a
  // minute and then crash with "Array buffer allocation failed" instead of
  // reporting the real assertion failure. A boolean identity check has no
  // such failure-path cost.
  assert.ok(document.activeElement === cancelButton, "initial focus must land on the least-destructive control");

  await React.act(async () => {
    cancelButton.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush(10);
  assert.equal(container.querySelector('[role="dialog"]'), null, "Escape must close the dialog");
  assert.equal(blockUserCalls.length, 0, "Escape must never write a block");
  assert.ok(document.activeElement === blockButton, "focus must return to the trigger after Escape");
});

test("unmounting while the confirmation dialog is still open removes the document-level keydown listener", async () => {
  resetAll();
  const container = await mountProfile(`/profile/${OTHER_USER_ID}`);
  await flush();
  await React.act(async () => {
    findButton(container, "Block").click();
  });
  assert.ok(container.querySelector('[role="dialog"]'), "dialog must be open going into unmount");
  assert.equal(liveDocumentKeydownListeners, 1, "the open dialog's focus-trap listener must be live before unmount");

  // Deliberately does not close the dialog first (no Cancel/Escape/confirm) —
  // this is the harder cleanup path afterEach's own unmount always exercises
  // for every test in this file, proven explicitly here rather than only
  // implied by the other tests all closing their dialogs before ending.
  await React.act(async () => {
    currentRoot.unmount();
  });
  currentRoot = null;
  assert.equal(liveDocumentKeydownListeners, 0, "unmounting with the dialog still open must still remove the listener");
});
