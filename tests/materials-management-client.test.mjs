import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 5 Slice B: unit coverage for materialsClient.ts's staff-authoring
// additions, against a fake Supabase client, following this repo's existing
// node:test --experimental-test-module-mocks convention (see
// moderation-client.test.mjs, which this file mirrors closely for its own
// auth/UUID/error-shape assertions). Slice A's two guest-read functions
// (fetchPublishedMaterials/fetchMaterialBySlug) are already covered in
// materials-client.test.mjs and are untouched by this file.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
  },
});

const {
  checkCatalogueEditorAccess,
  fetchMaterialsForEditor,
  createDraftMaterial,
  updateDraftMaterial,
  publishMaterial,
  archiveMaterial,
  MaterialsOperationError,
} = await import(new URL("../src/social/services/materialsClient.ts", import.meta.url).href);

function assertSafeMaterialsError(err, { operation, message, cause, rawFragments = [] }) {
  assert.ok(err instanceof MaterialsOperationError, "must be a MaterialsOperationError, not a bare Error");
  assert.equal(err.name, "MaterialsOperationError");
  assert.equal(err.operation, operation);
  assert.equal(err.message, message, "the thrown error's own message must be exactly the safe, stable text — never derived from the backend error");
  if (cause !== undefined) assert.equal(err.cause, cause, "the original backend error must survive as `cause` for logging");
  for (const fragment of rawFragments) {
    assert.ok(!err.message.includes(fragment), `safe message must not contain raw backend fragment ${JSON.stringify(fragment)}`);
  }
  return true;
}

const AUTH_USER_ID = "a0000000-0000-0000-0000-000000000001";
const MATERIAL_ID = "d0000000-0000-0000-0000-000000000001";

function authUser(userId) {
  return { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) };
}
function authUserError(err) {
  return { getUser: async () => ({ data: { user: null }, error: err }) };
}
const AUTH_VERIFICATION_ERROR = { message: "fetch failed" };

function rpcClient({ userId = AUTH_USER_ID, data = null, error = null } = {}) {
  const rpcCalls = [];
  return {
    rpcCalls,
    client: {
      auth: authUser(userId),
      rpc: async (name, params) => {
        rpcCalls.push({ name, params });
        return error ? { data: null, error } : { data, error: null };
      },
    },
  };
}

const VALID_ROW = {
  id: MATERIAL_ID,
  slug: "calacatta-quartz",
  name: "Calacatta Quartz",
  category: "quartz",
  summary: "A fixture summary.",
  description: "A fixture description.",
  applications: ["Kitchen Worktops"],
  image_path: null,
  status: "draft",
};

const VALID_INPUT = {
  slug: "calacatta-quartz",
  name: "Calacatta Quartz",
  category: "quartz",
  summary: "A fixture summary.",
  description: "A fixture description.",
  applications: ["Kitchen Worktops"],
};

// ==========================================================================
// checkCatalogueEditorAccess
// ==========================================================================

test("checkCatalogueEditorAccess: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => checkCatalogueEditorAccess(), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("checkCatalogueEditorAccess: a genuine auth.getUser() failure throws SocialUnavailableError, not the sign-in message", async () => {
  currentClient = { auth: authUserError(AUTH_VERIFICATION_ERROR), rpc: () => { throw new Error("rpc must not be called"); } };
  await assert.rejects(() => checkCatalogueEditorAccess(), (err) => {
    assert.equal(err.name, "SocialUnavailableError");
    assert.doesNotMatch(err.message, /Sign in/);
    assert.equal(err.cause, AUTH_VERIFICATION_ERROR);
    return true;
  });
});

test("checkCatalogueEditorAccess: calls check_catalogue_editor_access with no parameters", async () => {
  const { client, rpcCalls } = rpcClient({ data: true });
  currentClient = client;
  const result = await checkCatalogueEditorAccess();
  assert.equal(result, true);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "check_catalogue_editor_access");
  assert.deepEqual(rpcCalls[0].params, undefined);
});

