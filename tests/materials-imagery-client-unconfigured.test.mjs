import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 5 Slice C: proves materialsClient.ts's imagery functions behave
// correctly when Supabase is unconfigured — getMaterialImageUrl degrades to
// a safe null (guest-read convention, like getMaterialBySlug), while
// uploadMaterialImage/removeMaterialImage throw SocialUnavailableError
// before touching storage or an RPC (auth-gated convention, like the other
// staff-authoring functions). Split into its own file for the same
// mock.module one-time-snapshot reason every other *-unconfigured.test.mjs
// file in this repo already documents.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: false,
    getSupabaseClient: () => {
      throw new Error("getSupabaseClient() must not be called when Supabase is unconfigured");
    },
  },
});

const { getMaterialImageUrl, uploadMaterialImage, removeMaterialImage } = await import(
  new URL("../src/social/services/materialsClient.ts", import.meta.url).href
);

const MATERIAL_ID = "d0000000-0000-0000-0000-000000000001";

test("getMaterialImageUrl: an unconfigured Supabase client resolves to null for a real path, before touching the client", () => {
  assert.equal(getMaterialImageUrl(`materials/${MATERIAL_ID}/photo.jpg`), null);
});

test("uploadMaterialImage: an unconfigured Supabase client throws SocialUnavailableError before any upload", async () => {
  const file = new File([new Uint8Array(10)], "photo.jpg", { type: "image/jpeg" });
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, file), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});

test("removeMaterialImage: an unconfigured Supabase client throws SocialUnavailableError before any RPC call", async () => {
  await assert.rejects(() => removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/photo.jpg`), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    return true;
  });
});
