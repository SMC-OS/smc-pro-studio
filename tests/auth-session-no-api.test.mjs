import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Launch roadmap V1-4: the social shell's session hook must not depend on the
// Express API (a packaged mobile app has none), so useAuthSession asks
// getAuthSession for no server roles.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const calls = [];
mock.module(new URL("../src/services/authClient.ts", import.meta.url).href, {
  exports: {
    getAuthSession: async (options) => {
      calls.push(options);
      return { subject: "u1", email: "a@example.test", emailVerified: true, roles: [] };
    },
    onAuthSessionChange: () => () => undefined,
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { useAuthSession } = await import(new URL("../src/social/services/useAuthSession.ts", import.meta.url).href);

test("useAuthSession reads the session without the Express API round-trip", async () => {
  let seen;
  function Probe() {
    seen = useAuthSession();
    return null;
  }
  const root = createRoot(document.getElementById("root"));
  await React.act(async () => root.render(React.createElement(Probe)));
  await React.act(async () => new Promise((r) => setTimeout(r, 10)));
  assert.deepEqual(calls, [{ includeServerRoles: false }]);
  assert.equal(seen.status, "authenticated");
});
