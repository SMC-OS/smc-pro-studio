import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Phase 5 Slice C real-backend gate: catalogue imagery against a running
// local Supabase stack (Auth + PostgREST + Storage API + Postgres). Only the
// supabase-js *configuration* is injected — every upload, RPC, RLS and
// storage-policy decision below is made by the real services.
//
// Required environment (skipped without it): SMC_REAL_SUPABASE_URL,
// SMC_REAL_SUPABASE_ANON_KEY, SMC_REAL_SUPABASE_SERVICE_KEY. The service key
// is used only for fixture setup/teardown (creating users, assigning the
// catalogue_editor staff role, deleting fixtures) — never for an assertion.
// Local only: refuses any non-localhost URL.

const URL_ = process.env.SMC_REAL_SUPABASE_URL;
const ANON = process.env.SMC_REAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.SMC_REAL_SUPABASE_SERVICE_KEY;
const configured = Boolean(URL_ && ANON && SERVICE);
if (configured && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
  throw new Error("materials-imagery.real.test.mjs refuses to run against a non-local Supabase URL.");
}

const newClient = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = configured ? newClient() : null;
const service = configured ? createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
let activeClient = anonClient;

mock.module(new URL("../../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: configured,
    getSupabaseClient: () => activeClient,
    getAuthAccessToken: async () => null,
    getAuthRedirectUrl: () => "http://127.0.0.1:5173/auth/callback",
    SupabaseConfigurationError: Error,
  },
});

const mc = await import(new URL("../../src/social/services/materialsClient.ts", import.meta.url).href);

const RUN = `slice-c-${Date.now().toString(36)}`;
const PASSWORD = "Integration-Test-Pass-1";
const users = [];
const materialIds = [];
let editor;
let nonEditor;

// A real, minimal 1x1 JPEG.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);
const jpegFile = (name = "slab.jpg") => new File([JPEG], name, { type: "image/jpeg" });

