import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// V1-2 real-backend gate: account deletion requests through the real
// accountClient.ts against real RLS. Same environment contract as the other
// tests/integration files (local only; service key for fixtures only).

const URL_ = process.env.SMC_REAL_SUPABASE_URL;
const ANON = process.env.SMC_REAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.SMC_REAL_SUPABASE_SERVICE_KEY;
const configured = Boolean(URL_ && ANON && SERVICE);
if (configured && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) throw new Error("refusing non-local Supabase URL");

const newClient = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = configured ? newClient() : null;
let activeClient = anonClient;
mock.module(new URL("../../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: { isSupabaseConfigured: configured, getSupabaseClient: () => activeClient },
});
const { requestAccountDeletion, fetchActiveDeletionRequest, cancelAccountDeletion } = await import(
  new URL("../../src/social/services/accountClient.ts", import.meta.url).href
);

const T = `zd${Date.now().toString(36)}`;
const service = configured ? createClient(URL_, SERVICE, { auth: { persistSession: false } }) : null;
const ids = [];
async function user(label) {
  const email = `${T}-${label}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: "Integration-Test-Pass-1", email_confirm: true });
  if (error) throw error;
  ids.push(data.user.id);
  const client = newClient();
  await client.auth.signInWithPassword({ email, password: "Integration-Test-Pass-1" });
  return { id: data.user.id, client };
}
const as = async (u, fn) => { activeClient = u.client; try { return await fn(); } finally { activeClient = anonClient; } };

let alice;
let bob;
before(async () => { if (configured) { alice = await user("alice"); bob = await user("bob"); } });
after(async () => {
  if (!configured) return;
  await service.from("account_deletion_requests").delete().in("user_id", ids);
  for (const id of ids) await service.auth.admin.deleteUser(id);
});
const skip = configured ? false : "SMC_REAL_SUPABASE_* not set — real-backend gate not run";

test("no request exists until one is made; requesting is idempotent", { skip }, async () => {
  assert.equal(await as(alice, fetchActiveDeletionRequest), null);
  const first = await as(alice, requestAccountDeletion);
  assert.equal(first.status, "requested");
  const again = await as(alice, requestAccountDeletion);
  assert.equal(again.id, first.id, "a second request returns the active one instead of failing or duplicating");
  assert.equal((await as(alice, fetchActiveDeletionRequest)).id, first.id);
});

test("another user can neither see nor cancel someone else's request", { skip }, async () => {
  const mine = await as(alice, fetchActiveDeletionRequest);
  assert.equal(await as(bob, fetchActiveDeletionRequest), null);
  const peek = await bob.client.from("account_deletion_requests").select("id").eq("id", mine.id);
  assert.deepEqual(peek.data, []);
  await assert.rejects(() => as(bob, () => cancelAccountDeletion(mine.id)), /cancellation could not be recorded/);
  const { data } = await service.from("account_deletion_requests").select("cancellation_requested_at").eq("id", mine.id).single();
  assert.equal(data.cancellation_requested_at, null);
});

test("owners cannot fast-track, complete or annotate their own request", { skip }, async () => {
  const mine = await as(alice, fetchActiveDeletionRequest);
  for (const patch of [{ status: "completed" }, { internal_notes: "x" }, { completed_at: new Date().toISOString() }]) {
    const r = await alice.client.from("account_deletion_requests").update(patch).eq("id", mine.id);
    assert.ok(r.error, `${Object.keys(patch)[0]} is not owner-writable`);
  }
  const forged = await alice.client.from("account_deletion_requests").insert({ user_id: bob.id });
  assert.ok(forged.error, "cannot file a deletion request for someone else");
});

test("the owner can request cancellation of a still-pending request", { skip }, async () => {
  const mine = await as(alice, fetchActiveDeletionRequest);
  const cancelled = await as(alice, () => cancelAccountDeletion(mine.id));
  assert.ok(cancelled.cancellation_requested_at);
  assert.equal(cancelled.status, "requested", "staff process the cancellation; status is not self-changed");
});

test("anon cannot create or read deletion requests", { skip }, async () => {
  const ins = await anonClient.from("account_deletion_requests").insert({ user_id: alice.id });
  assert.ok(ins.error);
  const sel = await anonClient.from("account_deletion_requests").select("id");
  assert.ok(sel.error || sel.data.length === 0);
});
