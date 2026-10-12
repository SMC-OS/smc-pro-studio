import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// V1-7: temporary connection loss must never sign a member out, clear their
// session, or turn their session check into a "Sign in to …" prompt.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
let deviceOnline = true;
Object.defineProperty(dom.window.navigator, "onLine", { get: () => deviceOnline, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class AuthSessionUnavailableError extends Error {
  constructor() {
    super("Your session can't be checked right now.");
    this.name = "AuthSessionUnavailableError";
  }
}
const SESSION = { subject: "u1", email: "member@example.test", emailVerified: true, roles: [] };
let sessionImpl = async () => SESSION;
let authCallback = null;
let signOutCalls = 0;
mock.module(new URL("../src/services/authClient.ts", import.meta.url).href, {
  exports: {
    getAuthSession: (...args) => sessionImpl(...args),
    onAuthSessionChange: (cb) => {
      authCallback = cb;
      return () => {};
    },
    signOut: async () => {
      signOutCalls += 1;
    },
    AuthSessionUnavailableError,
  },
});

let getUserImpl = async () => ({ data: { user: { id: "u1" } }, error: null });
const inserts = [];
mock.module(new URL("../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => ({
      auth: { getUser: () => getUserImpl() },
      from: () => ({ insert: async (row) => (inserts.push(row), { error: null }) }),
    }),
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { useAuthSession } = await import(new URL("../src/social/services/useAuthSession.ts", import.meta.url).href);
const { createPost, fetchOwnProfile, SocialUnavailableError } = await import(new URL("../src/social/services/socialClient.ts", import.meta.url).href);
const { describeError, OFFLINE_ACTION_MESSAGE } = await import(new URL("../src/social/services/networkErrors.ts", import.meta.url).href);

async function flush(ms = 10) {
  await React.act(async () => new Promise((r) => setTimeout(r, ms)));
}
let seen;
function Probe() {
  seen = useAuthSession();
  return null;
}
async function mountProbe() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  await React.act(async () => createRoot(container).render(React.createElement(Probe)));
  await flush();
}
const networkFailure = () => Object.assign(new Error("Failed to fetch"), { name: "AuthRetryableFetchError", status: 0 });

test.beforeEach(() => {
  sessionImpl = async () => SESSION;
  deviceOnline = true;
  signOutCalls = 0;
});

test("a signed-in member stays signed in when a later session check fails for lack of connection", async () => {
  await mountProbe();
  assert.equal(seen.status, "authenticated");
  deviceOnline = false;
  dom.window.dispatchEvent(new dom.window.Event("offline"));
  sessionImpl = async () => {
    throw new AuthSessionUnavailableError();
  };
  await React.act(async () => authCallback("TOKEN_REFRESHED", null));
  await flush();
  assert.equal(seen.status, "authenticated", "not turned into a guest");
  assert.equal(seen.session.email, "member@example.test");
  assert.equal(signOutCalls, 0, "nothing signs the member out");
});

test("when the connection returns, the session is checked again and confirmed", async () => {
  sessionImpl = async () => {
    throw new AuthSessionUnavailableError();
  };
  deviceOnline = false;
  dom.window.dispatchEvent(new dom.window.Event("offline"));
  await mountProbe();
  assert.equal(seen.status, "loading", "an unverifiable first check never claims 'guest'");
  sessionImpl = async () => SESSION;
  deviceOnline = true;
  await React.act(async () => dom.window.dispatchEvent(new dom.window.Event("online")));
  await flush();
  assert.equal(seen.status, "authenticated");
});

test("a real, successful check with no session still produces guest (genuine sign-out keeps working)", async () => {
  await mountProbe();
  sessionImpl = async () => null;
  await React.act(async () => authCallback("SIGNED_OUT", null));
  await flush();
  assert.equal(seen.status, "guest");
});

test("posting while the session check can't reach the server is a temporary problem, not 'Sign in to post'", async () => {
  getUserImpl = async () => ({ data: { user: null }, error: networkFailure() });
  await assert.rejects(() => createPost({ body: "Hello", visibility: "public", postType: "general" }), (err) => {
    assert.ok(err instanceof SocialUnavailableError);
    assert.doesNotMatch(err.message, /Sign in/);
    assert.deepEqual(describeError(err, "x"), { message: OFFLINE_ACTION_MESSAGE, isNetwork: true });
    return true;
  });
  assert.equal(inserts.length, 0, "nothing is sent, nothing claims success");
  await assert.rejects(() => fetchOwnProfile(), SocialUnavailableError, "own profile isn't reported as missing either");
});

test("a genuinely signed-out member still gets the sign-in message", async () => {
  getUserImpl = async () => ({ data: { user: null }, error: null });
  await assert.rejects(() => createPost({ body: "Hello", visibility: "public", postType: "general" }), /Sign in to post\./);
  assert.equal(await fetchOwnProfile(), null);
});
