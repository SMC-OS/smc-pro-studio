import { test, mock } from "node:test";
import assert from "node:assert/strict";

// V1-1: unit coverage for src/social/services/profileClient.ts against a fake
// Supabase client (real-backend proof lives in tests/integration/profile-onboarding.real.test.mjs).

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;
let currentClient = null;
mock.module(supabaseClientUrl, {
  exports: { isSupabaseConfigured: true, getSupabaseClient: () => currentClient },
});

const {
  saveOwnProfile,
  prepareProfile,
  prepareProfessional,
  normaliseWebsite,
  missingForCompletion,
  ProfileValidationError,
  ProfileOperationError,
  PROFESSIONAL_CATEGORY_OPTIONS,
} = await import(new URL("../src/social/services/profileClient.ts", import.meta.url).href);

const USER_ID = "a0000000-0000-0000-0000-000000000001";

function fakeClient({ userId = USER_ID, getUserError = null, professionalResult, profileResult } = {}) {
  const calls = [];
  const builder = (table) => {
    const call = { table, update: null, eq: [], select: null };
    calls.push(call);
    const b = {
      update(values) { call.update = values; return b; },
      eq(col, val) { call.eq.push([col, val]); return b; },
      select(cols) { call.select = cols; return b; },
      async single() {
        if (table === "professional_profiles") return professionalResult ?? { data: { category: "installer", service_area: call.update.service_area }, error: null };
        return profileResult ?? { data: { id: userId, onboarding_completed: Boolean(call.update.onboarding_completed) }, error: null };
      },
    };
    return b;
  };
  return {
    calls,
    client: {
      auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: getUserError }) },
      from: builder,
    },
  };
}

const PROFILE = { displayName: "  Alder Stone ", username: "", bio: "", visibility: "public" };
const PRO = { category: "installer", companyName: " Alder Works ", serviceArea: " Leeds ", services: ["Templating", " templating ", "", "Fitting"], websiteUrl: "alder.example.co.uk" };

test("SMC Team is not self-selectable in the editor", () => {
  assert.ok(!PROFESSIONAL_CATEGORY_OPTIONS.some((o) => o.value === "smc_team"));
  assert.throws(() => prepareProfessional({ ...PRO, category: "smc_team" }), ProfileValidationError);
});

test("prepareProfile trims, nulls blanks, lowercases usernames and enforces the database limits", () => {
  assert.deepEqual(prepareProfile({ displayName: " A ", username: " Alder.Stone ", bio: "  ", visibility: "private" }), {
    display_name: "A", username: "alder.stone", bio: null, visibility: "private",
  });
  assert.throws(() => prepareProfile({ ...PROFILE, displayName: "   " }), /display name/);
  assert.throws(() => prepareProfile({ ...PROFILE, displayName: "x".repeat(101) }), /100 characters/);
  assert.throws(() => prepareProfile({ ...PROFILE, username: "ab" }), (e) => e.field === "username");
  assert.throws(() => prepareProfile({ ...PROFILE, username: "_bad" }), (e) => e.field === "username");
  assert.throws(() => prepareProfile({ ...PROFILE, bio: "x".repeat(501) }), /500 characters/);
  assert.throws(() => prepareProfile({ ...PROFILE, visibility: "friends" }), (e) => e.field === "visibility");
});

test("normaliseWebsite accepts bare domains as https and rejects insecure or malformed addresses", () => {
  assert.equal(normaliseWebsite(""), null);
  assert.equal(normaliseWebsite("alder.example.co.uk"), "https://alder.example.co.uk/");
  assert.equal(normaliseWebsite("https://alder.example.co.uk/about"), "https://alder.example.co.uk/about");
  for (const bad of ["http://alder.example.co.uk", "javascript:alert(1)", "localhost", "https://user:pw@alder.example.co.uk", "ftp://x.example"]) {
    assert.throws(() => normaliseWebsite(bad), (e) => e instanceof ProfileValidationError && e.field === "websiteUrl", bad);
  }
});

test("prepareProfessional de-duplicates services case-insensitively, drops blanks, and enforces limits", () => {
  const out = prepareProfessional(PRO);
  assert.deepEqual(out.services, ["Templating", "Fitting"]);
  assert.equal(out.company_name, "Alder Works");
  assert.equal(out.service_area, "Leeds");
  assert.equal(out.category, "installer");
  assert.throws(() => prepareProfessional({ ...PRO, services: Array.from({ length: 13 }, (_, i) => `s${i}`) }), /up to 12/);
  assert.throws(() => prepareProfessional({ ...PRO, services: ["x".repeat(61)] }), /60 characters/);
  assert.throws(() => prepareProfessional({ ...PRO, companyName: "x".repeat(161) }), /160/);
  assert.throws(() => prepareProfessional({ ...PRO, serviceArea: "x".repeat(201) }), /200/);
  assert.equal("category" in prepareProfessional({ ...PRO, category: undefined }), false, "an omitted category is left unchanged");
});

test("prepareProfessional never sends verification, account type or avatar fields", () => {
  const out = prepareProfessional({ ...PRO, verification_status: "verified", account_type: "professional" });
  assert.deepEqual(Object.keys(out).sort(), ["category", "company_name", "service_area", "services", "website_url"]);
});

