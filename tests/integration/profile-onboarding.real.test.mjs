import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// V1-1 real-backend gate: a newly signed-up professional is NOT discoverable
// until they complete their profile through the real profileClient.ts, and
// becomes discoverable straight after — proven through the real Network search
// RPC with real RLS. Only supabase-js configuration is injected.
// Same environment contract as network-search.real.test.mjs.

const URL_ = process.env.SMC_REAL_SUPABASE_URL;
const ANON = process.env.SMC_REAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.SMC_REAL_SUPABASE_SERVICE_KEY;
const configured = Boolean(URL_ && ANON && SERVICE);
if (configured && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
  throw new Error("profile-onboarding.real.test.mjs refuses to run against a non-local Supabase URL.");
}

const newClient = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = configured ? newClient() : null;
let activeClient = anonClient;
mock.module(new URL("../../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: configured,
    getSupabaseClient: () => activeClient,
    getAuthAccessToken: async () => null,
    getAuthRedirectUrl: () => "http://127.0.0.1:5173/auth/callback",
    SupabaseConfigurationError: Error,
  },
});

const { saveOwnProfile } = await import(new URL("../../src/social/services/profileClient.ts", import.meta.url).href);
const { searchPublicProfessionals, fetchOwnProfile } = await import(new URL("../../src/social/services/socialClient.ts", import.meta.url).href);

const T = `zo${Date.now().toString(36)}`;
const PASSWORD = "Integration-Test-Pass-1";
const ids = [];
const service = configured ? createClient(URL_, SERVICE, { auth: { persistSession: false } }) : null;

/** Real public sign-up endpoint (autoconfirm on the local stack), exactly what AuthForm calls. */
async function signUp(label, metadata) {
  const c = newClient();
  const email = `${T}-${label}@example.test`;
  const { data, error } = await c.auth.signUp({ email, password: PASSWORD, options: { data: metadata } });
  if (error) throw error;
  ids.push(data.user.id);
  if (!data.session) {
    // Projects with email confirmation on (supabase/config.toml): confirm the
    // address through the admin API, standing in for clicking the email link.
    const confirm = await service.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    if (confirm.error) throw confirm.error;
    const r = await c.auth.signInWithPassword({ email, password: PASSWORD });
    if (r.error) throw r.error;
  }
  return { id: data.user.id, client: c };
}

const as = async (user, fn) => {
  activeClient = user.client;
  try {
    return await fn();
  } finally {
    activeClient = anonClient;
  }
};
const found = async (q) => (await searchPublicProfessionals({ q, pageSize: 50 })).items.map((i) => i.user_id);

let pro;
before(async () => {
  if (!configured) return;
  pro = await signUp("pro", { account_type: "professional", display_name: `${T} Larch Joinery`, professional_category: "contractor" });
});
after(async () => {
  for (const id of ids) await service.auth.admin.deleteUser(id);
});

const skip = configured ? false : "SMC_REAL_SUPABASE_* not set — real-backend gate not run";

test("a freshly signed-up professional is not discoverable before completing their profile", { skip }, async () => {
  const own = await as(pro, () => fetchOwnProfile());
  assert.equal(own.onboarding_completed, false);
  assert.deepEqual(await found(T), []);
});

test("saving without a service area keeps them hidden and incomplete", { skip }, async () => {
  const r = await as(pro, () =>
    saveOwnProfile({
      accountType: "professional",
      profile: { displayName: `${T} Larch Joinery`, username: "", bio: "", visibility: "public" },
      professional: { companyName: `${T} Larch Ltd`, serviceArea: "", services: [], websiteUrl: "" },
    }),
  );
  assert.deepEqual(r, { onboardingCompleted: false });
  assert.deepEqual(await found(T), []);
});

test("completing the profile makes them discoverable by name, company, area and profession", { skip }, async () => {
  const r = await as(pro, () =>
    saveOwnProfile({
      accountType: "professional",
      profile: { displayName: `${T} Larch Joinery`, username: `${T}.larch`, bio: "Bespoke joinery.", visibility: "public" },
      professional: { category: "contractor", companyName: `${T} Larch Ltd`, serviceArea: `Leeds ${T}`, services: ["Joinery"], websiteUrl: "larch.example.co.uk" },
    }),
  );
  assert.deepEqual(r, { onboardingCompleted: true });
  assert.deepEqual(await found(T), [pro.id]);
  const page = await searchPublicProfessionals({ q: `${T} larch ltd`, category: "contractor", serviceArea: "leeds" });
  assert.equal(page.items[0].company_name, `${T} Larch Ltd`);
  assert.equal(page.items[0].service_area, `Leeds ${T}`);
});

test("switching to 'Only you' removes them from search immediately; switching back restores it", { skip }, async () => {
  const base = {
    accountType: "professional",
    professional: { category: "contractor", companyName: `${T} Larch Ltd`, serviceArea: `Leeds ${T}`, services: [], websiteUrl: "" },
  };
  await as(pro, () => saveOwnProfile({ ...base, profile: { displayName: `${T} Larch Joinery`, username: "", bio: "", visibility: "private" } }));
  assert.deepEqual(await found(T), []);
  await as(pro, () => saveOwnProfile({ ...base, profile: { displayName: `${T} Larch Joinery`, username: "", bio: "", visibility: "public" } }));
  assert.deepEqual(await found(T), [pro.id]);
});

test("a username already taken by someone else is reported as a field error", { skip }, async () => {
  const other = await signUp("other", { account_type: "customer", display_name: `${T} Other` });
  await as(other, () => saveOwnProfile({ accountType: "customer", profile: { displayName: "Other", username: `${T}.taken`, bio: "", visibility: "public" } }));
  await assert.rejects(
    () => as(pro, () => saveOwnProfile({ accountType: "professional", profile: { displayName: "x", username: `${T}.taken`, bio: "", visibility: "public" }, professional: { companyName: "", serviceArea: `Leeds ${T}`, services: [], websiteUrl: "" } })),
    (e) => e.name === "ProfileValidationError" && e.field === "username",
  );
});

test("RLS: a user cannot edit someone else's profile, nor make themselves verified", { skip }, async () => {
  const other = await signUp("victim", { account_type: "professional", display_name: `${T} Victim`, professional_category: "installer" });
  const hijack = await pro.client.from("profiles").update({ display_name: "hijacked" }).eq("id", other.id).select();
  assert.deepEqual(hijack.data, [], "no row of another user is ever updated");
  const { data: victim } = await service.from("profiles").select("display_name").eq("id", other.id).single();
  assert.equal(victim.display_name, `${T} Victim`);
  const verify = await pro.client.from("professional_profiles").update({ verification_status: "verified" }).eq("user_id", pro.id);
  assert.ok(verify.error, "verification_status is not client-writable");
});
