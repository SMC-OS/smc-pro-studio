import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 5 Slice A: real-mount interaction coverage for NetworkRoute's
// Materials tab, following this repo's existing jsdom + node:test convention
// for behavioral proof (see tests/messages-route.test.mjs). The
// pre-existing Professionals tab and its own tests are untouched — this
// file only covers what Slice A actually changed.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const useAuthSessionUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const socialClientUrl = new URL("../src/social/services/socialClient.ts", import.meta.url).href;
const materialsClientUrl = new URL("../src/social/services/materialsClient.ts", import.meta.url).href;

let authState = { status: "guest" };
let fetchPublishedMaterialsImpl = async () => [];
const fetchPublishedMaterialsCalls = [];

mock.module(useAuthSessionUrl, {
  exports: { useAuthSession: () => authState },
});

mock.module(socialClientUrl, {
  exports: {
    // Professionals tab is unaffected by this slice; a quiet, genuinely
    // empty resolve keeps its own load from ever failing/erroring in these
    // Materials-focused tests.
    searchPublicProfessionals: async () => ({ items: [], nextCursor: null }),
  },
});

mock.module(materialsClientUrl, {
  exports: {
    MATERIAL_CATEGORIES: ["quartz", "granite", "marble", "porcelain", "dekton"],
    getMaterialImageUrl: (path) => (path ? `https://cdn.test/materials-media/${path}` : null),
    fetchPublishedMaterials: async (...args) => {
      fetchPublishedMaterialsCalls.push(args);
      return fetchPublishedMaterialsImpl(...args);
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: NetworkRoute } = await import(new URL("../src/social/routes/NetworkRoute.tsx", import.meta.url).href);

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  return createRoot(container);
}

async function mount() {
  const root = freshRoot();
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ["/network"] }, React.createElement(NetworkRoute)));
  });
  return document.getElementById("root");
}

async function flush(ms = 20) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function findTab(container, label) {
  const tab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent.trim() === label);
  assert.ok(tab, `expected a [role="tab"] labelled "${label}"`);
  return tab;
}

async function clickMaterialsTab(container) {
  await React.act(async () => {
    findTab(container, "Materials").click();
  });
  await flush();
}

const VALID_MATERIAL = {
  id: "d0000000-0000-0000-0000-000000000001",
  slug: "calacatta-quartz",
  name: "Calacatta Quartz",
  category: "quartz",
  summary: "A fixture summary.",
  description: "A longer fixture description.",
  applications: ["Kitchen Worktops"],
  image_path: null,
};

test.beforeEach(() => {
  authState = { status: "guest" };
  fetchPublishedMaterialsImpl = async () => [];
  fetchPublishedMaterialsCalls.length = 0;
});

test("Materials tab: loading state renders before the genuinely-empty message", async () => {
  let resolveList;
  fetchPublishedMaterialsImpl = () => new Promise((resolve) => { resolveList = resolve; });
  const container = await mount();
  await clickMaterialsTab(container);
  assert.match(container.textContent, /Loading materials/);
  assert.doesNotMatch(container.textContent, /No materials published yet/);
  await React.act(async () => resolveList([]));
  await flush();
});

test("Materials tab: a confirmed zero-row result across all categories renders the genuine empty state", async () => {
  fetchPublishedMaterialsImpl = async () => [];
  const container = await mount();
  await clickMaterialsTab(container);
  assert.match(container.textContent, /No materials published yet/);
});

test("Materials tab: a category with zero results renders the filtered-empty state, distinct from the all-categories empty state", async () => {
  fetchPublishedMaterialsImpl = async (category) => (category ? [] : [VALID_MATERIAL]);
  const container = await mount();
  await clickMaterialsTab(container);
  assert.match(container.textContent, /Calacatta Quartz/);

  await React.act(async () => {
    findTab(container, "Granite").click();
  });
  await flush();

  assert.match(container.textContent, /No materials in this category yet/);
  assert.doesNotMatch(container.textContent, /No materials published yet/, "the filtered-empty state must use different copy than the all-categories empty state");

  const showAll = [...container.querySelectorAll("button")].find((b) => /Show all categories/i.test(b.textContent));
  assert.ok(showAll, "expected a 'Show all categories' action");
  await React.act(async () => showAll.click());
  await flush();
  assert.match(container.textContent, /Calacatta Quartz/, "clearing back to All must show the previously-hidden result again");
});