async function signedIn(email) {
  const c = newClient();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

async function makeUser(label) {
  const email = `${RUN}-${label}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: label } });
  if (error) throw error;
  users.push(data.user.id);
  return { id: data.user.id, email, client: await signedIn(email) };
}

async function as(user, fn) {
  activeClient = user ? user.client : anonClient;
  try {
    return await fn();
  } finally {
    activeClient = anonClient;
  }
}

async function objectExists(path) {
  const res = await fetch(`${URL_}/storage/v1/object/public/materials-media/${path}`);
  return res.status === 200;
}

async function rowImagePath(id) {
  const { data, error } = await service.from("materials").select("image_path").eq("id", id).single();
  if (error) throw error;
  return data.image_path;
}

before(async () => {
  if (!configured) return;
  editor = await makeUser("editor");
  nonEditor = await makeUser("member");
  const { error } = await service.from("user_roles").insert({ user_id: editor.id, role: "catalogue_editor", assignment_reason: "Slice C integration fixture" });
  if (error) throw error;
});

after(async () => {
  if (!configured) return;
  const { data: objects } = await service.storage.from("materials-media").list("materials", { limit: 1000 });
  for (const id of materialIds) {
    const { data: files } = await service.storage.from("materials-media").list(`materials/${id}`);
    if (files?.length) await service.storage.from("materials-media").remove(files.map((f) => `materials/${id}/${f.name}`));
  }
  void objects;
  if (materialIds.length) await service.from("materials").delete().in("id", materialIds);
  if (users.length) await service.from("user_roles").delete().in("user_id", users);
  for (const id of users) await service.auth.admin.deleteUser(id);
});

const skip = configured ? false : "SMC_REAL_SUPABASE_* not set — real-backend gate not run";

async function newDraft(slugSuffix) {
  const draft = await as(editor, () =>
    mc.createDraftMaterial({ slug: `${RUN}-${slugSuffix}`, name: `Fixture ${slugSuffix}`, category: "quartz", summary: "Fixture summary.", applications: [] }),
  );
  materialIds.push(draft.id);
  return draft;
}

test("an editor uploads an image: the object is stored under materials/<id>/ and the row points at it", { skip }, async () => {
  const draft = await newDraft("upload");
  const result = await as(editor, () => mc.uploadMaterialImage(draft.id, jpegFile()));
  assert.match(result.image_path, new RegExp(`^materials/${draft.id}/[0-9a-f-]{36}\\.jpg$`));
  assert.equal(await rowImagePath(draft.id), result.image_path);
  assert.ok(await objectExists(result.image_path), "the uploaded object is served from the public bucket");
});

test("replacing an image removes the previous object only after the row is updated", { skip }, async () => {
  const draft = await newDraft("replace");
  const first = await as(editor, () => mc.uploadMaterialImage(draft.id, jpegFile()));
  const second = await as(editor, () => mc.uploadMaterialImage(draft.id, jpegFile("again.jpg"), first.image_path));
  assert.notEqual(second.image_path, first.image_path);
  assert.equal(await rowImagePath(draft.id), second.image_path);
  assert.ok(await objectExists(second.image_path));
  assert.equal(await objectExists(first.image_path), false, "the replaced object is gone");
});

test("removing an image clears the row and deletes the object", { skip }, async () => {
  const draft = await newDraft("remove");
  const up = await as(editor, () => mc.uploadMaterialImage(draft.id, jpegFile()));
  const cleared = await as(editor, () => mc.removeMaterialImage(draft.id, up.image_path));
  assert.deepEqual(cleared, { id: draft.id, image_path: null });
  assert.equal(await rowImagePath(draft.id), null);
  assert.equal(await objectExists(up.image_path), false);
});

test("guests see the image of a published material through the public read path", { skip }, async () => {
  const draft = await newDraft("published");
  const up = await as(editor, () => mc.uploadMaterialImage(draft.id, jpegFile()));
  await as(editor, () => mc.publishMaterial(draft.id));
  const material = await as(null, () => mc.fetchMaterialBySlug(`${RUN}-published`));
  assert.equal(material.image_path, up.image_path);
  const url = await as(null, () => mc.getMaterialImageUrl(material.image_path));
  const res = await fetch(url);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), JPEG);
});

test("a signed-in non-editor cannot upload into the bucket or attach an image (storage RLS + RPC)", { skip }, async () => {
  const draft = await newDraft("non-editor");
  await as(nonEditor, async () => {
    await assert.rejects(() => mc.uploadMaterialImage(draft.id, jpegFile()), (err) => err.operation === "upload_image");
  });
  const direct = await nonEditor.client.storage.from("materials-media").upload(`materials/${draft.id}/sneaky.jpg`, JPEG, { contentType: "image/jpeg" });
  assert.ok(direct.error, "storage policy rejects a non-editor write");
  assert.equal(await objectExists(`materials/${draft.id}/sneaky.jpg`), false);
  const rpc = await nonEditor.client.rpc("set_material_image", { p_id: draft.id, p_image_path: `materials/${draft.id}/x.jpg` });
  assert.ok(rpc.error);
  assert.equal(await rowImagePath(draft.id), null);
});

test("anon can neither upload nor call the image RPCs", { skip }, async () => {
  const draft = await newDraft("anon");
  const up = await anonClient.storage.from("materials-media").upload(`materials/${draft.id}/anon.jpg`, JPEG, { contentType: "image/jpeg" });
  assert.ok(up.error);
  const set = await anonClient.rpc("set_material_image", { p_id: draft.id, p_image_path: `materials/${draft.id}/anon.jpg` });
  assert.equal(set.error?.code, "42501");
  const clear = await anonClient.rpc("clear_material_image", { p_id: draft.id });
  assert.equal(clear.error?.code, "42501");
});

test("set_material_image refuses a path that was never uploaded, or one belonging to another material", { skip }, async () => {
  const a = await newDraft("owner-a");
  const b = await newDraft("owner-b");
  const upB = await as(editor, () => mc.uploadMaterialImage(b.id, jpegFile()));
  const ghost = await editor.client.rpc("set_material_image", { p_id: a.id, p_image_path: `materials/${a.id}/00000000-0000-4000-8000-000000000000.jpg` });
  assert.ok(ghost.error, "a never-uploaded object is rejected");
  const foreign = await editor.client.rpc("set_material_image", { p_id: a.id, p_image_path: upB.image_path });
  assert.ok(foreign.error, "another material's object is rejected");
  assert.equal(await rowImagePath(a.id), null);
});

test("revoking the editor role immediately removes upload rights", { skip }, async () => {
  const draft = await newDraft("revoked");
  const temp = await makeUser("temp-editor");
  const { error } = await service.from("user_roles").insert({ user_id: temp.id, role: "catalogue_editor", assignment_reason: "fixture" });
  assert.equal(error, null);
  await as(temp, () => mc.uploadMaterialImage(draft.id, jpegFile()));
  await service.from("user_roles").update({ revoked_at: new Date().toISOString(), revoked_by: editor.id }).eq("user_id", temp.id);
  await as(temp, async () => {
    await assert.rejects(() => mc.uploadMaterialImage(draft.id, jpegFile()), (err) => err.operation === "upload_image");
  });
});

// Kept last: the oversized-body request ends with the server closing the
// connection mid-upload, which must not disturb any other test's requests.
test("the bucket itself enforces type and size, even when the client-side checks are bypassed", { skip }, async () => {
  const draft = await newDraft("limits");
  const gif = await editor.client.storage
    .from("materials-media")
    .upload(`materials/${draft.id}/anim.gif`, Buffer.from("GIF89a"), { contentType: "image/gif" });
  assert.ok(gif.error, "image/gif is not an allowed mime type");
  const big = await editor.client.storage
    .from("materials-media")
    .upload(`materials/${draft.id}/huge.jpg`, Buffer.alloc(8 * 1024 * 1024 + 1), { contentType: "image/jpeg" });
  assert.ok(big.error, "objects over 8MB are rejected by the bucket limit");
});
