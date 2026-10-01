import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase M1: one central handler for smcprostudio:// auth links, sharing the
// code exchange and status with the web redirect path and /auth/callback.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "https://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let exchangeImpl = async () => ({ error: null });
const exchanged = [];
mock.module(new URL("../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: true,
    SupabaseConfigurationError: class extends Error {},
    getAuthRedirectUrl: () => "smcprostudio://auth/callback",
    getAuthAccessToken: async () => null,
    getSupabaseClient: () => ({
      auth: {
        exchangeCodeForSession: async (code) => (exchanged.push(code), exchangeImpl(code)),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    }),
  },
});

mock.module(new URL("../src/services/apiClient.ts", import.meta.url).href, {
  exports: { apiFetch: async () => { throw new Error("not used"); } },
});

let authState = { status: "guest" };
mock.module(new URL("../src/social/services/useAuthSession.ts", import.meta.url).href, {
  exports: { useAuthSession: () => authState },
});

const { parseAuthDeepLink, handleAuthDeepLink } = await import(new URL("../src/social/native/authDeepLinks.ts", import.meta.url).href);
const { getAuthRedirectStatus, setAuthRedirectStatus, AUTH_LINK_INVALID_MESSAGE } = await import(new URL("../src/services/authRedirect.ts", import.meta.url).href);
const { exchangeAuthCode, completeAuthRedirect } = await import(new URL("../src/services/authRedirect.ts", import.meta.url).href);
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { default: AuthCallbackRoute } = await import(new URL("../src/social/routes/AuthCallbackRoute.tsx", import.meta.url).href);

const CODE = "0f9c2a8e-5b1d-4c3e-9a7f-2d6b8e1c4a90";
const deps = () => {
  const navigations = [];
  return { navigations, exchangeCode: exchangeAuthCode, navigate: (to, opts) => navigations.push([to, opts]) };
};

test.beforeEach(() => {
  exchanged.length = 0;
  exchangeImpl = async () => ({ error: null });
  setAuthRedirectStatus({ state: "idle" });
  authState = { status: "guest" };
});

test("parses the two accepted links (with or without a trailing slash)", () => {
  assert.deepEqual(parseAuthDeepLink(`smcprostudio://auth/callback?code=${CODE}`), { route: "/auth/callback", code: CODE, error: null });
  assert.deepEqual(parseAuthDeepLink(`smcprostudio://auth/reset-password/?code=${CODE}`), { route: "/auth/reset-password", code: CODE, error: null });
  assert.deepEqual(parseAuthDeepLink("smcprostudio://auth/callback#error_description=Email+link+is+invalid+or+has+expired"), {
    route: "/auth/callback", code: null, error: "Email link is invalid or has expired",
  });
});

test("rejects anything that is not exactly an SMC auth link", () => {
  const rejected = [
    undefined, null, 42, "", "not a url", `${"a".repeat(5000)}`,
    `https://smcprostudio.app/auth/callback?code=${CODE}`, // wrong scheme
    `javascript:alert(1)//smcprostudio://auth/callback`,
    `smcprostudio://evil/callback?code=${CODE}`, // wrong host
    `smcprostudio://auth/profile?code=${CODE}`, // unknown path
    `smcprostudio://auth/callback/extra?code=${CODE}`,
    `smcprostudio://auth/../profile?code=${CODE}`,
    `smcprostudio://user:pass@auth/callback?code=${CODE}`, // credentials
    `smcprostudio://auth:8080/callback?code=${CODE}`, // port
    `SMCPROSTUDIO://AUTH/CALLBACK/x`,
  ];
  for (const raw of rejected) assert.equal(parseAuthDeepLink(raw), null, String(raw).slice(0, 80));
});

test("a malformed or oversized code is treated as missing; error text is capped plain text", () => {
  assert.equal(parseAuthDeepLink("smcprostudio://auth/callback?code=<script>").code, null);
  assert.equal(parseAuthDeepLink("smcprostudio://auth/callback?code=abc").code, null);
  assert.equal(parseAuthDeepLink(`smcprostudio://auth/callback?error_description=${"x".repeat(1000)}`).error.length, 300);
});

