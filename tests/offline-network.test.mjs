import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// V1-7: the shared connectivity store, the banner, ErrorState's safe
// auto-retry, and network-vs-server error classification.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
let deviceOnline = true;
Object.defineProperty(dom.window.navigator, "onLine", { get: () => deviceOnline, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Count window listeners to prove the store attaches exactly one pair.
const added = [];
const realAdd = dom.window.addEventListener.bind(dom.window);
dom.window.addEventListener = (type, ...rest) => {
  if (type === "online" || type === "offline") added.push(type);
  return realAdd(type, ...rest);
};

// On the web the store must never use the native Network plugin (Phase M1).
// Stubbed here because tsx's loader evaluates the plugin's web module, which
// attaches its own window listeners; in the Vite bundle that module is a lazy
// chunk that never loads on the web.
const nativeNetworkCalls = [];
mock.module("@capacitor/network", {
  exports: {
    Network: {
      addListener: async (...args) => (nativeNetworkCalls.push(["addListener", args[0]]), { remove: async () => {} }),
      getStatus: async () => (nativeNetworkCalls.push(["getStatus"]), { connected: true, connectionType: "wifi" }),
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const status = await import(new URL("../src/social/services/networkStatus.ts", import.meta.url).href);
const { isLikelyNetworkError, describeError, OFFLINE_ACTION_MESSAGE } = await import(new URL("../src/social/services/networkErrors.ts", import.meta.url).href);
const { OfflineBanner, OFFLINE_BANNER_TEXT, BACK_ONLINE_TEXT } = await import(new URL("../src/social/components/OfflineBanner.tsx", import.meta.url).href);
const { ErrorState, OFFLINE_RETRY_NOTE } = await import(new URL("../src/social/components/StateViews.tsx", import.meta.url).href);

async function flush(ms = 10) {
  await React.act(async () => new Promise((r) => setTimeout(r, ms)));
}
async function goOffline() {
  deviceOnline = false;
  await React.act(async () => dom.window.dispatchEvent(new dom.window.Event("offline")));
}
async function goOnline() {
  deviceOnline = true;
  await React.act(async () => dom.window.dispatchEvent(new dom.window.Event("online")));
}
async function mount(element) {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => root.render(element));
  return { container, root };
}

test.afterEach(async () => {
  if (!deviceOnline) await goOnline();
});

test("one shared pair of window listeners, however many components subscribe", async () => {
  const seen = [];
  function Probe({ id }) {
    seen[id] = status.useOnlineStatus();
    return null;
  }
  await mount(React.createElement(React.Fragment, null, ...[0, 1, 2, 3].map((id) => React.createElement(Probe, { key: id, id }))));
  await mount(React.createElement(OfflineBanner));
  assert.deepEqual(added.sort(), ["offline", "online"]);
  assert.deepEqual(nativeNetworkCalls, [], "the web never uses the native Network plugin");
  await goOffline();
  assert.equal(status.isOnline(), false);
});

test("the banner appears offline, is announced politely, sits in the page flow and takes no focus", async () => {
  const { container } = await mount(React.createElement(OfflineBanner));
  const region = container.querySelector('[role="status"]');
  assert.equal(region.getAttribute("aria-live"), "polite");
  assert.equal(region.textContent, "", "nothing shown while online");
  await goOffline();
  assert.equal(region.textContent, OFFLINE_BANNER_TEXT);
  assert.equal(region.querySelector("p").className.includes("fixed"), false, "never overlays the navigation");
  assert.equal(region.querySelectorAll("button, a, [tabindex]").length, 0, "nothing to trap or steal focus");
  assert.doesNotMatch(region.textContent, /network|API|request|server|fetch/i, "no technical wording");
});

test("the banner disappears on reconnection and briefly confirms, then clears", async () => {
  await goOffline();
  const { container } = await mount(React.createElement(OfflineBanner, { backOnlineMs: 30 }));
  await goOnline();
  const region = container.querySelector('[role="status"]');
  assert.doesNotMatch(region.textContent, /offline/);
  assert.equal(region.textContent, BACK_ONLINE_TEXT);
  await flush(60);
  assert.equal(region.textContent, "");
});

test("ErrorState: Try again works; offline it says it will retry; reconnecting re-runs the read exactly once", async () => {
  let retries = 0;
  const onRetry = () => { retries += 1; };
  const { container } = await mount(React.createElement(ErrorState, { message: "Your conversations could not be loaded.", onRetry }));
  const button = container.querySelector("button");
  await React.act(async () => button.click());
  assert.equal(retries, 1);
  await goOffline();
  assert.match(container.textContent, new RegExp(OFFLINE_RETRY_NOTE.replace(/[.']/g, ".")));
  await goOnline();
  assert.equal(retries, 2, "re-run once on reconnection");
  await goOffline();
  await goOnline();
  assert.equal(retries, 3, "and again after a later drop");
  await flush();
  assert.equal(retries, 3, "never in a loop");
});

test("classification: connection failures are recognised through the safe-error cause chain", () => {
  const wrapped = (cause) => Object.assign(new Error("The post could not be published. Please try again."), { cause });
  assert.ok(isLikelyNetworkError(new TypeError("Failed to fetch")));
  assert.ok(isLikelyNetworkError(wrapped({ message: "TypeError: Failed to fetch", details: "", hint: "", code: "" })), "supabase-js PostgREST wrapper");
  assert.ok(isLikelyNetworkError(wrapped({ message: "TypeError: fetch failed", details: "Error: read ECONNRESET" })));
  assert.ok(isLikelyNetworkError(wrapped(Object.assign(new Error("x"), { name: "AuthRetryableFetchError", status: 0 }))));
  assert.ok(isLikelyNetworkError(wrapped({ name: "StorageUnknownError", message: "Load failed", originalError: new TypeError("Load failed") })));
});

test("classification: real server answers and input errors are never mistaken for a lost connection", async () => {
  const wrapped = (cause) => Object.assign(new Error("Your profile could not be saved. Please try again."), { cause });
  assert.equal(isLikelyNetworkError(wrapped({ code: "42501", message: "new row violates row-level security policy" })), false);
  assert.equal(isLikelyNetworkError(wrapped({ status: 500, message: "Internal Server Error" })), false);
  assert.equal(isLikelyNetworkError(new Error("Add a display name.")), false);
  assert.deepEqual(describeError(new Error("Add a display name."), "x"), { message: "Add a display name.", isNetwork: false });
  await goOffline();
  assert.equal(isLikelyNetworkError(new Error("Add a display name.")), false, "a validation message stays itself even offline");
  assert.equal(isLikelyNetworkError(wrapped({ message: "anything" })), true, "an attempted request while offline counts as a connection failure");
  assert.deepEqual(describeError(wrapped({}), "x"), { message: OFFLINE_ACTION_MESSAGE, isNetwork: true });
});

test("the action message is homeowner-friendly", () => {
  assert.doesNotMatch(OFFLINE_ACTION_MESSAGE, /network|API|request|server|fetch|error/i);
});
