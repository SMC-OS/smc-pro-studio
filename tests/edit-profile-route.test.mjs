import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// V1-1: real-mount coverage for /profile/edit (EditProfileRoute) and the
// Profile screen's completion prompt. profileClient.ts runs for real against a
// fake Supabase client, so validation, write order and completion logic are
// exercised end-to-end through the UI.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const USER_ID = "a0000000-0000-0000-0000-000000000001";
let authState = { status: "authenticated", session: { subject: USER_ID } };
let ownProfile;
let ownProfessional;
let writes = [];
let professionalWriteError = null;
let profileWriteError = null;

mock.module(new URL("../src/social/services/useAuthSession.ts", import.meta.url).href, {
  exports: { useAuthSession: () => authState },
});

mock.module(new URL("../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
      from: (table) => {
        const call = { table, update: null, eq: [] };
        const b = {
          update(v) { call.update = v; writes.push(call); return b; },
          eq(c, v) { call.eq.push([c, v]); return b; },
          select() { return b; },
          async single() {
            if (table === "professional_profiles") {
              if (professionalWriteError) return { data: null, error: professionalWriteError };
              return { data: { category: call.update.category ?? ownProfessional?.category ?? null, service_area: call.update.service_area }, error: null };
            }
            if (profileWriteError) return { data: null, error: profileWriteError };
            return { data: { id: USER_ID, onboarding_completed: Boolean(call.update.onboarding_completed) }, error: null };
          },
        };
        return b;
      },
    }),
  },
});

const realSocial = await import(new URL("../src/social/services/socialClient.ts", import.meta.url).href);
mock.module(new URL("../src/social/services/socialClient.ts", import.meta.url).href, {
  exports: {
    ...realSocial,
    fetchOwnProfile: async () => ownProfile,
    fetchOwnProfessionalProfile: async () => ownProfessional,
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { default: EditProfileRoute } = await import(new URL("../src/social/routes/EditProfileRoute.tsx", import.meta.url).href);

function Landing() {
  return React.createElement("p", null, "PROFILE-LANDING");
}

async function mount() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/profile/edit"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/profile/edit", element: React.createElement(EditProfileRoute) }),
          React.createElement(Route, { path: "/profile", element: React.createElement(Landing) }),
        ),
      ),
    );
  });
  await flush();
  return container;
}