test("checkCatalogueEditorAccess: a confirmed false is returned as-is, never treated as an error", async () => {
  const { client } = rpcClient({ data: false });
  currentClient = client;
  assert.equal(await checkCatalogueEditorAccess(), false);
});

test("checkCatalogueEditorAccess: a non-boolean response is a contract failure, never trusted", async () => {
  const { client } = rpcClient({ data: "true" });
  currentClient = client;
  await assert.rejects(() => checkCatalogueEditorAccess(), (err) => assertSafeMaterialsError(err, {
    operation: "check_access",
    message: "We couldn't verify your access. Please try again.",
  }));
});

test("checkCatalogueEditorAccess: an RPC failure normalizes to the safe message, preserving cause", async () => {
  const rpcError = { message: "permission denied for function check_catalogue_editor_access", code: "42501" };
  const { client } = rpcClient({ error: rpcError });
  currentClient = client;
  await assert.rejects(() => checkCatalogueEditorAccess(), (err) => assertSafeMaterialsError(err, {
    operation: "check_access",
    message: "We couldn't verify your access. Please try again.",
    cause: rpcError,
    rawFragments: ["permission denied", "42501"],
  }));
});

// ==========================================================================
// fetchMaterialsForEditor
// ==========================================================================

function listClient({ userId = AUTH_USER_ID, rows = [], error = null } = {}) {
  const calls = { order: [], limit: [] };
  const builder = {
    select: () => builder,
    order: (field, options) => { calls.order.push([field, options]); return builder; },
    limit: (count) => { calls.limit.push(count); return builder; },
    then: (resolve, reject) => Promise.resolve(error ? { data: null, error } : { data: rows, error: null }).then(resolve, reject),
  };
  return {
    calls,
    client: {
      auth: authUser(userId),
      from: (table) => { assert.equal(table, "materials"); return builder; },
    },
  };
}

test("fetchMaterialsForEditor: fails before any query when not authenticated", async () => {
  currentClient = { auth: authUser(null), from: () => { throw new Error("from() must not be called"); } };
  await assert.rejects(() => fetchMaterialsForEditor(), /Sign in/);
});

test("fetchMaterialsForEditor: returns every status, not only published", async () => {
  const rows = [VALID_ROW, { ...VALID_ROW, id: "d0000000-0000-0000-0000-000000000002", slug: "granite-x", status: "published" }, { ...VALID_ROW, id: "d0000000-0000-0000-0000-000000000003", slug: "marble-x", status: "archived" }];
  const { client } = listClient({ rows });
  currentClient = client;
  const result = await fetchMaterialsForEditor();
  assert.deepEqual(result.map((m) => m.status), ["draft", "published", "archived"]);
});

test("fetchMaterialsForEditor: a genuinely empty catalogue is an empty array, not an error", async () => {
  const { client } = listClient({ rows: [] });
  currentClient = client;
  assert.deepEqual(await fetchMaterialsForEditor(), []);
});

test("fetchMaterialsForEditor: a query failure throws a safe message, never the raw backend error", async () => {
  const { client } = listClient({ error: { message: "relation permission denied" } });
  currentClient = client;
  await assert.rejects(() => fetchMaterialsForEditor(), (err) => assertSafeMaterialsError(err, {
    operation: "fetch_for_editor",
    message: "The catalogue could not be loaded. Please try again.",
    rawFragments: ["permission denied"],
  }));
});

test("fetchMaterialsForEditor: rejects a row with an invalid status", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, status: "deleted" }] });
  currentClient = client;
  await assert.rejects(() => fetchMaterialsForEditor(), /The catalogue could not be loaded/);
});

// ==========================================================================
// createDraftMaterial
// ==========================================================================

test("createDraftMaterial: fails before any RPC call when not authenticated", async () => {
  const { client, rpcCalls } = rpcClient({ userId: null });
  currentClient = client;
  await assert.rejects(() => createDraftMaterial(VALID_INPUT), /Sign in/);
  assert.equal(rpcCalls.length, 0);
});

