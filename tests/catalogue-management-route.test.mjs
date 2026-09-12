import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Phase 5 Slice B: real-mount interaction coverage for /catalogue
// (CatalogueManagementRoute), following this repo's existing jsdom +
// node:test convention (see tests/messages-route.test.mjs for the same
// mount/flush/click pattern applied to a simpler, non-dialog screen).

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  (() => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authUrl = new URL("../src/social/services/useAuthSession.ts", import.meta.url).href;
const materialsClientUrl = new URL("../src/social/services/materialsClient.ts", import.meta.url).href;

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";

let authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
let checkAccessImpl = async () => true;
let fetchListImpl = async () => [];
let createImpl = async () => {
  throw new Error("createDraftMaterial not configured for this test");
};
let updateImpl = async () => {
  throw new Error("updateDraftMaterial not configured for this test");
};
let publishImpl = async () => {
  throw new Error("publishMaterial not configured for this test");
};
let archiveImpl = async () => {
  throw new Error("archiveMaterial not configured for this test");
};
const createCalls = [];
const publishCalls = [];
const archiveCalls = [];

mock.module(authUrl, {
  exports: { useAuthSession: () => authState },
});

mock.module(materialsClientUrl, {
  exports: {
    MATERIAL_CATEGORIES: ["quartz", "granite", "marble", "porcelain", "dekton"],
    checkCatalogueEditorAccess: async () => checkAccessImpl(),
    fetchMaterialsForEditor: async () => fetchListImpl(),
    createDraftMaterial: async (input) => {
      createCalls.push(input);
      return createImpl(input);
    },
    updateDraftMaterial: async (id, input) => updateImpl(id, input),
    publishMaterial: async (id) => {
      publishCalls.push(id);
      return publishImpl(id);
    },
    archiveMaterial: async (id) => {
      archiveCalls.push(id);
      return archiveImpl(id);
    },
  },
});

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: CatalogueManagementRoute } = await import(new URL("../src/social/routes/CatalogueManagementRoute.tsx", import.meta.url).href);

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
    root.render(React.createElement(MemoryRouter, { initialEntries: ["/catalogue"] }, React.createElement(CatalogueManagementRoute)));
  });
  return document.getElementById("root");
}