async function flush(ms = 20) {
  await React.act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

function typeInto(field, value) {
  const proto = field.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : field.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(field, value);
  field.dispatchEvent(new dom.window.Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
}

const byLabel = (container, text) => {
  const label = [...container.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(text));
  assert.ok(label, `expected a field labelled "${text}"`);
  return label.querySelector("input, textarea, select");
};

async function submit(container) {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "Save profile");
  await React.act(async () => button.click());
  await flush();
}

const PRO_PROFILE = { id: USER_ID, display_name: "Alder Stone", username: null, avatar_path: null, account_type: "professional", bio: null, visibility: "public", onboarding_completed: false };
const PRO_DETAILS = { user_id: USER_ID, category: "installer", company_name: null, services: [], service_area: null, website_url: null, verification_status: "not_verified" };

test.beforeEach(() => {
  authState = { status: "authenticated", session: { subject: USER_ID } };
  ownProfile = { ...PRO_PROFILE };
  ownProfessional = { ...PRO_DETAILS };
  writes = [];
  professionalWriteError = null;
  profileWriteError = null;
});

test("guests are asked to sign in and nothing loads", async () => {
  authState = { status: "guest" };
  const c = await mount();
  assert.match(c.textContent, /Sign in to edit your profile/);
  assert.equal(c.querySelector("form"), null);
});

test("an incomplete professional is told exactly what is missing to appear in Network search", async () => {
  const c = await mount();
  assert.match(c.textContent, /To appear in Network search, add your service area\./);
  typeInto(byLabel(c, "Service area"), "Leeds");
  await flush();
  assert.match(c.textContent, /Save to complete your profile and appear in Network search\./);
});

test("saving a complete professional profile writes details then completes onboarding, and returns to Profile", async () => {
  const c = await mount();
  typeInto(byLabel(c, "Service area"), "Leeds and West Yorkshire");
  typeInto(byLabel(c, "Company name"), "Alder Works");
  typeInto(byLabel(c, "Services"), "Templating, Fabrication");
  typeInto(byLabel(c, "Website"), "alder.example.co.uk");
  await flush();
  await submit(c);
  assert.deepEqual(writes.map((w) => w.table), ["professional_profiles", "profiles"]);
  assert.deepEqual(writes[0].update, {
    company_name: "Alder Works",
    service_area: "Leeds and West Yorkshire",
    services: ["Templating", "Fabrication"],
    website_url: "https://alder.example.co.uk/",
    category: "installer",
  });
  assert.equal(writes[1].update.onboarding_completed, true);
  assert.match(c.textContent, /PROFILE-LANDING/);
});

test("an invalid website shows an inline alert, keeps every typed value, and writes nothing", async () => {
  const c = await mount();
  typeInto(byLabel(c, "Service area"), "Leeds");
  typeInto(byLabel(c, "Website"), "http://insecure.example.co.uk");
  typeInto(byLabel(c, "Bio"), "Twenty years of stonework.");
  await flush();
  await submit(c);
  assert.equal(writes.length, 0);
  assert.match(c.querySelector('[role="alert"]').textContent, /secure https:\/\//);
  assert.equal(byLabel(c, "Website").getAttribute("aria-invalid"), "true");
  assert.equal(byLabel(c, "Bio").value, "Twenty years of stonework.");
  assert.equal(byLabel(c, "Service area").value, "Leeds");
});

test("a backend failure shows only the safe message and keeps the form", async () => {
  professionalWriteError = { code: "42501", message: "new row violates row-level security policy for table professional_profiles" };
  const c = await mount();
  typeInto(byLabel(c, "Service area"), "Leeds");
  await flush();
  await submit(c);
  assert.match(c.textContent, /Your professional details could not be saved\. Please try again\./);
  assert.doesNotMatch(c.innerHTML, /row-level|42501|professional_profiles/);
  assert.equal(byLabel(c, "Service area").value, "Leeds");
});

test("a taken username is flagged on the username field", async () => {
  profileWriteError = { code: "23505", message: 'duplicate key value violates unique constraint "profiles_username_key"' };
  const c = await mount();
  typeInto(byLabel(c, "Username"), "alder.stone");
  typeInto(byLabel(c, "Service area"), "Leeds");
  await flush();
  await submit(c);
  assert.match(c.textContent, /That username is already taken/);
  assert.equal(byLabel(c, "Username").getAttribute("aria-invalid"), "true");
  assert.doesNotMatch(c.innerHTML, /profiles_username_key/);
});

test("SMC Team is never offered; an already staff-assigned SMC Team category is shown as locked and left unchanged", async () => {
  let c = await mount();
  const options = [...byLabel(c, "Profession").querySelectorAll("option")].map((o) => o.value);
  assert.ok(!options.includes("smc_team"));
  ownProfessional = { ...PRO_DETAILS, category: "smc_team" };
  c = await mount();
  assert.match(c.textContent, /set by the SMC team and can't be changed here/);
  typeInto(byLabel(c, "Service area"), "Leeds");
  await flush();
  await submit(c);
  assert.ok(!("category" in writes[0].update), "the locked category is never written");
});

test("a customer sees no professional fields and completes with just a name", async () => {
  ownProfile = { ...PRO_PROFILE, account_type: "customer" };
  ownProfessional = null;
  const c = await mount();
  assert.doesNotMatch(c.textContent, /Professional details|Service area/);
  await submit(c);
  assert.deepEqual(writes.map((w) => w.table), ["profiles"]);
  assert.equal(writes[0].update.onboarding_completed, true);
});

test("choosing 'Only you' saves a private profile", async () => {
  const c = await mount();
  typeInto(byLabel(c, "Service area"), "Leeds");
  const privateRadio = c.querySelector('input[type="radio"][value="private"]');
  await React.act(async () => privateRadio.click());
  await submit(c);
  assert.equal(writes[1].update.visibility, "private");
});

// ==========================================================================
// V1-7: connection loss while saving
// ==========================================================================

test("a lost connection keeps every typed value, explains it plainly, and 'Try again' re-sends the same values", async () => {
  professionalWriteError = { message: "TypeError: Failed to fetch", details: "", hint: "", code: "" };
  const c = await mount();
  typeInto(byLabel(c, "Service area"), "Leeds");
  typeInto(byLabel(c, "Bio"), "Twenty years of stonework.");
  await flush();
  await submit(c);
  assert.match(c.querySelector('[role="alert"]').textContent, /We couldn't reach SMC Pro Studio\. Check your connection, then try again\./);
  assert.doesNotMatch(c.innerHTML, /Failed to fetch|TypeError/);
  assert.equal(byLabel(c, "Service area").value, "Leeds");
  assert.equal(byLabel(c, "Bio").value, "Twenty years of stonework.");
  assert.doesNotMatch(c.textContent, /PROFILE-LANDING/, "nothing pretends to have saved");
  const firstAttempt = writes[0].update;

  professionalWriteError = null; // the connection is back
  const retry = [...c.querySelectorAll("button")].find((b) => b.textContent.trim() === "Try again");
  assert.ok(retry, "a Try again action is offered after a connection failure");
  await React.act(async () => retry.click());
  await flush();
  assert.deepEqual(writes[1].update, firstAttempt, "the retry sends exactly the values that were kept");
  assert.match(c.textContent, /PROFILE-LANDING/, "and only now returns to Profile");
});

test("an ordinary server refusal keeps its own message and offers no connection retry", async () => {
  professionalWriteError = { code: "42501", message: "new row violates row-level security policy" };
  const c = await mount();
  typeInto(byLabel(c, "Service area"), "Leeds");
  await flush();
  await submit(c);
  assert.match(c.textContent, /Your professional details could not be saved\. Please try again\./);
  assert.equal([...c.querySelectorAll("button")].find((b) => b.textContent.trim() === "Try again"), undefined);
});
