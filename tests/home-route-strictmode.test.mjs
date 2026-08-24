import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Regression test for the StrictMode `mountedRef` bug in HomeRoute: a saved
// post's id, fetched after mount, must still reach the UI even though React
// StrictMode (enabled in src/main.tsx) synchronously mounts -> cleans up ->
// remounts every effect once in development. A `mountedRef` that is only
// ever set to `true` by its `useRef(true)` initializer - and never reset to
// `true` inside the effect body itself - gets stuck at `false` forever after
// that cleanup runs, silently discarding every later fetch result guarded by
// it. This test fails against that implementation and passes once the
// effect body also does `mountedRef.current = true`.
//
// There is no jsdom/React Testing Library/vitest normally installed in this
// project's toolchain (see tests/phase2-foundation.test.mjs) - `jsdom` was
// added as a devDependency specifically to let this one test mount a real
// component tree under `React.StrictMode`. Run via:
//   npx tsx --test --experimental-test-module-mocks tests/home-route-strictmode.test.mjs

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const socialClientUrl = new URL("../src/social/services/socialClient.ts", import.meta.url).href;

const TEST_POST = {
  id: "post-1",
  author_id: "author-1",
  body: "Regression test post",
  visibility: "public",
  post_type: "general",
  created_at: new Date().toISOString(),
  author: null,
};

mock.module(authUrl, {
  exports: {
    useAuthSession: () => ({ status: "authenticated", session: { subject: "user-1" } }),
  },
});

mock.module(socialClientUrl, {
  exports: {
    fetchHomeFeed: async () => ({ posts: [TEST_POST], nextCursor: null }),
    // The post is already saved server-side before this card ever mounts -
    // exactly the "late initial saved-ID fetch" scenario that was silently
    // dropped by the StrictMode-broken mountedRef guard.
    fetchMySavedPostIds: async () => new Set([TEST_POST.id]),
    fetchPostEngagement: async () => new Map(),
    savePost: async () => {},
    unsavePost: async () => {},
    reactToPost: async () => {},
    unreactToPost: async () => {},
    addComment: async () => ({ id: "comment-1", body: "", created_at: new Date().toISOString(), author: null }),
    deleteComment: async () => {},
    fetchComments: async () => [],
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: HomeRoute } = await import(new URL("../src/social/routes/HomeRoute.tsx", import.meta.url).href);

test("a saved post's id fetched after mount reaches the UI under React.StrictMode", async () => {
  const container = document.getElementById("root");

  await React.act(async () => {
    const root = createRoot(container);
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(MemoryRouter, null, React.createElement(HomeRoute, null))
      )
    );
    // Lets fetchHomeFeed's promise resolve -> state becomes "ready" -> the
    // saved-ids effect fires -> fetchMySavedPostIds's promise resolves ->
    // setSavedIds -> PostCard re-renders with initiallySaved=true. All of
    // this is plain microtask-chained promise work, so draining once past a
    // macrotask boundary is enough to settle it.
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  const saveButton = container.querySelector('button[aria-label="Save post"], button[aria-label="Remove from saved"]');
  assert.ok(saveButton, "expected the post's save/unsave button to render");
  assert.equal(
    saveButton.getAttribute("aria-label"),
    "Remove from saved",
    "the already-saved post's fetched state must reach PostCard even after React StrictMode's mount/cleanup/remount cycle"
  );
});