test("createDraftMaterial: rejects an invalid slug before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called for invalid input"); } };
  await assert.rejects(() => createDraftMaterial({ ...VALID_INPUT, slug: "Bad Slug" }), /lowercase letters, numbers/);
});

test("createDraftMaterial: rejects an empty name before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called for invalid input"); } };
  await assert.rejects(() => createDraftMaterial({ ...VALID_INPUT, name: "   " }), /Name must be between/);
});

test("createDraftMaterial: rejects a category outside the five locked values before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called for invalid input"); } };
  await assert.rejects(() => createDraftMaterial({ ...VALID_INPUT, category: "sandstone" }), /valid material category/);
});

test("createDraftMaterial: rejects more than 12 applications before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called for invalid input"); } };
  await assert.rejects(
    () => createDraftMaterial({ ...VALID_INPUT, applications: Array.from({ length: 13 }, (_, i) => `App ${i}`) }),
    /12 items or fewer/
  );
});

test("createDraftMaterial: rejects a blank application entry before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called for invalid input"); } };
  await assert.rejects(() => createDraftMaterial({ ...VALID_INPUT, applications: ["  "] }), /cannot be blank/);
});

test("createDraftMaterial: calls create_draft_material with exactly the merged parameter names and trimmed values", async () => {
  const { client, rpcCalls } = rpcClient({ data: [VALID_ROW] });
  currentClient = client;
  await createDraftMaterial({ ...VALID_INPUT, slug: "  calacatta-quartz  ", name: "  Calacatta Quartz  " });
  assert.equal(rpcCalls[0].name, "create_draft_material");
  assert.deepEqual(rpcCalls[0].params, {
    p_slug: "calacatta-quartz",
    p_name: "Calacatta Quartz",
    p_category: "quartz",
    p_summary: "A fixture summary.",
    p_description: "A fixture description.",
    p_applications: ["Kitchen Worktops"],
  });
});

test("createDraftMaterial: omitted summary/description are sent as null, never an empty string", async () => {
  const { client, rpcCalls } = rpcClient({ data: [VALID_ROW] });
  currentClient = client;
  await createDraftMaterial({ slug: "no-summary", name: "No Summary", category: "granite" });
  assert.equal(rpcCalls[0].params.p_summary, null);
  assert.equal(rpcCalls[0].params.p_description, null);
  assert.deepEqual(rpcCalls[0].params.p_applications, []);
});

test("createDraftMaterial: a returned row is validated and mapped, including status", async () => {
  const { client } = rpcClient({ data: [VALID_ROW] });
  currentClient = client;
  const result = await createDraftMaterial(VALID_INPUT);
  assert.deepEqual(result, {
    id: VALID_ROW.id,
    slug: VALID_ROW.slug,
    name: VALID_ROW.name,
    category: VALID_ROW.category,
    summary: VALID_ROW.summary,
    description: VALID_ROW.description,
    applications: VALID_ROW.applications,
    image_path: null,
    status: "draft",
  });
});

test("createDraftMaterial: an RPC failure (e.g. duplicate slug) normalizes to the safe message, preserving cause", async () => {
  const rpcError = { message: "create_draft_material: slug is already in use" };
  const { client } = rpcClient({ error: rpcError });
  currentClient = client;
  await assert.rejects(() => createDraftMaterial(VALID_INPUT), (err) => assertSafeMaterialsError(err, {
    operation: "create_draft",
    message: "This material could not be created. Please try again.",
    cause: rpcError,
  }));
});

test("createDraftMaterial: a malformed response (not a single-row array) is rejected rather than trusted", async () => {
  const { client } = rpcClient({ data: [] });
  currentClient = client;
  await assert.rejects(() => createDraftMaterial(VALID_INPUT), /This material could not be created/);
});

test("createDraftMaterial: never sends a status/id/created_at/updated_at field, even if one were somehow supplied", async () => {
  const { client, rpcCalls } = rpcClient({ data: [VALID_ROW] });
  currentClient = client;
  await createDraftMaterial({ ...VALID_INPUT, status: "published", id: "attacker-supplied", created_at: "2000-01-01" });
  assert.deepEqual(Object.keys(rpcCalls[0].params).sort(), ["p_applications", "p_category", "p_description", "p_name", "p_slug", "p_summary"]);
});