test("missingForCompletion: professionals need a profession and service area; customers only a name", () => {
  assert.deepEqual(missingForCompletion({ accountType: "customer", displayName: "A", category: null, serviceArea: null }), []);
  assert.deepEqual(missingForCompletion({ accountType: "professional", displayName: "A", category: null, serviceArea: " " }), ["category", "serviceArea"]);
  assert.deepEqual(missingForCompletion({ accountType: "professional", displayName: "A", category: "installer", serviceArea: "Leeds" }), []);
});

test("saveOwnProfile: fails before any write when signed out or the session can't be verified", async () => {
  currentClient = fakeClient({ userId: null }).client;
  await assert.rejects(() => saveOwnProfile({ accountType: "customer", profile: PROFILE }), /Sign in/);
  const { client, calls } = fakeClient({ getUserError: { message: "jwt expired" } });
  currentClient = client;
  await assert.rejects(() => saveOwnProfile({ accountType: "customer", profile: PROFILE }), (e) => e.name === "SocialUnavailableError");
  assert.equal(calls.length, 0);
});

test("saveOwnProfile: validation errors stop before any write", async () => {
  const { client, calls } = fakeClient();
  currentClient = client;
  await assert.rejects(() => saveOwnProfile({ accountType: "professional", profile: PROFILE, professional: { ...PRO, websiteUrl: "http://insecure.example" } }), ProfileValidationError);
  assert.equal(calls.length, 0);
});

test("saveOwnProfile: a complete professional writes professional details first, scoped to their own id, then completes onboarding", async () => {
  const { client, calls } = fakeClient();
  currentClient = client;
  const result = await saveOwnProfile({ accountType: "professional", profile: PROFILE, professional: PRO });
  assert.deepEqual(result, { onboardingCompleted: true });
  assert.deepEqual(calls.map((c) => c.table), ["professional_profiles", "profiles"]);
  assert.deepEqual(calls[0].eq, [["user_id", USER_ID]]);
  assert.deepEqual(calls[1].eq, [["id", USER_ID]]);
  assert.equal(calls[1].update.onboarding_completed, true);
  assert.equal(calls[1].update.display_name, "Alder Stone");
  assert.ok(!("account_type" in calls[1].update));
});

test("saveOwnProfile: a professional without a service area saves but is not marked complete", async () => {
  const { client, calls } = fakeClient();
  currentClient = client;
  const result = await saveOwnProfile({ accountType: "professional", profile: PROFILE, professional: { ...PRO, serviceArea: "" } });
  assert.deepEqual(result, { onboardingCompleted: false });
  assert.ok(!("onboarding_completed" in calls[1].update), "never writes onboarding_completed: false — completion is not revoked by an edit");
});

test("saveOwnProfile: completion uses the category the database actually holds", async () => {
  const { client, calls } = fakeClient({ professionalResult: { data: { category: null, service_area: "Leeds" }, error: null } });
  currentClient = client;
  const result = await saveOwnProfile({ accountType: "professional", profile: PROFILE, professional: { ...PRO, category: undefined } });
  assert.equal(result.onboardingCompleted, false);
  assert.ok(!("onboarding_completed" in calls[1].update));
});

test("saveOwnProfile: a customer completes onboarding with just a name and never touches professional_profiles", async () => {
  const { client, calls } = fakeClient();
  currentClient = client;
  const result = await saveOwnProfile({ accountType: "customer", profile: PROFILE, professional: PRO });
  assert.deepEqual(result, { onboardingCompleted: true });
  assert.deepEqual(calls.map((c) => c.table), ["profiles"]);
});

test("saveOwnProfile: a professional-details failure stops before the profile is written or completed", async () => {
  const cause = { message: "new row violates row-level security policy", code: "42501" };
  const { client, calls } = fakeClient({ professionalResult: { data: null, error: cause } });
  currentClient = client;
  await assert.rejects(() => saveOwnProfile({ accountType: "professional", profile: PROFILE, professional: PRO }), (e) => {
    assert.ok(e instanceof ProfileOperationError);
    assert.equal(e.message, "Your professional details could not be saved. Please try again.");
    assert.equal(e.cause, cause);
    assert.ok(!e.message.includes("row-level"));
    return true;
  });
  assert.deepEqual(calls.map((c) => c.table), ["professional_profiles"]);
});

test("saveOwnProfile: a duplicate username is a friendly field error; other failures are a safe message", async () => {
  currentClient = fakeClient({ profileResult: { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "profiles_username_key"' } } }).client;
  await assert.rejects(() => saveOwnProfile({ accountType: "customer", profile: { ...PROFILE, username: "taken" } }), (e) => {
    assert.ok(e instanceof ProfileValidationError);
    assert.equal(e.field, "username");
    assert.equal(e.message, "That username is already taken. Try another.");
    return true;
  });
  const cause = { code: "08006", message: "connection failure" };
  currentClient = fakeClient({ profileResult: { data: null, error: cause } }).client;
  await assert.rejects(() => saveOwnProfile({ accountType: "customer", profile: PROFILE }), (e) => e instanceof ProfileOperationError && e.cause === cause && e.message === "Your profile could not be saved. Please try again.");
});
