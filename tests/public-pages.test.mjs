import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";

// V1 launch gate: the public pages — /privacy, /terms, /support,
// /delete-account and the catch-all — plus their route registration and
// the published web icons. None of the public pages may need a session.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let authState = { status: "guest" };
let panelMounts = 0;
mock.module(new URL("../src/social/services/useAuthSession.ts", import.meta.url).href, {
  exports: { useAuthSession: () => authState },
});
mock.module(new URL("../src/social/components/DeleteAccountPanel.tsx", import.meta.url).href, {
  exports: {
    CONFIRM_WORD: "DELETE",
    DeleteAccountPanel: () => {
      panelMounts += 1;
      return null;
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const imp = (p) => import(new URL(p, import.meta.url).href);
const { default: SupportRoute } = await imp("../src/social/routes/SupportRoute.tsx");
const { default: DeleteAccountRoute } = await imp("../src/social/routes/DeleteAccountRoute.tsx");
const { default: LegalDocumentRoute } = await imp("../src/social/routes/LegalDocumentRoute.tsx");
const { default: NotFoundRoute } = await imp("../src/social/routes/NotFoundRoute.tsx");
const { PRIVACY_POLICY, TERMS_OF_USE, DRAFT_NOTICE } = await imp("../src/social/legal/documents.ts");
const { PUBLIC_PATHS, SUPPORT_EMAIL } = await imp("../src/social/contact.ts");

async function mount(element) {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, null, element));
  });
  await React.act(async () => new Promise((r) => setTimeout(r, 10)));
  return container;
}
const hrefs = (c) => [...c.querySelectorAll("a")].map((a) => a.getAttribute("href"));

// Every in-app path a public page links to must be a registered route.
const SOCIAL_APP = fs.readFileSync(new URL("../src/social/SocialApp.tsx", import.meta.url), "utf8");
const REGISTERED = new Set(["/", ...[...SOCIAL_APP.matchAll(/<Route path="([^"*:]+)"/g)].map((m) => `/${m[1]}`)]);
function assertNoDeadLinks(c) {
  for (const href of hrefs(c)) {
    if (href.startsWith("mailto:")) {
      assert.ok(href.startsWith(`mailto:${SUPPORT_EMAIL}`), `unexpected mail address in ${href}`);
      continue;
    }
    assert.ok(REGISTERED.has(href), `link to unregistered route ${href}`);
  }
}

test("the public paths are registered routes, including a catch-all", () => {
  for (const path of Object.values(PUBLIC_PATHS)) assert.ok(REGISTERED.has(path), `${path} must be routed`);
  assert.match(SOCIAL_APP, /<Route path="\*" element={<NotFoundRoute \/>} \/>/);
});

test("the support address is support@smcprostudio.app", () => {
  assert.equal(SUPPORT_EMAIL, "support@smcprostudio.app");
});

for (const doc of [PRIVACY_POLICY, TERMS_OF_USE]) {
  test(`${doc.title}: renders for guests with every section, an honest draft notice, and no dead links`, async () => {
    authState = { status: "guest" };
    const c = await mount(React.createElement(LegalDocumentRoute, { document: doc }));
    assert.equal(c.querySelector("h1").textContent.trim(), doc.title);
    for (const section of doc.sections) assert.match(c.textContent, new RegExp(section.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(doc.status, "draft", "flip to final only with the legally approved text");
    assert.equal(c.querySelector('[role="note"]').textContent, DRAFT_NOTICE);
    assertNoDeadLinks(c);
  });
}

test("the Privacy Policy never claims capabilities V1 does not have", () => {
  const text = JSON.stringify(PRIVACY_POLICY);
  assert.doesNotMatch(text, /payment|card details|analytics cookies|push notification|location tracking|sell your/i);
  assert.match(text, /does not use analytics, advertising or tracking tools/);
  assert.match(text, /support@smcprostudio\.app/);
});

test("the Terms say what V1 does not offer and never state a price", () => {
  const text = JSON.stringify(TERMS_OF_USE);
  assert.match(text, /does not offer quotations, payments, ordering or project management/);
  assert.doesNotMatch(text, /£|\bwarrant(y|ies)\b|guarantee/i);
});

test("/support: public, gives the support email, answers, and links every policy page", async () => {
  authState = { status: "guest" };
  const c = await mount(React.createElement(SupportRoute));
  assert.match(c.textContent, /Help and support/);
  assert.ok(hrefs(c).some((h) => h.startsWith("mailto:support@smcprostudio.app")));
  for (const path of ["/delete-account", "/privacy", "/terms", "/community-guidelines"]) assert.ok(hrefs(c).includes(path), path);
  assert.match(c.textContent, /Not in this version\. Quotations, payments and project management are not available/);
  assert.doesNotMatch(c.textContent, /within \d+ (hours|days)|24\/7/i, "no response-time promise");
  assertNoDeadLinks(c);
});

test("/delete-account as a guest: explains the steps, offers sign-in and email — no deletion panel", async () => {
  authState = { status: "guest" };
  panelMounts = 0;
  const c = await mount(React.createElement(DeleteAccountRoute));
  assert.match(c.textContent, /Delete your account/);
  assert.match(c.textContent, /cancellation period/);
  assert.ok(hrefs(c).includes("/auth"));
  assert.ok(hrefs(c).some((h) => h.startsWith("mailto:support@smcprostudio.app")));
  assert.equal(panelMounts, 0);
  assertNoDeadLinks(c);
});

test("/delete-account signed in: shows the same deletion flow as Settings", async () => {
  authState = { status: "authenticated", session: { subject: "u1", roles: [] } };
  panelMounts = 0;
  await mount(React.createElement(DeleteAccountRoute));
  assert.ok(panelMounts > 0);
});

test("unknown paths render a Page not found state with a way home", async () => {
  const c = await mount(React.createElement(NotFoundRoute));
  assert.match(c.textContent, /Page not found/);
  assert.ok(hrefs(c).includes("/"));
});

test("web icons: favicon, apple-touch and manifest icons exist with the declared sizes", () => {
  const root = new URL("../public/", import.meta.url);
  const png = (file) => {
    const buf = fs.readFileSync(new URL(file.replace(/^\//, ""), root));
    assert.equal(buf.subarray(1, 4).toString(), "PNG", `${file} is a PNG`);
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  };
  const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
  assert.equal(manifest.name, "SMC Pro Studio");
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
  for (const icon of manifest.icons) {
    const [w, h] = png(icon.src);
    assert.equal(`${w}x${h}`, icon.sizes, icon.src);
  }
  assert.deepEqual(png("/icons/apple-touch-icon.png"), [180, 180]);
  const ico = fs.readFileSync(new URL("favicon.ico", root));
  assert.equal(ico.readUInt16LE(2), 1, "favicon.ico is an icon resource");
  assert.ok(fs.readFileSync(new URL("favicon.svg", root), "utf8").includes("<svg"));
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const ref of ["/favicon.ico", "/favicon.svg", "/icons/apple-touch-icon.png", "/manifest.json"]) {
    assert.ok(html.includes(`href="${ref}"`), `index.html links ${ref}`);
  }
  assert.doesNotMatch(html, /Luxury Construction|premier/i, "no legacy marketing claims in the page head");
});

test("V1 scope: Home does not render the Stories placeholder tray", () => {
  const home = fs.readFileSync(new URL("../src/social/routes/HomeRoute.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(home, /<StoriesTray|import \{ StoriesTray \}/);
});
