import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase M1: the single auth-storage abstraction. Native sessions go to OS
// secure storage (Keychain / Keystore) instead of memory; the web keeps
// sessionStorage. Exercised with the real supabase-js client.

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { selectAuthStorage, createSecureAuthStorage, NATIVE_KEY_PREFIX } = await import(
  new URL("../src/services/authStorage.ts", import.meta.url).href
);
const { KeychainAccess } = await import("@aparajita/capacitor-secure-storage");
const { createClient } = await import("@supabase/supabase-js");

/** In-memory stand-in for the secure-storage plugin that records every call. */
function fakeSecureStorage({ failGet = false, failSet = false, failRemove = false } = {}) {
  const store = new Map();
  const calls = [];
  let prefix = "";
  return {
    store,
    calls,
    async setKeyPrefix(p) { calls.push(["setKeyPrefix", p]); prefix = p; },
    async setSynchronize(s) { calls.push(["setSynchronize", s]); },
    async setDefaultKeychainAccess(a) { calls.push(["setDefaultKeychainAccess", a]); },
    async getItem(k) { calls.push(["getItem", k]); if (failGet) throw new Error("osError"); return store.get(prefix + k) ?? null; },
    async setItem(k, v) { calls.push(["setItem", k]); if (failSet) throw new Error("osError"); store.set(prefix + k, v); },
    async removeItem(k) { calls.push(["removeItem", k]); if (failRemove) throw new Error("osError"); store.delete(prefix + k); },
  };
}

const futureSession = (seconds) => ({
  access_token: "header.payload.signature",
  refresh_token: "refresh-token-value",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + seconds,
  user: { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated", role: "authenticated", email: "member@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
});

const STORAGE_KEY = "sb-test-auth-token";
// A closed local port: every request fails like a lost connection would.
// The client is created without jsdom's browser globals: in "browser" mode
// supabase-js opens a cross-tab BroadcastChannel that keeps the test process
// alive. The storage behaviour under test is identical either way.
const unreachableClient = (storage) => {
  const saved = { window: globalThis.window, document: globalThis.document };
  delete globalThis.window;
  delete globalThis.document;
  try {
    return createClient("http://127.0.0.1:9", "anon-key", {
      auth: { storage, storageKey: STORAGE_KEY, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: "pkce" },
    });
  } finally {
    Object.assign(globalThis, saved);
  }
};

test("selection: native uses the secure store, web uses sessionStorage", async () => {
  const secure = fakeSecureStorage();
  const native = selectAuthStorage(true, secure);
  await native.setItem("k", "v");
  assert.equal(secure.store.get(`${NATIVE_KEY_PREFIX}k`), "v");
  assert.equal(window.sessionStorage.getItem("k"), null, "native never writes browser storage");

  const web = selectAuthStorage(false, secure);
  await web.setItem("w", "1");
  assert.equal(window.sessionStorage.getItem("w"), "1");
  assert.equal(secure.store.has(`${NATIVE_KEY_PREFIX}w`), false, "web never writes the native store");
  window.sessionStorage.clear();
});

test("secure adapter is configured once: own prefix, no iCloud sync, this-device-only after first unlock", async () => {
  const secure = fakeSecureStorage();
  const storage = createSecureAuthStorage(secure);
  await storage.getItem("a");
  await storage.setItem("a", "1");
  await storage.removeItem("a");
  const config = secure.calls.filter(([name]) => name.startsWith("set") && name !== "setItem");
  assert.deepEqual(config, [
    ["setKeyPrefix", "smc_auth_"],
    ["setSynchronize", false],
    ["setDefaultKeychainAccess", KeychainAccess.afterFirstUnlockThisDeviceOnly],
  ]);
});

test("a read failure looks like 'nothing stored' and never deletes anything", async () => {
  const secure = fakeSecureStorage({ failGet: true });
  secure.store.set(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`, JSON.stringify(futureSession(3600)));
  const storage = createSecureAuthStorage(secure);
  assert.equal(await storage.getItem(STORAGE_KEY), null);
  assert.equal(secure.calls.some(([name]) => name === "removeItem"), false);
  assert.ok(secure.store.has(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`), "the stored session survives");
});

test("write and remove failures are swallowed (no throw into Supabase)", async () => {
  const storage = createSecureAuthStorage(fakeSecureStorage({ failSet: true, failRemove: true }));
  await storage.setItem("k", "v");
  await storage.removeItem("k");
});

test("session restoration: a fresh client (app restart) restores the stored session", async () => {
  const secure = fakeSecureStorage();
  secure.store.set(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`, JSON.stringify(futureSession(3600)));
  const { data, error } = await unreachableClient(createSecureAuthStorage(secure)).auth.getSession();
  assert.equal(error, null);
  assert.equal(data.session?.user.email, "member@example.test");
});

test("an expired session whose refresh hits a lost connection is kept, not cleared", async () => {
  const secure = fakeSecureStorage();
  secure.store.set(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`, JSON.stringify(futureSession(-60)));
  const { data, error } = await unreachableClient(createSecureAuthStorage(secure)).auth.getSession();
  assert.equal(data.session, null);
  assert.equal(error?.name, "AuthRetryableFetchError", "reported as temporary");
  assert.equal(secure.calls.some(([name]) => name === "removeItem"), false, "nothing removed");
  assert.ok(secure.store.has(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`), "the session is still stored for the next attempt");
});

test("sign-out removes the session from the secure store", async () => {
  const secure = fakeSecureStorage();
  secure.store.set(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`, JSON.stringify(futureSession(3600)));
  await unreachableClient(createSecureAuthStorage(secure)).auth.signOut({ scope: "local" });
  assert.equal(secure.store.has(`${NATIVE_KEY_PREFIX}${STORAGE_KEY}`), false);
});

test("nothing is logged while storing, restoring or failing", async () => {
  const logged = [];
  const originals = {};
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    originals[level] = console[level];
    console[level] = (...args) => logged.push(args.join(" "));
  }
  try {
    const ok = createSecureAuthStorage(fakeSecureStorage());
    await ok.setItem(STORAGE_KEY, JSON.stringify(futureSession(3600)));
    await ok.getItem(STORAGE_KEY);
    const failing = createSecureAuthStorage(fakeSecureStorage({ failGet: true, failSet: true, failRemove: true }));
    await failing.getItem(STORAGE_KEY);
    await failing.setItem(STORAGE_KEY, "refresh-token-value");
    await failing.removeItem(STORAGE_KEY);
  } finally {
    Object.assign(console, originals);
  }
  assert.deepEqual(logged, []);
});
