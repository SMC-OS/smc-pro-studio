import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// V1 launch gate real-backend proof: account deletion end to end —
// request → cancel → request → (window passes) → server processor
// (scripts/process-account-deletions.mjs) → anonymised data, closed sign-in,
// removed files — and "SMC Team" can no longer be self-assigned.
// Real Auth, PostgREST, Storage and Postgres; only supabase-js configuration is
// injected. The service key is used for fixtures and for the processor, which
// is a server-side job by design.

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
const { processAccountDeletions } = await import(new URL("../../scripts/process-account-deletions.mjs", import.meta.url).href);

const T = `zd${Date.now().toString(36)}`;
const PASSWORD = "Integration-Test-Pass-1";
const service = configured ? createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const ids = [];

async function user(label, metadata = {}) {
  const email = `${T}-${label}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: metadata });
  if (error) throw error;
  ids.push(data.user.id);
  const client = newClient();
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, client };
}
const as = async (u, fn) => { activeClient = u.client; try { return await fn(); } finally { activeClient = anonClient; } };
const makeDue = (userId) =>
  service.from("account_deletion_requests").update({ scheduled_for: new Date(Date.now() - 60_000).toISOString() }).eq("user_id", userId).eq("status", "requested");

let alice;
let bob;
before(async () => {
  if (!configured) return;
  alice = await user("alice", { display_name: `${T} Alice`, account_type: "professional", professional_category: "stone_fabricator" });
  bob = await user("bob", { display_name: `${T} Bob` });
});
after(async () => {
  if (!configured) return;
  await service.from("account_deletion_requests").delete().in("user_id", ids);
  for (const id of ids) await service.auth.admin.deleteUser(id).catch(() => {});
});
const skip = configured ? false : "SMC_REAL_SUPABASE_* not set — real-backend gate not run";

test("SMC Team: sign-up metadata cannot create it, and a member cannot switch to it", { skip }, async () => {
  const c = newClient();
  const { data, error } = await c.auth.signUp({
    email: `${T}-impostor@example.test`,
    password: PASSWORD,
    options: { data: { display_name: "Impostor", account_type: "professional", professional_category: "smc_team" } },
  });
  assert.equal(error, null);
  ids.push(data.user.id);
  const { data: pp } = await service.from("professional_profiles").select("category").eq("user_id", data.user.id).single();
  assert.equal(pp.category, "other");

  const sw = await alice.client.from("professional_profiles").update({ category: "smc_team" }).eq("user_id", alice.id);
  assert.equal(sw.error?.code, "42501");
  const staff = await service.from("professional_profiles").update({ category: "smc_team" }).eq("user_id", alice.id);
  assert.equal(staff.error, null, "staff/server assignment still works");
  await service.from("professional_profiles").update({ category: "stone_fabricator" }).eq("user_id", alice.id);
});

test("a member can request, see the scheduled date, cancel, and request again", { skip }, async () => {
  assert.equal(await as(alice, fetchActiveDeletionRequest), null);
  const first = await as(alice, requestAccountDeletion);
  assert.equal(first.status, "requested");
  const days = (Date.parse(first.scheduled_for) - Date.parse(first.requested_at)) / 86_400_000;
  assert.ok(Math.abs(days - 14) < 0.01, `scheduled 14 days out (got ${days})`);
  assert.equal((await as(alice, requestAccountDeletion)).id, first.id, "idempotent");
  const cancelled = await as(alice, cancelAccountDeletion);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(await as(alice, fetchActiveDeletionRequest), null);
  const second = await as(alice, requestAccountDeletion);
  assert.notEqual(second.id, first.id);
});

test("RLS: nobody else can see a member's request, and direct writes are refused", { skip }, async () => {
  assert.equal(await as(bob, fetchActiveDeletionRequest), null);
  const forged = await bob.client.from("account_deletion_requests").insert({ user_id: alice.id });
  assert.ok(forged.error);
  const own = await alice.client.from("account_deletion_requests").update({ status: "completed" }).eq("user_id", alice.id);
  assert.ok(own.error, "even the owner cannot change status directly");
  await assert.rejects(() => as(bob, cancelAccountDeletion), /could not be cancelled/);
  const run = await alice.client.rpc("process_due_account_deletions", { p_limit: 5 });
  assert.equal(run.error?.code, "42501", "members cannot run processing");
  const anonRun = await anonClient.rpc("request_account_deletion");
  assert.equal(anonRun.error?.code, "42501");
});

test("processing before the window ends changes nothing", { skip }, async () => {
  const summary = await processAccountDeletions(service);
  assert.ok(!summary.failures.some(Boolean));
  const { data } = await service.from("profiles").select("display_name").eq("id", alice.id).single();
  assert.equal(data.display_name, `${T} Alice`);
});

test("after the window: data anonymised, files removed, sign-in closed, other members unaffected", { skip }, async () => {
  // Content to remove: a public post, a follow, a message to Bob, an avatar file.
  await alice.client.from("profiles").update({ bio: "Alice bio", onboarding_completed: true }).eq("id", alice.id);
  const post = await alice.client.from("posts").insert({ author_id: alice.id, body: `${T} post`, visibility: "public" }).select("id").single();
  assert.equal(post.error, null);
  await bob.client.from("follows").insert({ follower_id: bob.id, followee_id: alice.id });
  const { data: convId } = await alice.client.rpc("create_direct_conversation", { other_user_id: bob.id });
  const msg = await alice.client.from("messages").insert({ conversation_id: convId, sender_id: alice.id, body: "Hello Bob" }).select("id").single();
  assert.equal(msg.error, null);
  await bob.client.from("messages").insert({ conversation_id: convId, sender_id: bob.id, body: "Hi Alice" });
  const avatar = await alice.client.storage.from("avatars").upload(`${alice.id}/me.png`, Buffer.from([0x89, 0x50, 0x4e, 0x47]), { contentType: "image/png" });
  assert.equal(avatar.error, null, "fixture avatar uploaded under the member's own folder");

  await makeDue(alice.id);
  const summary = await processAccountDeletions(service);
  assert.ok(summary.anonymised >= 1);
  assert.deepEqual(summary.failures, []);

  const { data: profile } = await service.from("profiles").select("display_name, username, bio, visibility").eq("id", alice.id).single();
  assert.deepEqual(profile, { display_name: "Deleted member", username: null, bio: null, visibility: "private" });
  assert.equal((await service.from("posts").select("id").eq("author_id", alice.id)).data.length, 0);
  assert.equal((await service.from("follows").select("follower_id").eq("followee_id", alice.id)).data.length, 0);
  assert.equal((await service.from("professional_profiles").select("user_id").eq("user_id", alice.id)).data.length, 0);
  const { data: msgs } = await service.from("messages").select("sender_id, body").eq("conversation_id", convId).order("created_at");
  assert.deepEqual(msgs.map((m) => m.body), ["This message was deleted.", "Hi Alice"], "her text is removed; Bob's stays");
  const files = await service.storage.from("avatars").list(alice.id);
  assert.deepEqual(files.data, [], "her uploaded files are removed");

  const { data: req } = await service.from("account_deletion_requests").select("status, completed_at, identity_removed_at").eq("user_id", alice.id).eq("status", "completed").single();
  assert.ok(req.completed_at && req.identity_removed_at);

  const signIn = await newClient().auth.signInWithPassword({ email: alice.email, password: PASSWORD });
  assert.ok(signIn.error, "the deleted member can no longer sign in");
  const { data: authUser } = await service.auth.admin.getUserById(alice.id);
  assert.ok(!authUser?.user?.email?.includes(T), "the email address is scrubbed from Auth");

  // Bob still has a working conversation and account.
  const bobView = await bob.client.from("messages").select("body").eq("conversation_id", convId);
  assert.equal(bobView.error, null);
  assert.equal(bobView.data.length, 2);
});

test("the processor is resumable: a second run has nothing left to do", { skip }, async () => {
  const summary = await processAccountDeletions(service);
  assert.deepEqual(summary.failures, []);
  const { data } = await service.rpc("list_account_deletions_pending_identity_removal", { p_limit: 50 });
  assert.ok(!data.some((r) => r.user_id === alice.id));
});
