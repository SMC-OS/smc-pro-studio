import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase M1: native wiring. One network source (Capacitor Network, never the
// WebView's window events), deep links handled once, Android back closes a
// real SMC dialog first, then navigates, then minimises; nothing on iOS/web.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "https://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const windowNetworkListeners = [];
const realAdd = dom.window.addEventListener.bind(dom.window);
dom.window.addEventListener = (type, ...rest) => {
  if (type === "online" || type === "offline") windowNetworkListeners.push(type);
  return realAdd(type, ...rest);
};

let native = true;
let platform = "android";
mock.module("@capacitor/core", {
  exports: {
    Capacitor: { isNativePlatform: () => native, getPlatform: () => platform },
    registerPlugin: () => ({}),
  },
});

const appListeners = new Map();
let launchUrl = null;
const minimised = [];
mock.module("@capacitor/app", {
  exports: {
    App: {
      addListener: async (event, cb) => {
        appListeners.set(event, [...(appListeners.get(event) ?? []), cb]);
        return { remove: async () => appListeners.set(event, (appListeners.get(event) ?? []).filter((x) => x !== cb)) };
      },
      getLaunchUrl: async () => (launchUrl ? { url: launchUrl } : undefined),
      minimizeApp: async () => void minimised.push(true),
    },
  },
});
let splashHidden = 0;
mock.module("@capacitor/splash-screen", { exports: { SplashScreen: { hide: async () => void (splashHidden += 1) } } });

const networkListeners = [];
let networkStatus = { connected: false, connectionType: "none" };
mock.module("@capacitor/network", {
  exports: {
    Network: {
      addListener: async (event, cb) => (networkListeners.push([event, cb]), { remove: async () => {} }),
      getStatus: async () => networkStatus,
    },
  },
});

const exchanged = [];
mock.module(new URL("../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: true,
    SupabaseConfigurationError: class extends Error {},
    getSupabaseClient: () => ({ auth: { exchangeCodeForSession: async (code) => (exchanged.push(code), { error: null }) } }),
  },
});
mock.module(new URL("../src/social/services/messagingClient.ts", import.meta.url).href, {
  exports: { blockUser: async () => ({}), unblockUser: async () => ({}) },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route, useLocation, useNavigate } = await import("react-router-dom");
const status = await import(new URL("../src/social/services/networkStatus.ts", import.meta.url).href);
const { NativeShell } = await import(new URL("../src/social/native/NativeShell.tsx", import.meta.url).href);
const { handleHardwareBack } = await import(new URL("../src/social/native/hardwareBack.ts", import.meta.url).href);
const { BlockButton } = await import(new URL("../src/social/components/BlockButton.tsx", import.meta.url).href);
const { OfflineBanner, OFFLINE_BANNER_TEXT } = await import(new URL("../src/social/components/OfflineBanner.tsx", import.meta.url).href);

const CODE = "0f9c2a8e-5b1d-4c3e-9a7f-2d6b8e1c4a90";
const flush = (ms = 20) => React.act(async () => new Promise((r) => setTimeout(r, ms)));

let currentPath = "";
let goTo = null;
function Where() {
  currentPath = useLocation().pathname;
  goTo = useNavigate();
  return null;
}
let lastRoot = null;
async function mountShell(children = null) {
  if (lastRoot) await React.act(async () => lastRoot.unmount()); // also exercises listener cleanup
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  const root = createRoot(container);
  lastRoot = root;
  await React.act(async () =>
    root.render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] },
        React.createElement(NativeShell),
        React.createElement(Where),
        React.createElement(Routes, null, React.createElement(Route, { path: "*", element: children })),
      ),
    ),
  );
  await flush();
  return { container, root };
}
const fire = async (event, payload) => {
  for (const cb of appListeners.get(event) ?? []) await React.act(async () => cb(payload));
  await flush();
};