async function flush(ms = 20) {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

// React overrides the native input/textarea value setter to track
// programmatic vs. user-driven changes, so a plain `.value = x` followed by
// dispatching "input" never reaches a controlled component's onChange under
// jsdom — the same nativeSetter workaround this repo's own
// profile-report.test.mjs/conversation-route.test.mjs already establish.
function typeInto(field, value) {
  const proto = field.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
  nativeSetter.call(field, value);
  field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

const DRAFT_MATERIAL = {
  id: "d0000000-0000-0000-0000-000000000001",
  slug: "calacatta-quartz",
  name: "Calacatta Quartz",
  category: "quartz",
  summary: "A fixture summary.",
  description: "A fixture description.",
  applications: ["Kitchen Worktops"],
  status: "draft",
};

const PUBLISHED_MATERIAL = { ...DRAFT_MATERIAL, id: "d0000000-0000-0000-0000-000000000002", slug: "polished-granite", status: "published" };

test.beforeEach(() => {
  authState = { status: "authenticated", session: { subject: AUTH_USER_ID } };
  checkAccessImpl = async () => true;
  fetchListImpl = async () => [];
  createCalls.length = 0;
  publishCalls.length = 0;
  archiveCalls.length = 0;
});

test("guest: no access check runs, and an accessible sign-in link is shown", async () => {
  authState = { status: "guest" };
  const container = await mount();
  await flush();
  const link = container.querySelector('a[href="/auth"]');
  assert.ok(link, "expected an accessible link to /auth");
  assert.match(container.textContent, /Sign in to manage the catalogue/);
});

test("access denied: a neutral message is shown, never implying whether any material exists", async () => {
  checkAccessImpl = async () => false;
  const container = await mount();
  await flush();
  assert.match(container.textContent, /You don't have access to this page/);
  assert.doesNotMatch(container.textContent, /No materials/);
});

test("access check failure renders the safe error state with Retry", async () => {
  let calls = 0;
  checkAccessImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("We couldn't verify your access. Please try again.");
    return true;
  };
  const container = await mount();
  await flush();
  assert.match(container.textContent, /We couldn't verify your access\. Please try again\./);
  const retryButton = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  assert.ok(retryButton);
  await React.act(async () => retryButton.click());
  await flush();
  assert.equal(calls, 2);
});

test("granted: loading state renders before the empty message", async () => {
  let resolveList;
  fetchListImpl = () => new Promise((resolve) => { resolveList = resolve; });
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Loading catalogue/);
  await React.act(async () => resolveList([]));
  await flush();
});

test("granted: a genuinely empty catalogue renders the honest empty state", async () => {
  fetchListImpl = async () => [];
  const container = await mount();
  await flush();
  assert.match(container.textContent, /No materials yet/);
});

test("granted: a catalogue-load failure renders the safe error state with Retry", async () => {
  let calls = 0;
  fetchListImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("The catalogue could not be loaded. Please try again.");
    return [DRAFT_MATERIAL];
  };
  const container = await mount();
  await flush();
  assert.match(container.textContent, /The catalogue could not be loaded\. Please try again\./);
  const retryButton = [...container.querySelectorAll("button")].find((b) => /try again/i.test(b.textContent));
  await React.act(async () => retryButton.click());
  await flush();
  assert.equal(calls, 2);
  assert.match(container.textContent, /Calacatta Quartz/);
});

test("granted: the catalogue list shows draft/published status badges and no fabricated price/stock/origin content", async () => {
  fetchListImpl = async () => [DRAFT_MATERIAL, PUBLISHED_MATERIAL];
  const container = await mount();
  await flush();
  assert.match(container.textContent, /Calacatta Quartz/);
  assert.match(container.textContent, /Draft/);
  assert.match(container.textContent, /Published/);
  assert.doesNotMatch(container.textContent, /£|price|stock|origin|certifi|warrant|provenance/i);
});

test("creating a draft: fills the form, submits, and calls createDraftMaterial with the exact typed input", async () => {
  fetchListImpl = async () => [];
  createImpl = async (input) => ({ ...DRAFT_MATERIAL, ...input, applications: input.applications, status: "draft" });
  const container = await mount();
  await flush();

  const form = container.querySelector("form");
  assert.ok(form, "expected the create form to be present");

  const inputs = [...form.querySelectorAll("input[type=text]")];
  const slugField = inputs[0];
  const nameField = inputs[1];
  const applicationsField = inputs[2];
  const summaryField = form.querySelector("textarea");

  await React.act(async () => {
    typeInto(slugField, "calacatta-quartz");
    typeInto(nameField, "Calacatta Quartz");
    typeInto(summaryField, "A fixture summary.");
    typeInto(applicationsField, "Kitchen Worktops, Bathroom Vanities");
  });

  await React.act(async () => {
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();

  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].slug, "calacatta-quartz");
  assert.equal(createCalls[0].name, "Calacatta Quartz");
  assert.equal(createCalls[0].category, "quartz");
  assert.deepEqual(createCalls[0].applications, ["Kitchen Worktops", "Bathroom Vanities"]);
});

test("a validation failure from the server renders inline and preserves the entered form values", async () => {
  fetchListImpl = async () => [];
  createImpl = async () => {
    throw new Error("Slug must be lowercase letters, numbers, and single hyphens only.");
  };
  const container = await mount();
  await flush();
  const form = container.querySelector("form");
  const inputs = [...form.querySelectorAll("input[type=text]")];
  await React.act(async () => {
    typeInto(inputs[0], "Bad Slug");
    typeInto(inputs[1], "Some Name");
  });
  await React.act(async () => {
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
  assert.match(container.textContent, /Slug must be lowercase letters, numbers, and single hyphens only\./);
  // The form must not have been cleared on failure.
  assert.equal(inputs[0].value, "Bad Slug");
  assert.equal(inputs[1].value, "Some Name");
});

test("publishing: clicking Publish on a draft calls publishMaterial and the list refreshes", async () => {
  let listCall = 0;
  fetchListImpl = async () => {
    listCall += 1;
    return listCall === 1 ? [DRAFT_MATERIAL] : [{ ...DRAFT_MATERIAL, status: "published" }];
  };
  publishImpl = async (id) => ({ ...DRAFT_MATERIAL, id, status: "published" });
  const container = await mount();
  await flush();
  const publishButton = [...container.querySelectorAll("button")].find((b) => /^Publish$/.test(b.textContent.trim()));
  assert.ok(publishButton, "expected a Publish button for the draft");
  await React.act(async () => publishButton.click());
  await flush();
  assert.deepEqual(publishCalls, [DRAFT_MATERIAL.id]);
  assert.match(container.textContent, /Published/);
});

test("publish failure (e.g. missing summary) renders the safe error text, never a raw backend fragment", async () => {
  fetchListImpl = async () => [DRAFT_MATERIAL];
  publishImpl = async () => {
    throw new Error("This material could not be published. Please try again.");
  };
  const container = await mount();
  await flush();
  const publishButton = [...container.querySelectorAll("button")].find((b) => /^Publish$/.test(b.textContent.trim()));
  await React.act(async () => publishButton.click());
  await flush();
  assert.match(container.textContent, /This material could not be published\. Please try again\./);
  assert.doesNotMatch(container.textContent, /publish_material|SQLSTATE|permission denied|row-level security/i);
});

test("archiving: clicking Archive on a published material calls archiveMaterial and the list refreshes", async () => {
  let listCall = 0;
  fetchListImpl = async () => {
    listCall += 1;
    return listCall === 1 ? [PUBLISHED_MATERIAL] : [{ ...PUBLISHED_MATERIAL, status: "archived" }];
  };
  archiveImpl = async (id) => ({ ...PUBLISHED_MATERIAL, id, status: "archived" });
  const container = await mount();
  await flush();
  const archiveButton = [...container.querySelectorAll("button")].find((b) => /^Archive$/.test(b.textContent.trim()));
  assert.ok(archiveButton, "expected an Archive button for the published material");
  await React.act(async () => archiveButton.click());
  await flush();
  assert.deepEqual(archiveCalls, [PUBLISHED_MATERIAL.id]);
  assert.match(container.textContent, /Archived/);
});

test("editing a draft: clicking Edit pre-fills the form, and Cancel restores the empty create form", async () => {
  fetchListImpl = async () => [DRAFT_MATERIAL];
  const container = await mount();
  await flush();
  const editButton = [...container.querySelectorAll("button")].find((b) => /^Edit$/.test(b.textContent.trim()));
  assert.ok(editButton);
  await React.act(async () => editButton.click());
  await flush();
  const form = container.querySelector("form");
  const inputs = [...form.querySelectorAll("input[type=text]")];
  assert.equal(inputs[0].value, "calacatta-quartz");
  assert.equal(inputs[1].value, "Calacatta Quartz");
  assert.match(container.textContent, /Edit draft/);

  const cancelButton = [...container.querySelectorAll("button")].find((b) => /^Cancel$/.test(b.textContent.trim()));
  await React.act(async () => cancelButton.click());
  await flush();
  const inputsAfterCancel = [...container.querySelector("form").querySelectorAll("input[type=text]")];
  assert.equal(inputsAfterCancel[0].value, "");
  assert.match(container.textContent, /New material/);
});

test("a published material offers no Edit control", async () => {
  fetchListImpl = async () => [PUBLISHED_MATERIAL];
  const container = await mount();
  await flush();
  const editButton = [...container.querySelectorAll("button")].find((b) => /^Edit$/.test(b.textContent.trim()));
  assert.equal(editButton, undefined, "a published material must not be directly editable via update_draft_material");
});
