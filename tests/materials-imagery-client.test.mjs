import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 5 Slice C: unit coverage for materialsClient.ts's imagery
// additions, against a fake Supabase client, following this repo's
// existing node:test --experimental-test-module-mocks convention (see
// materials-management-client.test.mjs, which this file mirrors for its
// own auth/UUID/error-shape assertions). Slice A/B's functions are already
// covered elsewhere and are untouched by this file.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
  },
});

const { getMaterialImageUrl, uploadMaterialImage, removeMaterialImage, MATERIAL_IMAGE_MAX_BYTES, MaterialsOperationError } = await import(
  new URL("../src/social/services/materialsClient.ts", import.meta.url).href
);

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const MATERIAL_ID = "d0000000-0000-0000-0000-000000000001";

function authUser(userId) {
  return { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) };
}

function jpegFile(sizeBytes = 1024, name = "photo.jpg") {
  const file = new File([new Uint8Array(sizeBytes)], name, { type: "image/jpeg" });
  return file;
}

// ==========================================================================
// getMaterialImageUrl
// ==========================================================================

test("getMaterialImageUrl: returns null for a null path, before touching the client at all", () => {
  currentClient = { storage: { from: () => { throw new Error("storage must not be touched for a null path"); } } };
  assert.equal(getMaterialImageUrl(null), null);
});

test("getMaterialImageUrl: resolves a real path to the bucket's public URL", () => {
  const calls = [];
  currentClient = {
    storage: {
      from: (bucket) => {
        calls.push(bucket);
        return {
          getPublicUrl: (path) => ({ data: { publicUrl: `https://example.test/storage/v1/object/public/${bucket}/${path}` } }),
        };
      },
    },
  };
  const url = getMaterialImageUrl(`materials/${MATERIAL_ID}/photo.jpg`);
  assert.deepEqual(calls, ["materials-media"]);
  assert.equal(url, `https://example.test/storage/v1/object/public/materials-media/materials/${MATERIAL_ID}/photo.jpg`);
});

// ==========================================================================
// uploadMaterialImage
// ==========================================================================

function storageAndRpcClient({ userId = AUTH_USER_ID, uploadError = null, rpcData = null, rpcError = null, removeCalls = [] } = {}) {
  const uploadCalls = [];
  const rpcCalls = [];
  return {
    uploadCalls,
    rpcCalls,
    client: {
      auth: authUser(userId),
      storage: {
        from: (bucket) => ({
          upload: async (path, file, options) => {
            uploadCalls.push({ bucket, path, file, options });
            return uploadError ? { data: null, error: uploadError } : { data: { path }, error: null };
          },
          remove: async (paths) => {
            removeCalls.push({ bucket, paths });
            return { data: paths, error: null };
          },
        }),
      },
      rpc: async (name, params) => {
        rpcCalls.push({ name, params });
        return rpcError ? { data: null, error: rpcError } : { data: rpcData, error: null };
      },
    },
  };
}

test("uploadMaterialImage: fails before any upload when not authenticated", async () => {
  const { client, uploadCalls } = storageAndRpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, jpegFile()), /Sign in/);
  assert.equal(uploadCalls.length, 0);
});

test("uploadMaterialImage: rejects a malformed material id before any upload", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), storage: { from: () => { throw new Error("storage must not be touched"); } } };
  await assert.rejects(() => uploadMaterialImage("not-a-uuid", jpegFile()), /valid ID/);
});

test("uploadMaterialImage: rejects a disallowed file type before any upload", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), storage: { from: () => { throw new Error("storage must not be touched"); } } };
  const pdf = new File([new Uint8Array(10)], "spec.pdf", { type: "application/pdf" });
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, pdf), /JPEG, PNG, or WebP/);
});

test("uploadMaterialImage: rejects a file over the max size before any upload", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), storage: { from: () => { throw new Error("storage must not be touched"); } } };
  const big = jpegFile(MATERIAL_IMAGE_MAX_BYTES + 1);
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, big), /8MB or smaller/);
});