test("Materials tab: a query failure renders the safe error state with Retry, and Retry re-fetches", async () => {
  let calls = 0;
  fetchPublishedMaterialsImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("Materials could not be loaded. Please try again.");
    return [];
  };
  const container = await mount();
  await clickMaterialsTab(container);
  assert.match(container.textContent, /Materials could not be loaded\. Please try again\./);
  const retryButton = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  assert.ok(retryButton, "expected a Retry control");
  await React.act(async () => retryButton.click());
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /No materials published yet/);
});

test("Materials tab: a populated result renders name, category label, summary, and a link to the detail route — no price/stock/origin content", async () => {
  fetchPublishedMaterialsImpl = async () => [VALID_MATERIAL];
  const container = await mount();
  await clickMaterialsTab(container);
  assert.match(container.textContent, /Calacatta Quartz/);
  assert.match(container.textContent, /Quartz/);
  assert.match(container.textContent, /A fixture summary\./);
  const link = container.querySelector(`a[href="/materials/${VALID_MATERIAL.slug}"]`);
  assert.ok(link, "expected a link into the material's detail route");
  assert.doesNotMatch(container.textContent, /£|price|stock|origin|certifi|warrant/i);
});

test("Materials tab: clicking a category chip calls fetchPublishedMaterials with exactly that category", async () => {
  fetchPublishedMaterialsImpl = async () => [];
  const container = await mount();
  await clickMaterialsTab(container);
  fetchPublishedMaterialsCalls.length = 0;

  await React.act(async () => {
    findTab(container, "Quartz").click();
  });
  await flush();

  assert.deepEqual(fetchPublishedMaterialsCalls.at(-1), ["quartz"]);
});

test("Materials tab: category chips cover exactly the five locked categories, no more and no fewer", async () => {
  const container = await mount();
  await clickMaterialsTab(container);
  for (const label of ["Quartz", "Granite", "Marble", "Porcelain", "Dekton"]) {
    findTab(container, label);
  }
  const materialTabList = [...container.querySelectorAll('[role="tablist"]')].find(
    (el) => el.getAttribute("aria-label") === "Material category"
  );
  assert.ok(materialTabList);
  const chipLabels = [...materialTabList.querySelectorAll('[role="tab"]')].map((el) => el.textContent.trim());
  assert.deepEqual(chipLabels, ["All", "Quartz", "Granite", "Marble", "Porcelain", "Dekton"]);
});

test("V1 ships only data-backed tabs: Professionals and Materials, with no 'later slice' placeholder tabs", async () => {
  const container = await mount();
  const labels = [...container.querySelectorAll('[role="tablist"][aria-label="Network categories"] [role="tab"]')].map((t) => t.textContent.trim());
  assert.deepEqual(labels, ["Professionals", "Materials"]);
  assert.doesNotMatch(container.textContent, /arrive in a later slice/);
});

test("Materials tab: a material with an image shows a decorative thumbnail; one without shows none", async () => {
  const path = `materials/${VALID_MATERIAL.id}/0f8b3c1e-1111-4222-8333-944455556666.webp`;
  fetchPublishedMaterialsImpl = async () => [
    { ...VALID_MATERIAL, image_path: path },
    { ...VALID_MATERIAL, id: "d0000000-0000-0000-0000-000000000002", slug: "plain-granite", name: "Plain Granite", category: "granite" },
  ];
  const container = await mount();
  await clickMaterialsTab(container);
  const imgs = container.querySelectorAll("img");
  assert.equal(imgs.length, 1);
  assert.equal(imgs[0].getAttribute("src"), `https://cdn.test/materials-media/${path}`);
  assert.equal(imgs[0].getAttribute("alt"), "", "thumbnail is decorative — the name is already the link text");
  assert.equal(imgs[0].getAttribute("loading"), "lazy");
});
