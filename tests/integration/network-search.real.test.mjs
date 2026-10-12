import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Slice E real-backend gate for public.search_public_professionals.
//
// Nothing here is mocked except *configuration*: supabaseClient.ts reads
// import.meta.env (a Vite-only object), so this file injects a genuine
// supabase-js client pointed at a running local Supabase stack. Every call
// below goes through the real socialClient.ts -> real PostgREST -> real
// Postgres function with real RLS. No RPC response is faked.
//
// Required environment (the test file is skipped entirely without it):
//   SMC_REAL_SUPABASE_URL        e.g. http://127.0.0.1:54321
//   SMC_REAL_SUPABASE_ANON_KEY   the local anon key
//   SMC_REAL_SUPABASE_SERVICE_KEY  the local service-role key — used ONLY to
//                                  create/delete fixture users via the Auth
//                                  admin API, never for any assertion.
// Run: npm run test:integration
//
// Never point this at staging or production: it creates and deletes users.

const URL_ = process.env.SMC_REAL_SUPABASE_URL;
const ANON = process.env.SMC_REAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.SMC_REAL_SUPABASE_SERVICE_KEY;
const configured = Boolean(URL_ && ANON && SERVICE);
if (configured && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
  throw new Error("network-search.real.test.mjs refuses to run against a non-local Supabase URL.");
}

const anonClient = configured
  ? createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
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

const { searchPublicProfessionals } = await import(
  new URL("../../src/social/services/socialClient.ts", import.meta.url).href
);

const RUN = `slice-e-${Date.now().toString(36)}`;
const PASSWORD = "Integration-Test-Pass-1";
const created = [];

// A unique token every fixture name/area carries, so assertions are scoped to
// this run's rows even if the local database holds other data.
const T = `zq${Date.now().toString(36)}`;

const PROS = [
  // name, category, company, service_area
  ["Alder Stone", "stone_fabricator", `${T} Alder Works`, `Leeds ${T}`],
  ["alder stone", "stone_fabricator", null, `York ${T}`], // case-insensitive duplicate name
  ["Alder Stone", "installer", null, `Leeds ${T}`], // exact duplicate name, different person
  ["Birch Interiors", "interior_designer", `${T} Birch Studio`, `London ${T}`],
  ["Cedar Build", "contractor", `${T} Cedar Ltd`, `Manchester ${T}`],
  ["Damson Architects", "architect", null, `London ${T}`],
  ["Elm Surfaces", "stone_supplier", `${T} Elm`, `Bristol ${T}`],
  ["Fir & Co", "installer", null, `Leeds ${T}`],
  ["Gorse Quartz", "stone_fabricator", null, `Sheffield ${T}`],
  ["Hazel Homes", "developer", null, `Leeds ${T}`],
  ["Ivy 100% Stone", "stone_fabricator", null, `Hull ${T}`], // literal % in name
  ["Juniper_Tops", "stone_fabricator", null, `Hull ${T}`], // literal _ in name
  ["Kauri Design", "interior_designer", null, `Leeds North ${T}`],
  ["Larch Joinery", "contractor", null, `Leeds ${T}`],
];

const EXCLUDED = {
  privatePro: ["Private Alder Pro", "stone_fabricator", null, `Leeds ${T}`, { visibility: "private", onboarding_completed: true }],
  incompletePro: ["Incomplete Alder Pro", "stone_fabricator", null, `Leeds ${T}`, { onboarding_completed: false }],
};
const CUSTOMER_NAME = `Alder Customer ${T}`;
const SECRET_BIO = `secret-bio-${T}`;
const SECRET_SITE = `https://secret-${T}.example.invalid`;

async function adminCreateUser(email, metadata) {
  const res = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: metadata }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`admin create failed: ${res.status} ${JSON.stringify(body)}`);
  created.push(body.id);
  return body.id;
}