test("native network: one Capacitor Network source, no window online/offline listeners, drives the banner", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await React.act(async () => createRoot(container).render(React.createElement(OfflineBanner)));
  await flush();
  assert.equal(networkListeners.length, 1, "exactly one native listener");
  assert.equal(networkListeners[0][0], "networkStatusChange");
  assert.deepEqual(windowNetworkListeners, [], "WebView window events are not used on native");
  assert.equal(status.isOnline(), false, "initial status read from the OS");
  assert.equal(container.textContent, OFFLINE_BANNER_TEXT);
  await React.act(async () => networkListeners[0][1]({ connected: true, connectionType: "wifi" }));
  assert.equal(status.isOnline(), true);
  assert.doesNotMatch(container.textContent, /offline/);
  // More subscribers never add more native listeners.
  const unsub = status.subscribeToNetworkStatus(() => {});
  unsub();
  assert.equal(networkListeners.length, 1);
});

test("deep links: cold-start link handled once, warm links routed, no duplicate listeners across navigation", async () => {
  launchUrl = `smcprostudio://auth/callback?code=${CODE}`;
  await mountShell();
  assert.deepEqual(exchanged, [CODE]);
  assert.equal(currentPath, "/auth/callback");
  assert.equal((appListeners.get("appUrlOpen") ?? []).length, 1);
  assert.equal((appListeners.get("backButton") ?? []).length, 1, "Android registers back");
  assert.ok(splashHidden >= 1, "launch screen hidden after first paint");

  await React.act(async () => goTo("/network"));
  await flush();
  assert.equal((appListeners.get("appUrlOpen") ?? []).length, 1, "navigation does not re-register");

  await fire("appUrlOpen", { url: `smcprostudio://auth/reset-password?code=${CODE}x` });
  assert.equal(currentPath, "/auth/reset-password");
  await fire("appUrlOpen", { url: `smcprostudio://auth/reset-password?code=${CODE}x` });
  assert.deepEqual(exchanged, [CODE, `${CODE}x`], "the same link is never exchanged twice");

  await fire("appUrlOpen", { url: "smcprostudio://evil/callback?code=" + CODE });
  assert.equal(currentPath, "/auth/reset-password", "unknown links are ignored");
  launchUrl = null;
});

test("Android back closes a real dialog first (its own Escape contract), then navigates, then minimises", async () => {
  const historyBack = [];
  const realBack = window.history.back.bind(window.history);
  window.history.back = () => historyBack.push(true);
  try {
    const { container } = await mountShell(
      React.createElement(BlockButton, { userId: "u2", displayName: "Alder Stone", blocked: false, onChange: () => {} }),
    );
    assert.equal((appListeners.get("backButton") ?? []).length, 1, "the previous mount removed its listener");
    const trigger = [...container.querySelectorAll("button")].find((b) => /Block/.test(b.textContent));
    await React.act(async () => trigger.click());
    assert.ok(container.querySelector('[aria-modal="true"]'), "dialog open");

    await fire("backButton", { canGoBack: true });
    assert.equal(container.querySelector('[aria-modal="true"]'), null, "back closed the dialog");
    assert.equal(historyBack.length, 0, "and did not also navigate");

    await fire("backButton", { canGoBack: true });
    assert.equal(historyBack.length, 1, "with no dialog, back navigates");

    await fire("backButton", { canGoBack: false });
    assert.equal(minimised.length, 1, "at the root the app is minimised, not terminated");
  } finally {
    window.history.back = realBack;
  }
});

test("handleHardwareBack targets only the topmost dialog", () => {
  const doc = new JSDOM("<!doctype html><body><div aria-modal='true' id='a'></div><div aria-modal='true' id='b'></div></body>").window.document;
  const hits = [];
  doc.getElementById("a").addEventListener("keydown", () => hits.push("a"));
  doc.getElementById("b").addEventListener("keydown", (e) => hits.push(`b:${e.key}`));
  assert.equal(handleHardwareBack(true, { doc, historyBack: () => hits.push("history"), minimise: () => hits.push("min") }), "dialog");
  assert.deepEqual(hits, ["b:Escape"]);
});

test("iOS registers deep links but no hardware-back handler", async () => {
  appListeners.clear();
  platform = "ios";
  await mountShell();
  assert.equal((appListeners.get("appUrlOpen") ?? []).length, 1);
  assert.equal((appListeners.get("backButton") ?? []).length, 0);
  platform = "android";
});

test("on the web NativeShell does nothing", async () => {
  appListeners.clear();
  native = false;
  const hiddenBefore = splashHidden;
  await mountShell();
  assert.equal([...appListeners.values()].flat().length, 0, "no native listeners on the web");
  assert.equal(splashHidden, hiddenBefore);
  native = true;
});
