import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// V1-2 / V1-6: mounted coverage for /settings and the real accountClient.ts
// running against a fake Supabase client.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const USER_ID = "a0000000-0000-0000-0000-000000000001";
let authState;
let rows; // the fake account_deletion_requests table
let insertError;
let updateError;
const ops = [];
let signOutCalls = 0;

mock.module(new URL("../src/social/services/useAuthSession.ts", import.meta.url).href, {
  exports: { useAuthSession: () => authState },
});
mock.module(new URL("../src/services/authClient.ts", import.meta.url).href, {
  exports: { signOut: async () => { signOutCalls += 1; } },
});
mock.module(new URL("../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
      from: (table) => {
        assert.equal(table, "account_deletion_requests");
        const q = { op: "select", filters: [], values: null };
        const b = {
          select() { return b; },
          insert(v) { q.op = "insert"; q.values = v; return b; },
          update(v) { q.op = "update"; q.values = v; return b; },
          eq(c, v) { q.filters.push(["eq", c, v]); return b; },
          in(c, v) { q.filters.push(["in", c, v]); return b; },
          order() { return b; },
          async limit() { ops.push(q); return { data: rows.filter((r) => ["requested", "identity_locked", "retention_review"].includes(r.status)), error: null }; },
          async single() {
            ops.push(q);
            if (insertError) return { data: null, error: insertError };
            const row = { id: "r1", status: "requested", requested_at: "2026-10-01T09:00:00.000Z", cancellation_requested_at: null };
            rows.push(row);
            return { data: row, error: null };
          },
          async maybeSingle() {
            ops.push(q);
            if (updateError) return { data: null, error: updateError };
            const row = rows.find((r) => r.status === "requested");
            if (!row) return { data: null, error: null };
            row.cancellation_requested_at = q.values.cancellation_requested_at;
            return { data: row, error: null };
          },
        };
        return b;
      },
    }),
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: SettingsRoute, SUPPORT_EMAIL } = await import(new URL("../src/social/routes/SettingsRoute.tsx", import.meta.url).href);

async function flush(ms = 20) {
  await React.act(async () => { await new Promise((r) => setTimeout(r, ms)); });
}
async function mount() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ["/settings"] }, React.createElement(SettingsRoute)));
  });
  await flush();
  return container;
}
const button = (c, text) => [...c.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
async function click(el) {
  assert.ok(el, "expected the control to exist");
  await React.act(async () => el.click());
  await flush();
}

test.beforeEach(() => {
  authState = { status: "authenticated", session: { subject: USER_ID, email: "alder@example.test", roles: [] } };
  rows = [];
  insertError = null;
  updateError = null;
  ops.length = 0;
  signOutCalls = 0;
});

test("guests are asked to sign in and no account query runs", async () => {
  authState = { status: "guest" };
  const c = await mount();
  assert.match(c.textContent, /Sign in to manage your account/);
  assert.equal(ops.length, 0);
});

test("shows the account email, profile, guidelines, support and sign-out entries", async () => {
  const c = await mount();
  assert.match(c.textContent, /Signed in as alder@example\.test/);
  assert.ok(c.querySelector('a[href="/profile/edit"]'));
  assert.ok(c.querySelector('a[href="/community-guidelines"]'));
  assert.ok(c.querySelector(`a[href="mailto:${SUPPORT_EMAIL}"]`));
  await click(button(c, "Sign out"));
  assert.equal(signOutCalls, 1);
});

test("deletion needs an explicit confirmation; 'Keep my account' writes nothing", async () => {
  const c = await mount();
  await click(button(c, "Delete my account"));
  assert.match(c.textContent, /Are you sure you want to delete your account\?/);
  assert.equal(document.activeElement, button(c, "Yes, request deletion"), "focus moves to the confirm action");
  await click(button(c, "Keep my account"));
  assert.ok(!ops.some((o) => o.op === "insert"));
  assert.ok(button(c, "Delete my account"));
});

test("confirming records a request for the signed-in user only, then shows its pending status — never 'deleted'", async () => {
  const c = await mount();
  await click(button(c, "Delete my account"));
  await click(button(c, "Yes, request deletion"));
  const insert = ops.find((o) => o.op === "insert");
  assert.deepEqual(insert.values, { user_id: USER_ID });
  assert.match(c.textContent, /Deletion requested on 1 October 2026\./);
  assert.match(c.textContent, /The SMC Pro Studio team will delete your account/);
  assert.doesNotMatch(c.textContent, /has been deleted|account deleted|within \d+ days/i);
  assert.ok(button(c, "Cancel deletion request"));
});

test("an existing active request is shown on load; cancelling records the cancellation", async () => {
  rows = [{ id: "r1", status: "requested", requested_at: "2026-09-30T09:00:00.000Z", cancellation_requested_at: null }];
  const c = await mount();
  assert.match(c.textContent, /Deletion requested on 30 September 2026\./);
  assert.equal(button(c, "Delete my account"), undefined, "no second request can be started");
  await click(button(c, "Cancel deletion request"));
  const update = ops.find((o) => o.op === "update");
  assert.deepEqual(Object.keys(update.values), ["cancellation_requested_at"]);
  assert.deepEqual(update.filters.filter((f) => f[1] === "user_id"), [["eq", "user_id", USER_ID]]);
  assert.match(c.textContent, /You asked to cancel this request on/);
});

test("a request already being processed can't be cancelled in-app and points to support", async () => {
  rows = [{ id: "r1", status: "retention_review", requested_at: "2026-09-30T09:00:00.000Z", cancellation_requested_at: null }];
  const c = await mount();
  assert.equal(button(c, "Cancel deletion request"), undefined);
  assert.match(c.textContent, /already being processed/);
});

test("a failed request shows only the safe message and leaves the confirmation open", async () => {
  insertError = { code: "42501", message: 'new row violates row-level security policy for table "account_deletion_requests"' };
  const c = await mount();
  await click(button(c, "Delete my account"));
  await click(button(c, "Yes, request deletion"));
  assert.match(c.textContent, /Your deletion request could not be recorded\. Please try again\./);
  assert.doesNotMatch(c.innerHTML, /row-level|42501|account_deletion_requests/);
  assert.ok(button(c, "Yes, request deletion"));
});