test("callback link: exchanges the code once, opens /auth/callback, reports done", async () => {
  const d = deps();
  assert.equal(await handleAuthDeepLink(`smcprostudio://auth/callback?code=${CODE}`, d), true);
  assert.deepEqual(exchanged, [CODE]);
  assert.deepEqual(d.navigations, [["/auth/callback", { replace: true }]]);
  assert.deepEqual(getAuthRedirectStatus(), { state: "done" });
});

test("password-reset link: exchanges the recovery code and opens the reset screen", async () => {
  const d = deps();
  await handleAuthDeepLink(`smcprostudio://auth/reset-password?code=${CODE}`, d);
  assert.deepEqual(exchanged, [CODE]);
  assert.deepEqual(d.navigations, [["/auth/reset-password", { replace: true }]]);
  assert.deepEqual(getAuthRedirectStatus(), { state: "done" });
});

test("malformed links do nothing at all: no navigation, no exchange, no status change", async () => {
  const d = deps();
  assert.equal(await handleAuthDeepLink("smcprostudio://evil/callback?code=" + CODE, d), false);
  assert.equal(await handleAuthDeepLink("https://example.com/?code=" + CODE, d), false);
  assert.deepEqual(d.navigations, []);
  assert.deepEqual(exchanged, []);
  assert.deepEqual(getAuthRedirectStatus(), { state: "idle" });
});

test("an error link or a link without a code shows an error and exchanges nothing", async () => {
  const d = deps();
  await handleAuthDeepLink("smcprostudio://auth/callback?error_description=Email%20link%20has%20expired", d);
  assert.deepEqual(getAuthRedirectStatus(), { state: "error", message: "Email link has expired" });
  await handleAuthDeepLink("smcprostudio://auth/reset-password", d);
  assert.deepEqual(getAuthRedirectStatus(), { state: "error", message: AUTH_LINK_INVALID_MESSAGE });
  assert.deepEqual(exchanged, []);
});

test("a rejected exchange shows a safe message, never the server's raw error", async () => {
  exchangeImpl = async () => ({ error: { message: "invalid flow state, no valid flow state found", status: 400 } });
  await handleAuthDeepLink(`smcprostudio://auth/callback?code=${CODE}`, deps());
  assert.deepEqual(getAuthRedirectStatus(), { state: "error", message: AUTH_LINK_INVALID_MESSAGE });
});

test("web path shares the same exchange and status (and strips the code from the address)", async () => {
  window.history.replaceState({}, "", `/auth/callback?code=${CODE}`);
  await completeAuthRedirect(window.location.href);
  assert.deepEqual(exchanged, [CODE]);
  assert.equal(window.location.search, "");
  assert.deepEqual(getAuthRedirectStatus(), { state: "done" });
});

async function renderCallback() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  await React.act(async () =>
    createRoot(container).render(
      React.createElement(MemoryRouter, { initialEntries: ["/auth/callback"] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: "/auth/callback", element: React.createElement(AuthCallbackRoute) }),
          React.createElement(Route, { path: "/profile", element: React.createElement("p", null, "PROFILE") }),
        )),
    ),
  );
  return container;
}

test("/auth/callback: waits while pending, then opens the profile once signed in", async () => {
  setAuthRedirectStatus({ state: "pending" });
  authState = { status: "loading" };
  const c = await renderCallback();
  assert.match(c.textContent, /Confirming your account/);
  authState = { status: "authenticated" };
  await React.act(async () => setAuthRedirectStatus({ state: "done" }));
  assert.equal(c.textContent, "PROFILE");
});

test("/auth/callback: an error is shown with a way to sign in; success is never claimed", async () => {
  setAuthRedirectStatus({ state: "error", message: AUTH_LINK_INVALID_MESSAGE });
  const c = await renderCallback();
  assert.match(c.textContent, /This link can't be used/);
  assert.match(c.textContent, /invalid or has expired/);
  assert.ok(c.querySelector('a[href="/auth"]'));
  assert.doesNotMatch(c.textContent, /confirmed|success/i);
});

test("/auth/callback: done but signed out asks to sign in without claiming confirmation", async () => {
  setAuthRedirectStatus({ state: "done" });
  const c = await renderCallback();
  assert.match(c.textContent, /Sign in to continue/);
  assert.doesNotMatch(c.textContent, /is confirmed|success/i);
});
