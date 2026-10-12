import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 5 Slice A: real-mount interaction coverage for the public
// /materials/:slug detail route, following this repo's existing jsdom +
// node:test convention (see tests/conversation-route.test.mjs for the same
// pattern applied to a param-based route).

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const materialsClientUrl = new URL("../src/social/services/materialsClient.ts", import.meta.url).href;

let fetchMaterialBySlugImpl = async () => null;
const fetchMaterialBySlugCalls = [];

mock.module(materialsClientUrl, {
  exports: {
    getMaterialImageUrl: (path) => (path ? `https://cdn.test/materials-media/${path}` : null),
    fetchMaterialBySlug: async (...args) => {
      fetchMaterialBySlugCalls.push(args);
      return fetchMaterialBySlugImpl(...args);
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { default: MaterialDetailRoute } = await import(new URL("../src/social/routes/MaterialDetailRoute.tsx", import.meta.url).href);

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  return createRoot(container);
}

async function mount(path) {
  const root = freshRoot();
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(Routes, null, React.createElement(Route, { path: "/materials/:slug", element: React.createElement(MaterialDetailRoute) }))
      )
    );
  });
  return document.getElementById("root");
}

async function flush(ms = 20) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
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
  fetchMaterialBySlugImpl = async () => null;
  fetchMaterialBySlugCalls.length = 0;
});

test("loading state renders before the result", async () => {
  let resolve;
  fetchMaterialBySlugImpl = () => new Promise((r) => { resolve = r; });
  const container = await mount("/materials/calacatta-quartz");
  assert.match(container.textContent, /Loading material/);
  await React.act(async () => resolve(VALID_MATERIAL));
  await flush();
});

test("a published material renders its name, category, description, and applications — no price/stock/origin content", async () => {
  fetchMaterialBySlugImpl = async (slug) => (slug === "calacatta-quartz" ? VALID_MATERIAL : null);
  const container = await mount("/materials/calacatta-quartz");
  await flush();
  assert.deepEqual(fetchMaterialBySlugCalls, [["calacatta-quartz"]]);
  assert.match(container.textContent, /Calacatta Quartz/);
  assert.match(container.textContent, /Quartz/);
  assert.match(container.textContent, /A longer fixture description\./);
  assert.match(container.textContent, /Kitchen Worktops/);
  assert.doesNotMatch(container.textContent, /£|price|stock|origin|certifi|warrant|provenance|image/i);
});

test("an unknown slug resolves to the not-found state", async () => {
  fetchMaterialBySlugImpl = async () => null;
  const container = await mount("/materials/does-not-exist");
  await flush();
  assert.match(container.textContent, /Material not found/);
});

test("a draft-or-archived material (indistinguishable from unknown at the service layer) resolves to the identical not-found state, never a distinct draft/archived message", async () => {
  // fetchMaterialBySlug's own contract (proven in materials-client.test.mjs)
  // is that draft/archived/nonexistent are all indistinguishable — this
  // route must not introduce a second signal that would let it tell them
  // apart.
  fetchMaterialBySlugImpl = async () => null;
  const container = await mount("/materials/retired-marble");
  await flush();
  assert.match(container.textContent, /Material not found/);
  assert.doesNotMatch(container.textContent, /draft|archived/i);
});

test("a query failure renders the safe error state with Retry, and Retry re-fetches", async () => {
  let calls = 0;
  fetchMaterialBySlugImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("This material could not be loaded. Please try again.");
    return VALID_MATERIAL;
  };
  const container = await mount("/materials/calacatta-quartz");
  await flush();
  assert.match(container.textContent, /This material could not be loaded\. Please try again\./);
  const retryButton = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  assert.ok(retryButton, "expected a Retry control");
  await React.act(async () => retryButton.click());
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /Calacatta Quartz/);
});

test("the not-found state offers a link back to Network", async () => {
  const container = await mount("/materials/does-not-exist");
  await flush();
  const link = container.querySelector('a[href="/network"]');
  assert.ok(link, "expected a link back to Network");
});

// ==========================================================================
// Phase 5 Slice C: editorial image
// ==========================================================================

test("a material with an image renders it with descriptive alt text from the public bucket URL", async () => {
  const path = `materials/${VALID_MATERIAL.id}/0f8b3c1e-1111-4222-8333-944455556666.jpg`;
  fetchMaterialBySlugImpl = async () => ({ ...VALID_MATERIAL, image_path: path });
  const container = await mount("/materials/calacatta-quartz");
  await flush();
  const img = container.querySelector("img");
  assert.ok(img, "expected the material image");
  assert.equal(img.getAttribute("src"), `https://cdn.test/materials-media/${path}`);
  assert.equal(img.getAttribute("alt"), "Calacatta Quartz surface");
});

test("a material without an image renders no image and no placeholder", async () => {
  fetchMaterialBySlugImpl = async () => VALID_MATERIAL;
  const container = await mount("/materials/calacatta-quartz");
  await flush();
  assert.equal(container.querySelectorAll("img").length, 0);
});

test("an image that fails to load is removed rather than shown broken", async () => {
  const path = `materials/${VALID_MATERIAL.id}/0f8b3c1e-1111-4222-8333-944455556666.jpg`;
  fetchMaterialBySlugImpl = async () => ({ ...VALID_MATERIAL, image_path: path });
  const container = await mount("/materials/calacatta-quartz");
  await flush();
  await React.act(async () => container.querySelector("img").dispatchEvent(new window.Event("error")));
  await flush();
  assert.equal(container.querySelectorAll("img").length, 0);
});
