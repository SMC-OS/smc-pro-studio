import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Launch regression: the project-first Home dashboard must settle correctly
// under React.StrictMode's development-only mount -> cleanup -> remount cycle.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const launchClientUrl = new URL("../src/social/services/launchClient.ts", import.meta.url).href;

let dashboardLoads = 0;

mock.module(authUrl, {
  exports: {
    useAuthSession: () => ({ status: "authenticated", session: { subject: "user-1" } }),
  },
});

mock.module(launchClientUrl, {
  exports: {
    fetchLaunchDashboard: async () => {
      dashboardLoads += 1;
      return {
        profile: { display_name: "Alder Stone", account_type: "customer" },
        projects: [
          {
            id: "project-1",
            title: "Kitchen renovation",
            status: "fabrication",
            progress: 68,
            target_completion_date: null,
            updated_at: new Date().toISOString(),
            property: { label: "Home", city: "London" },
          },
        ],
        quoteRequests: [],
        quotes: [],
        appointments: [],
        unreadNotifications: 0,
      };
    },
    fetchLaunchProjects: async () => [],
    fetchLaunchProject: async () => null,
    fetchStudioDesigns: async () => [],
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: HomeRoute } = await import(new URL("../src/social/routes/HomeRoute.tsx", import.meta.url).href);

test("the launch dashboard settles and renders real project state under React.StrictMode", async () => {
  const container = document.getElementById("root");

  await React.act(async () => {
    const root = createRoot(container);
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(MemoryRouter, null, React.createElement(HomeRoute, null)),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  assert.ok(dashboardLoads >= 1, "expected the launch dashboard to be requested");
  assert.match(container.textContent, /Good to see you, Alder/);
  assert.match(container.textContent, /Kitchen renovation/);
  assert.match(container.textContent, /68%/);
  assert.doesNotMatch(container.textContent, /Professional activity/);
});
