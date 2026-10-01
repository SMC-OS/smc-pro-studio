import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// V1 launch gate: /settings and the shared DeleteAccountPanel (request →
// typed confirmation → scheduled → cancel), with the real accountClient.ts
// running against a fake Supabase client that models the two RPCs.

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
let active; // the member's active request row, or null
let rpcError;
const rpcCalls = [];
let tableReads = 0;
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
        const b = {
          select: () => b, eq: () => b, in: () => b, order: () => b,
          async limit() { tableReads += 1; return { data: active ? [active] : [], error: null }; },
        };
        return b;
      },
      rpc: async (name) => {
        rpcCalls.push(name);
        if (rpcError) return { data: null, error: rpcError };
        if (name === "request_account_deletion") {
          active ??= { id: "r1", status: "requested", requested_at: "2026-10-01T09:00:00.000Z", scheduled_for: "2026-10-15T09:00:00.000Z", cancellation_requested_at: null };
          return { data: [active], error: null };
        }
        if (name === "cancel_account_deletion") {
          const row = { ...active, status: "cancelled", cancellation_requested_at: "2026-10-02T09:00:00.000Z" };
          active = null;
          return { data: [row], error: null };
        }
        throw new Error(`unexpected rpc ${name}`);
      },
    }),
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: SettingsRoute } = await import(new URL("../src/social/routes/SettingsRoute.tsx", import.meta.url).href);
const { CONFIRM_WORD } = await import(new URL("../src/social/components/DeleteAccountPanel.tsx", import.meta.url).href);

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
function type(field, value) {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(field, value);
  field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
async function submitConfirmation(c, word) {
  const input = c.querySelector('form input');
  await React.act(async () => type(input, word));
  await click(button(c, "Request deletion"));
}

test.beforeEach(() => {
  authState = { status: "authenticated", session: { subject: USER_ID, email: "alder@example.test", roles: [] } };
  active = null;
  rpcError = null;
  rpcCalls.length = 0;
  tableReads = 0;
  signOutCalls = 0;
});

test("guests are asked to sign in and no account query runs", async () => {
  authState = { status: "guest" };
  const c = await mount();
  assert.match(c.textContent, /Sign in to manage your account/);
  assert.equal(tableReads, 0);
});

test("Settings links every policy and support surface, using support@smcprostudio.app", async () => {
  const c = await mount();
  assert.match(c.textContent, /Signed in as alder@example\.test/);
  for (const href of ["/profile/edit", "/support", "/privacy", "/terms", "/community-guidelines"]) {
    assert.ok(c.querySelector(`a[href="${href}"]`), `missing link to ${href}`);
  }
  assert.ok(c.querySelector('a[href="mailto:support@smcprostudio.app"]'));
  assert.doesNotMatch(c.innerHTML, /outlook\.com/);
  await click(button(c, "Sign out"));
  assert.equal(signOutCalls, 1);
});

test("deletion needs the typed confirmation; a wrong word or 'Keep my account' requests nothing", async () => {
  const c = await mount();
  await click(button(c, "Delete my account"));
  assert.ok(document.activeElement === c.querySelector('form input'), "focus moves to the confirmation field");
  await submitConfirmation(c, "delete it");
  assert.match(c.querySelector('[role="alert"]').textContent, new RegExp(`Type ${CONFIRM_WORD} to confirm`));
  assert.deepEqual(rpcCalls, []);
  await click(button(c, "Keep my account"));
  assert.deepEqual(rpcCalls, []);
  assert.ok(button(c, "Delete my account"));
});

test("confirming schedules deletion and shows the server's date — never 'deleted'", async () => {
  const c = await mount();
  await click(button(c, "Delete my account"));
  await submitConfirmation(c, CONFIRM_WORD);
  assert.deepEqual(rpcCalls, ["request_account_deletion"]);
  assert.match(c.textContent, /You asked to delete your account on 1 October 2026\./);
  assert.match(c.textContent, /Unless you cancel, it will be deleted after 15 October 2026\./);
  assert.doesNotMatch(c.textContent, /has been deleted|account deleted/i);
  assert.ok(button(c, "Cancel deletion"));
});

test("an existing request is shown on load and can be cancelled within the window", async () => {
  active = { id: "r1", status: "requested", requested_at: "2026-09-30T09:00:00.000Z", scheduled_for: "2999-01-01T00:00:00.000Z", cancellation_requested_at: null };
  const c = await mount();
  assert.equal(button(c, "Delete my account"), undefined);
  await click(button(c, "Cancel deletion"));
  assert.deepEqual(rpcCalls, ["cancel_account_deletion"]);
  assert.match(c.textContent, /Deletion cancelled\. Your account will stay open\./);
  assert.ok(button(c, "Delete my account"), "a new request can be started");
});

test("once the window has passed (or processing started) there is no in-app cancel; support is offered", async () => {
  active = { id: "r1", status: "requested", requested_at: "2026-09-01T09:00:00.000Z", scheduled_for: "2026-09-15T09:00:00.000Z", cancellation_requested_at: null };
  let c = await mount();
  assert.equal(button(c, "Cancel deletion"), undefined);
  assert.match(c.textContent, /Deletion is being processed\./);
  assert.ok(c.querySelector('a[href^="mailto:support@smcprostudio.app"]'));
  active = { ...active, status: "retention_review", scheduled_for: "2999-01-01T00:00:00.000Z" };
  c = await mount();
  assert.equal(button(c, "Cancel deletion"), undefined);
});

test("a failed request shows only the safe message and keeps the confirmation open", async () => {
  rpcError = { code: "42501", message: 'permission denied for function request_account_deletion' };
  const c = await mount();
  await click(button(c, "Delete my account"));
  await submitConfirmation(c, CONFIRM_WORD);
  assert.match(c.textContent, /Your deletion request could not be recorded\. Please try again\./);
  assert.doesNotMatch(c.innerHTML, /permission denied|42501|request_account_deletion/);
  assert.ok(button(c, "Request deletion"));
});