// ==========================================================================
// updateDraftMaterial
// ==========================================================================

test("updateDraftMaterial: rejects a malformed id before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called"); } };
  await assert.rejects(() => updateDraftMaterial("not-a-uuid", VALID_INPUT), /valid ID/);
});

test("updateDraftMaterial: calls update_draft_material with p_id plus the exact merged field parameters", async () => {
  const { client, rpcCalls } = rpcClient({ data: [VALID_ROW] });
  currentClient = client;
  await updateDraftMaterial(MATERIAL_ID, VALID_INPUT);
  assert.equal(rpcCalls[0].name, "update_draft_material");
  assert.deepEqual(rpcCalls[0].params, {
    p_id: MATERIAL_ID,
    p_slug: "calacatta-quartz",
    p_name: "Calacatta Quartz",
    p_category: "quartz",
    p_summary: "A fixture summary.",
    p_description: "A fixture description.",
    p_applications: ["Kitchen Worktops"],
  });
});

test("updateDraftMaterial: an RPC failure (e.g. no longer a draft) normalizes to the safe message", async () => {
  const rpcError = { message: "update_draft_material: only a draft material can be edited" };
  const { client } = rpcClient({ error: rpcError });
  currentClient = client;
  await assert.rejects(() => updateDraftMaterial(MATERIAL_ID, VALID_INPUT), (err) => assertSafeMaterialsError(err, {
    operation: "update_draft",
    message: "This material could not be saved. Please try again.",
    cause: rpcError,
    rawFragments: ["update_draft_material:"],
  }));
});

// ==========================================================================
// publishMaterial
// ==========================================================================

test("publishMaterial: rejects a malformed id before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called"); } };
  await assert.rejects(() => publishMaterial("not-a-uuid"), /valid ID/);
});

test("publishMaterial: calls publish_material with exactly p_id", async () => {
  const { client, rpcCalls } = rpcClient({ data: [{ ...VALID_ROW, status: "published" }] });
  currentClient = client;
  const result = await publishMaterial(MATERIAL_ID);
  assert.deepEqual(rpcCalls[0].params, { p_id: MATERIAL_ID });
  assert.equal(result.status, "published");
});

test("publishMaterial: an RPC failure (e.g. missing summary) normalizes to the safe message", async () => {
  const rpcError = { message: "publish_material: a summary is required before publishing" };
  const { client } = rpcClient({ error: rpcError });
  currentClient = client;
  await assert.rejects(() => publishMaterial(MATERIAL_ID), (err) => assertSafeMaterialsError(err, {
    operation: "publish",
    message: "This material could not be published. Please try again.",
    cause: rpcError,
  }));
});

// ==========================================================================
// archiveMaterial
// ==========================================================================

test("archiveMaterial: rejects a malformed id before any RPC call", async () => {
  currentClient = { auth: authUser(AUTH_USER_ID), rpc: () => { throw new Error("rpc must not be called"); } };
  await assert.rejects(() => archiveMaterial("not-a-uuid"), /valid ID/);
});

test("archiveMaterial: calls archive_material with exactly p_id", async () => {
  const { client, rpcCalls } = rpcClient({ data: [{ ...VALID_ROW, status: "archived" }] });
  currentClient = client;
  const result = await archiveMaterial(MATERIAL_ID);
  assert.deepEqual(rpcCalls[0].params, { p_id: MATERIAL_ID });
  assert.equal(result.status, "archived");
});

test("archiveMaterial: an RPC failure (e.g. already archived) normalizes to the safe message", async () => {
  const rpcError = { message: "archive_material: material is already archived" };
  const { client } = rpcClient({ error: rpcError });
  currentClient = client;
  await assert.rejects(() => archiveMaterial(MATERIAL_ID), (err) => assertSafeMaterialsError(err, {
    operation: "archive",
    message: "This material could not be archived. Please try again.",
    cause: rpcError,
  }));
});