test("uploadMaterialImage: uploads to a materials/<id>/<uuid>.<ext> path with the correct content type", async () => {
  const { client, uploadCalls } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: "will-be-overwritten", updated_at: "2026-01-01T00:00:00.000Z" }] });
  currentClient = client;
  await uploadMaterialImage(MATERIAL_ID, jpegFile());
  assert.equal(uploadCalls.length, 1);
  const { bucket, path, options } = uploadCalls[0];
  assert.equal(bucket, "materials-media");
  assert.match(path, new RegExp(`^materials/${MATERIAL_ID}/[0-9a-f-]{36}\\.jpg$`));
  assert.equal(options.contentType, "image/jpeg");
  assert.equal(options.upsert, false);
});

test("uploadMaterialImage: a storage upload failure normalizes to a safe message, preserving cause, and never calls the RPC", async () => {
  const uploadError = { message: "The resource already exists", statusCode: "409" };
  const { client, rpcCalls } = storageAndRpcClient({ uploadError });
  currentClient = client;
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, jpegFile()), (err) => {
    assert.ok(err instanceof MaterialsOperationError);
    assert.equal(err.operation, "upload_image");
    assert.equal(err.message, "This image could not be uploaded. Please try again.");
    assert.equal(err.cause, uploadError);
    return true;
  });
  assert.equal(rpcCalls.length, 0);
});

test("uploadMaterialImage: calls set_material_image with exactly p_id and the uploaded path after a successful upload", async () => {
  const { client, rpcCalls, uploadCalls } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: "x", updated_at: "2026-01-01T00:00:00.000Z" }] });
  currentClient = client;
  await uploadMaterialImage(MATERIAL_ID, jpegFile());
  assert.equal(rpcCalls[0].name, "set_material_image");
  assert.deepEqual(Object.keys(rpcCalls[0].params).sort(), ["p_id", "p_image_path"]);
  assert.equal(rpcCalls[0].params.p_id, MATERIAL_ID);
  assert.equal(rpcCalls[0].params.p_image_path, uploadCalls[0].path);
});

test("uploadMaterialImage: an RPC failure after a successful upload normalizes to a safe message, preserving cause", async () => {
  const rpcError = { message: "set_material_image: the uploaded file could not be found" };
  const { client } = storageAndRpcClient({ rpcError });
  currentClient = client;
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, jpegFile()), (err) => {
    assert.ok(err instanceof MaterialsOperationError);
    assert.equal(err.operation, "set_image");
    assert.equal(err.message, "This image could not be saved. Please try again.");
    assert.equal(err.cause, rpcError);
    return true;
  });
});

test("uploadMaterialImage: returns the parsed { id, image_path } result on success", async () => {
  const { client } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: `materials/${MATERIAL_ID}/real.jpg`, updated_at: "2026-01-01T00:00:00.000Z" }] });
  currentClient = client;
  const result = await uploadMaterialImage(MATERIAL_ID, jpegFile());
  assert.deepEqual(result, { id: MATERIAL_ID, image_path: `materials/${MATERIAL_ID}/real.jpg` });
});

test("uploadMaterialImage: a malformed RPC response is rejected rather than trusted", async () => {
  const { client } = storageAndRpcClient({ rpcData: [] });
  currentClient = client;
  await assert.rejects(() => uploadMaterialImage(MATERIAL_ID, jpegFile()), /This image could not be saved/);
});

test("uploadMaterialImage: when replacing an existing image, removes the previous object only after the database row is confirmed updated", async () => {
  const removeCalls = [];
  const { client } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: "new.jpg", updated_at: "2026-01-01T00:00:00.000Z" }], removeCalls });
  currentClient = client;
  await uploadMaterialImage(MATERIAL_ID, jpegFile(), `materials/${MATERIAL_ID}/old.jpg`);
  assert.equal(removeCalls.length, 1);
  assert.equal(removeCalls[0].bucket, "materials-media");
  assert.deepEqual(removeCalls[0].paths, [`materials/${MATERIAL_ID}/old.jpg`]);
});