async function adminDeleteUser(id) {
  await fetch(`${URL_}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
  });
}

/** Each fixture user completes their own profile through their own signed-in session, so RLS governs setup too. */
async function asUser(email, fn) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  try {
    return await fn(c);
  } finally {
    await c.auth.signOut();
  }
}

async function seedProfessional(i, [name, category, company, area, profilePatch = {}]) {
  const email = `${RUN}-${i}@example.test`;
  const id = await adminCreateUser(email, { account_type: "professional", display_name: name, professional_category: category });
  await asUser(email, async (c) => {
    const p = await c
      .from("profiles")
      .update({ onboarding_completed: true, bio: SECRET_BIO, ...profilePatch })
      .eq("id", id);
    if (p.error) throw p.error;
    const pp = await c
      .from("professional_profiles")
      .update({ company_name: company, service_area: area, website_url: SECRET_SITE, services: [`svc-${T}`] })
      .eq("user_id", id);
    if (pp.error) throw pp.error;
  });
  return { id, name, category, company, area };
}

const seeded = [];

before(async () => {
  if (!configured) return;
  let i = 0;
  for (const row of PROS) seeded.push(await seedProfessional(i++, row));
  await seedProfessional(i++, EXCLUDED.privatePro);
  await seedProfessional(i++, EXCLUDED.incompletePro);
  const customerEmail = `${RUN}-customer@example.test`;
  const customerId = await adminCreateUser(customerEmail, { account_type: "customer", display_name: CUSTOMER_NAME });
  await asUser(customerEmail, (c) => c.from("profiles").update({ onboarding_completed: true }).eq("id", customerId));
});

after(async () => {
  for (const id of created) await adminDeleteUser(id);
});

const skip = configured ? false : "SMC_REAL_SUPABASE_* not set — real-backend gate not run";
const names = (page) => page.items.map((i) => i.profile.display_name);
const expectedOrder = (rows) =>
  [...rows].sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    if (an !== bn) return an < bn ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

async function collectAll(filters, pageSize) {
  const out = [];
  let cursor = null;
  let pages = 0;
  do {
    const page = await searchPublicProfessionals({
      ...filters,
      pageSize,
      ...(cursor ? { afterDisplayName: cursor.displayName, afterUserId: cursor.userId } : {}),
    });
    assert.ok(page.items.length <= pageSize, "a page never exceeds the requested size");
    out.push(...page.items);
    cursor = page.nextCursor;
    pages += 1;
    assert.ok(pages < 50, "pagination terminates");
  } while (cursor);
  return { items: out, pages };
}

test("free-text search matches display name, company name, and service area (case-insensitive)", { skip }, async () => {
  const byName = await searchPublicProfessionals({ q: "BIRCH", pageSize: 50 });
  assert.deepEqual(names(byName), ["Birch Interiors"]);

  const byCompany = await searchPublicProfessionals({ q: `${T} cedar`, pageSize: 50 });
  assert.deepEqual(names(byCompany), ["Cedar Build"]);

  const byArea = await searchPublicProfessionals({ q: `Bristol ${T}`, pageSize: 50 });
  assert.deepEqual(names(byArea), ["Elm Surfaces"]);
});

test("the run token alone returns exactly the public, onboarded professionals — never private, incomplete, or customer profiles", { skip }, async () => {
  const { items } = await collectAll({ q: T }, 50);
  assert.deepEqual(
    items.map((i) => i.user_id),
    expectedOrder(seeded).map((s) => s.id),
  );
  const all = JSON.stringify(items);
  assert.ok(!all.includes("Private Alder Pro"), "private professional excluded");
  assert.ok(!all.includes("Incomplete Alder Pro"), "onboarding-incomplete professional excluded");
  assert.ok(!all.includes(CUSTOMER_NAME), "customer accounts are never returned");
});

test("profession filter is exact and combines with free text", { skip }, async () => {
  const fabricators = await collectAll({ q: T, category: "stone_fabricator" }, 50);
  assert.deepEqual(
    fabricators.items.map((i) => i.user_id),
    expectedOrder(seeded.filter((s) => s.category === "stone_fabricator")).map((s) => s.id),
  );
  assert.ok(fabricators.items.every((i) => i.category === "stone_fabricator"));

  const alderFabricators = await searchPublicProfessionals({ q: "alder", category: "stone_fabricator", serviceArea: T, pageSize: 50 });
  assert.equal(alderFabricators.items.length, 2, "both Alder fabricators, not the Alder installer");
  assert.ok(alderFabricators.items.every((i) => i.category === "stone_fabricator"));
});

test("service-area filter is a substring match on service_area only", { skip }, async () => {
  const leeds = await collectAll({ serviceArea: `Leeds` , q: T }, 50);
  const expected = seeded.filter((s) => s.area.includes("Leeds"));
  assert.deepEqual(leeds.items.map((i) => i.user_id), expectedOrder(expected).map((s) => s.id));
  assert.ok(leeds.items.some((i) => i.service_area === `Leeds North ${T}`), "substring, not exact match");
});

test("combined profession + service area + text narrows correctly", { skip }, async () => {
  const page = await searchPublicProfessionals({ q: "a", category: "contractor", serviceArea: `Leeds ${T}`, pageSize: 50 });
  assert.deepEqual(names(page), ["Larch Joinery"]);
});

test("keyset pagination returns every row exactly once, in stable order, across duplicate display names", { skip }, async () => {
  for (const size of [1, 2, 3, 5]) {
    const { items, pages } = await collectAll({ q: T }, size);
    const ids = items.map((i) => i.user_id);
    assert.equal(new Set(ids).size, ids.length, `no duplicates at page size ${size}`);
    assert.deepEqual(ids, expectedOrder(seeded).map((s) => s.id), `complete and ordered at page size ${size}`);
    assert.equal(pages, Math.ceil(seeded.length / size), `page count at size ${size}`);
  }
  // the three "Alder Stone"/"alder stone" rows share one lower() value and are tie-broken by id
  const { items } = await collectAll({ q: "alder stone", serviceArea: T }, 1);
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.user_id), [...items.map((i) => i.user_id)].sort());
});

test("wildcard characters in user input are matched literally, not as patterns", { skip }, async () => {
  assert.deepEqual(names(await searchPublicProfessionals({ q: "100%", pageSize: 50 })), ["Ivy 100% Stone"]);
  assert.deepEqual(names(await searchPublicProfessionals({ q: "per_T", pageSize: 50 })), ["Juniper_Tops"]);
  assert.deepEqual(names(await searchPublicProfessionals({ q: `%${T}`, pageSize: 50 })), []);
  assert.deepEqual(names(await searchPublicProfessionals({ q: "_", serviceArea: T, pageSize: 50 })), ["Juniper_Tops"]);
});

test("empty results are a successful empty page, not an error", { skip }, async () => {
  const page = await searchPublicProfessionals({ q: `${T}-no-such-professional`, pageSize: 20 });
  assert.deepEqual(page, { items: [], nextCursor: null });
  const none = await searchPublicProfessionals({ q: T, category: "smc_team", pageSize: 20 });
  assert.deepEqual(none, { items: [], nextCursor: null });
});

test("no private field is ever returned or searchable", { skip }, async () => {
  // Raw RPC response shape — exactly the eight approved public columns.
  const { data, error } = await anonClient.rpc("search_public_professionals", { q: T, page_size: 50 });
  assert.equal(error, null);
  assert.ok(data.length > 0);
  for (const row of data) {
    assert.deepEqual(Object.keys(row).sort(), [
      "account_type", "avatar_path", "category", "company_name", "display_name", "service_area", "user_id", "username",
    ]);
  }
  const raw = JSON.stringify(data);
  for (const secret of [SECRET_BIO, SECRET_SITE, `svc-${T}`, "onboarding_completed", "visibility", "@example.test"]) {
    assert.ok(!raw.includes(secret), `response never contains ${secret}`);
  }
  // Private columns cannot be used as a search side-channel either.
  assert.deepEqual(names(await searchPublicProfessionals({ q: SECRET_BIO })), []);
  assert.deepEqual(names(await searchPublicProfessionals({ q: `secret-${T}` })), []);
});

test("permissions: anon and signed-in users get identical public results; a private professional cannot find themselves", { skip }, async () => {
  const asAnon = await collectAll({ q: T }, 50);
  const privateEmail = `${RUN}-${PROS.length}@example.test`; // EXCLUDED.privatePro was seeded right after PROS
  const asPrivatePro = await asUser(privateEmail, async (c) => {
    activeClient = c;
    try {
      return await collectAll({ q: T }, 50);
    } finally {
      activeClient = anonClient;
    }
  });
  assert.deepEqual(asPrivatePro.items.map((i) => i.user_id), asAnon.items.map((i) => i.user_id));
  assert.ok(!JSON.stringify(asPrivatePro.items).includes("Private Alder Pro"));
});

test("server-side guards: partial cursor is rejected, page size is clamped", { skip }, async () => {
  const partial = await anonClient.rpc("search_public_professionals", { q: T, after_display_name: "alder stone", after_user_id: null });
  assert.ok(partial.error, "a half-supplied cursor is an error, not a silent first page");
  await assert.rejects(
    searchPublicProfessionals({ q: T, afterDisplayName: "alder stone" }),
    /could not be loaded/,
    "socialClient surfaces only its safe message",
  );
  const huge = await anonClient.rpc("search_public_professionals", { q: T, page_size: 10_000 });
  assert.equal(huge.error, null);
  assert.ok(huge.data.length <= 51, "server clamps to 50 (+1 look-ahead row)");
});

test("signed-in-only RPCs are not callable with the anon key (hardening regression)", { skip }, async () => {
  const { error } = await anonClient.rpc("check_moderator_access");
  assert.ok(error);
  assert.equal(error.code, "42501");
});
