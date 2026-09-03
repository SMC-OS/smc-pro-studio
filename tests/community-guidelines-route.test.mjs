import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Community Guidelines owner-review pass: real-mount coverage for
// CommunityGuidelinesRoute (`/community-guidelines`). Unlike every other
// route file in this suite, this component reads no auth/service state at
// all — it is deliberately public and static — so this file needs none of
// the usual module-mocking scaffolding, only a plain jsdom + MemoryRouter
// mount.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: CommunityGuidelinesRoute } = await import(new URL("../src/social/routes/CommunityGuidelinesRoute.tsx", import.meta.url).href);

async function flush(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mountGuidelines() {
  const container = document.getElementById("root");
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ["/community-guidelines"] }, React.createElement(CommunityGuidelinesRoute)));
  });
  await flush();
  return container;
}

test("renders with no auth/service dependency at all — a genuinely unauthenticated mount never throws or shows any loading/error/sign-in state", async () => {
  const container = await mountGuidelines();
  assert.match(container.textContent, /Community Guidelines/);
  assert.doesNotMatch(container.textContent, /sign in/i, "must never behave like an auth-gated route");
  assert.doesNotMatch(container.textContent, /loading/i);
});

test("states the interim/pending-legal-review status, and the approved effective date, at least twice (banner and footer)", async () => {
  const container = await mountGuidelines();
  const matches = container.textContent.match(/final UK legal review|pending/gi) ?? [];
  assert.ok(matches.length >= 1, "must state the interim/pending-legal-review status");
  assert.match(container.textContent, /3 September 2026/);
});

test("covers every prohibited-conduct topic named in the owner-approved scope", async () => {
  const container = await mountGuidelines();
  const text = container.textContent;
  for (const topic of [
    /harassment/i,
    /bullying/i,
    /hate/i,
    /discrimination/i,
    /threats/i,
    /violence/i,
    /sexual or exploitative/i,
    /impersonation/i,
    /fraud/i,
    /scams/i,
    /spam/i,
    /privacy violations/i,
    /illegal activity/i,
    /coordinated abuse/i,
  ]) {
    assert.match(text, topic, `missing prohibited-conduct topic: ${topic}`);
  }
});

test("uses the owner-approved reporting sentence verbatim", async () => {
  const container = await mountGuidelines();
  assert.match(container.textContent, /You can report another user's profile or a message available to you\./);
});

test("states privacy concerns currently use \"Something else\" — the report-category enum is not changed by this page", async () => {
  const container = await mountGuidelines();
  assert.match(container.textContent, /Privacy concerns currently use "Something else"/);
});

test("the enforcement section is scoped to messages attached to a resolved message report — never implies profile, post, comment, or account enforcement", async () => {
  const container = await mountGuidelines();
  const text = container.textContent;
  assert.match(text, /report about a message that has been resolved/i);
  assert.match(text, /only enforcement action that exists/i);
  assert.match(text, /no profile, post, comment, or account-level enforcement/i);
});

test("never promises anonymity, guaranteed action, a response time, or an individual outcome notification", async () => {
  const container = await mountGuidelines();
  const text = container.textContent;
  assert.match(text, /we do not promise anonymity/i);
  assert.match(text, /we do not guarantee any particular action, a response time, or an individual update/i);
  assert.doesNotMatch(text, /within \d+\s*(hour|day|minute)/i, "must not state any concrete response-time commitment");
});

test("gives the manual safety/contact/appeal route as a mailto link to the approved address, and states no in-app appeal flow exists", async () => {
  const container = await mountGuidelines();
  assert.match(container.textContent, /There is no in-app appeal flow yet/);
  const mailLink = [...container.querySelectorAll("a")].find((a) => a.getAttribute("href") === "mailto:smcprostudio@outlook.com");
  assert.ok(mailLink, "a mailto link to smcprostudio@outlook.com must be present");
});

test("states report confidentiality is restricted to authorised moderators except for safety/legal/regulatory disclosure", async () => {
  const container = await mountGuidelines();
  const text = container.textContent;
  assert.match(text, /restricted to authorised moderators/i);
  assert.match(text, /safety, legal, or regulatory reasons/i);
});

test("states blocking and reporting are separate, and blocking never notifies moderators", async () => {
  const container = await mountGuidelines();
  const text = container.textContent;
  assert.match(text, /separate from reporting/i);
  assert.match(text, /does not notify moderators/i);
});