test("uploadMaterialImage: with no previous image, never calls remove at all", async () => {
  const removeCalls = [];
  const { client } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: "new.jpg", updated_at: "2026-01-01T00:00:00.000Z" }], removeCalls });
  currentClient = client;
  await uploadMaterialImage(MATERIAL_ID, jpegFile());
  assert.equal(removeCalls.length, 0);
});

test("uploadMaterialImage: a failed cleanup of the previous image never fails the overall operation — the database row is already correct", async () => {
  const { client, rpcCalls } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: "new.jpg", updated_at: "2026-01-01T00:00:00.000Z" }] });
  client.storage.from = () => ({
    upload: async (path) => ({ data: { path }, error: null }),
    remove: async () => {
      throw new Error("network blip");
    },
  });
  currentClient = client;
  const result = await uploadMaterialImage(MATERIAL_ID, jpegFile(), `materials/${MATERIAL_ID}/old.jpg`);
  assert.deepEqual(result, { id: MATERIAL_ID, image_path: "new.jpg" });
});

// ==========================================================================
// removeMaterialImage
// ==========================================================================

test("removeMaterialImage: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = storageAndRpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/x.jpg`), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("removeMaterialImage: rejects a malformed material id before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called"); } };
  await assert.rejects(() => removeMaterialImage("not-a-uuid", "materials/x/y.jpg"), /valid ID/);
});

test("removeMaterialImage: calls clear_material_image with exactly p_id", async () => {
  const { client, rpcCalls } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: null, updated_at: "2026-01-01T00:00:00.000Z" }] });
  currentClient = client;
  await removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/old.jpg`);
  assert.deepEqual(rpcCalls[0].params, { p_id: MATERIAL_ID });
});

test("removeMaterialImage: an RPC failure normalizes to a safe message, preserving cause, and never removes the storage object", async () => {
  const rpcError = { message: "clear_material_image: catalogue editor access required" };
  const removeCalls = [];
  const { client } = storageAndRpcClient({ rpcError, removeCalls });
  currentClient = client;
  await assert.rejects(() => removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/old.jpg`), (err) => {
    assert.ok(err instanceof MaterialsOperationError);
    assert.equal(err.operation, "clear_image");
    assert.equal(err.message, "This image could not be removed. Please try again.");
    assert.equal(err.cause, rpcError);
    return true;
  });
  assert.equal(removeCalls.length, 0);
});

test("removeMaterialImage: removes the storage object only after the database row is confirmed cleared", async () => {
  const removeCalls = [];
  const { client } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: null, updated_at: "2026-01-01T00:00:00.000Z" }], removeCalls });
  currentClient = client;
  await removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/old.jpg`);
  assert.equal(removeCalls.length, 1);
  assert.deepEqual(removeCalls[0].paths, [`materials/${MATERIAL_ID}/old.jpg`]);
});

test("removeMaterialImage: returns the parsed { id, image_path: null } result on success", async () => {
  const { client } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: null, updated_at: "2026-01-01T00:00:00.000Z" }] });
  currentClient = client;
  const result = await removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/old.jpg`);
  assert.deepEqual(result, { id: MATERIAL_ID, image_path: null });
});

test("removeMaterialImage: a failed cleanup never fails the overall operation — the database row is already correct", async () => {
  const { client } = storageAndRpcClient({ rpcData: [{ id: MATERIAL_ID, image_path: null, updated_at: "2026-01-01T00:00:00.000Z" }] });
  client.storage.from = () => ({
    remove: async () => {
      throw new Error("network blip");
    },
  });
  currentClient = client;
  const result = await removeMaterialImage(MATERIAL_ID, `materials/${MATERIAL_ID}/old.jpg`);
  assert.deepEqual(result, { id: MATERIAL_ID, image_path: null });
});
