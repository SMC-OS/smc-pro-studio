import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 5 Slice B: proves the staff-authoring functions in materialsClient.ts
// throw SocialUnavailableError and never reach a query/RPC when Supabase is
// unconfigured. Split into its own file for the same node:test mock.module
// one-time-snapshot reason materials-client-unconfigured.test.mjs and
// messaging-client-unconfigured.test.mjs already document.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: false,
    getSupabaseClient: () => {
      throw new Error("getSupabaseClient() must not be called when Supabase is unconfigured");
    },
  },
});

const {
  checkCatalogueEditorAccess,
  fetchMaterialsForEditor,
  createDraftMaterial,
  updateDraftMaterial,
  publishMaterial,
  archiveMaterial,
} = await import(new URL("../src/social/services/materialsClient.ts", import.meta.url).href);

const VALID_ID = "d0000000-0000-0000-0000-000000000001";
const VALID_INPUT = { slug: "calacatta-quartz", name: "Calacatta Quartz", category: "quartz" };

test("checkCatalogueEditorAccess: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(() => checkCatalogueEditorAccess(), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});

test("fetchMaterialsForEditor: an unconfigured Supabase client throws SocialUnavailableError before any query", async () => {
  await assert.rejects(() => fetchMaterialsForEditor(), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});

test("createDraftMaterial: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(() => createDraftMaterial(VALID_INPUT), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});

test("updateDraftMaterial: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(() => updateDraftMaterial(VALID_ID, VALID_INPUT), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});

test("publishMaterial: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(() => publishMaterial(VALID_ID), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});

test("archiveMaterial: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(() => archiveMaterial(VALID_ID), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});
