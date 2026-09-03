import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Community Guidelines owner-review pass: real-mount coverage for the
// Community Guidelines link on the signup (register) form. Mounts AuthForm
// directly with initialMode="register" — it takes initialMode/lockMode/
// onSuccess as plain props, no route-param dependency (the same "mount the
// leaf component directly, not the whole route" convention
// message-report.test.mjs already established for ThreadView). authClient.ts
// is mocked wholesale, mirroring moderation-route.test.mjs's own
// authClientUrl mock and its documented reason: the real module reaches
// supabaseClient.ts and crashes on `import.meta.env` outside a Vite context.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authClientUrl = new URL("../src/services/authClient.ts", import.meta.url).href;

let signUpCalls = [];
let signUpImpl = async () => ({ requiresEmailVerification: true });

mock.module(authClientUrl, {
  exports: {
    isOAuthProviderEnabled: () => false,
    requestPasswordReset: async () => {},
    signInWithOAuth: async () => {},
    signInWithPassword: async () => {},
    signUpWithPassword: async (...args) => {
      signUpCalls.push(args);
      return signUpImpl(...args);
    },
    updatePassword: async () => {},
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: AuthForm } = await import(new URL("../src/social/components/AuthForm.tsx", import.meta.url).href);

let currentRoot = null;

function resetAll() {
  signUpCalls = [];
  signUpImpl = async () => ({ requiresEmailVerification: true });
}

function freshRoot() {
  document.getElementById("root")?.remove();
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  currentRoot = createRoot(container);
  return currentRoot;
}

afterEach(async () => {
  if (currentRoot) {
    await React.act(async () => {
      currentRoot.unmount();
    });
    currentRoot = null;
  }
});

async function flush(ms = 100) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

// Renders register mode directly via the prop AuthRoute.tsx itself uses
// (`initialMode="register"`) — this is "switch to signup mode" via the same
// real mechanism the actual /auth?mode=register route relies on, not a
// separate reimplementation of that logic.
async function mountRegister() {
  const root = freshRoot();
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, {}, React.createElement(AuthForm, { initialMode: "register", onSuccess: () => {} })));
  });
  await flush();
  return document.getElementById("root");
}

test("the Community Guidelines link is present on the signup form, with an exact /community-guidelines href", async () => {
  resetAll();
  const container = await mountRegister();
  assert.match(container.textContent, /Create your account/, "must genuinely be in register mode, not login");
  const link = [...container.querySelectorAll("a")].find((a) => a.textContent.trim() === "Community Guidelines");
  assert.ok(link, "expected a Community Guidelines link on the signup form");
  assert.equal(link.getAttribute("href"), "/community-guidelines");
});

test("no fabricated /terms route or unrelated Terms/Privacy change was introduced — 'Terms of Use' and 'Privacy Notice' remain plain text, not links", async () => {
  const container = await mountRegister();
  const links = [...container.querySelectorAll("a")].map((a) => a.textContent.trim());
  assert.ok(!links.includes("Terms of Use"), "Terms of Use must not become a link (no /terms route exists in this shell)");
  assert.ok(!links.includes("Privacy Notice"), "Privacy Notice must remain exactly as before — unlinked plain text");
  assert.match(container.textContent, /I accept the Terms of Use and Community Guidelines, and acknowledge the Privacy Notice/);
  assert.match(container.textContent, /All require final legal review before public beta/);
});

test("the acceptance checkbox is still required — submitting register mode with it unchecked never calls signUpWithPassword", async () => {
  resetAll();
  const container = await mountRegister();
  // "Full name" is also a required native field (TextField's own `required`
  // attribute) — left unfilled, jsdom's constraint validation silently
  // blocks form submission before React's onSubmit ever runs, which would
  // make this test indistinguishable from a genuine checkbox-gating proof.
  const nameInput = container.querySelector('input:not([type])');
  const emailInput = container.querySelector('input[type="email"]');
  const passwordInputs = [...container.querySelectorAll('input[type="password"]')];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(nameInput, "Test Signup");
    nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    nativeSetter.call(emailInput, "new.signup@example.com");
    emailInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    nativeSetter.call(passwordInputs[0], "correcthorsebattery");
    passwordInputs[0].dispatchEvent(new window.Event("input", { bubbles: true }));
    nativeSetter.call(passwordInputs[1], "correcthorsebattery");
    passwordInputs[1].dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const checkbox = container.querySelector('input[type="checkbox"]');
  assert.equal(checkbox.checked, false, "the checkbox must start unchecked");

  const submit = [...container.querySelectorAll('button[type="submit"]')].find((b) => b.textContent.trim() === "Create account");
  await React.act(async () => {
    submit.click();
  });
  await flush();
  assert.equal(signUpCalls.length, 0, "signUpWithPassword must never be called while the acceptance checkbox is unchecked");
  assert.match(container.textContent, /Accept the Terms and Privacy Notice to create an account/i);
});

test("checking the acceptance checkbox and submitting a valid form does call signUpWithPassword — the checkbox is the only thing that was blocking it", async () => {
  resetAll();
  const container = await mountRegister();
  // "Full name" is also a required native field (TextField's own `required`
  // attribute) — left unfilled, jsdom's constraint validation silently
  // blocks form submission before React's onSubmit ever runs, which would
  // make this test indistinguishable from a genuine checkbox-gating proof.
  const nameInput = container.querySelector('input:not([type])');
  const emailInput = container.querySelector('input[type="email"]');
  const passwordInputs = [...container.querySelectorAll('input[type="password"]')];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await React.act(async () => {
    nativeSetter.call(nameInput, "Test Signup");
    nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    nativeSetter.call(emailInput, "new.signup@example.com");
    emailInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    nativeSetter.call(passwordInputs[0], "correcthorsebattery");
    passwordInputs[0].dispatchEvent(new window.Event("input", { bubbles: true }));
    nativeSetter.call(passwordInputs[1], "correcthorsebattery");
    passwordInputs[1].dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const checkbox = container.querySelector('input[type="checkbox"]');
  await React.act(async () => {
    checkbox.click();
  });
  assert.equal(checkbox.checked, true);

  const submit = [...container.querySelectorAll('button[type="submit"]')].find((b) => b.textContent.trim() === "Create account");
  await React.act(async () => {
    submit.click();
  });
  await flush();
  assert.equal(signUpCalls.length, 1, "checking the box must be sufficient to let submission proceed to signUpWithPassword");
});
