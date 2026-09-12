import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Phase 5 Slice A: unit coverage for src/social/services/materialsClient.ts
// against a fake Supabase client, following this repo's existing
// node:test --experimental-test-module-mocks convention (see
// messaging-client.test.mjs). materialsClient.ts is a guest-safe public
// read module (no auth), so the fake client here never needs an `auth`
// property.

const supabaseClientUrl = new URL("../src/services/supabaseClient.ts", import.meta.url).href;

let currentClient = null;

mock.module(supabaseClientUrl, {
  exports: {
    isSupabaseConfigured: true,
    getSupabaseClient: () => currentClient,
  },
});

const { fetchPublishedMaterials, fetchMaterialBySlug, MATERIAL_CATEGORIES } = await import(
  new URL("../src/social/services/materialsClient.ts", import.meta.url).href
);

const VALID_ROW = {
  id: "d0000000-0000-0000-0000-000000000001",
  slug: "calacatta-quartz",
  name: "Calacatta Quartz",
  category: "quartz",
  summary: "A fixture summary.",
  description: "A longer fixture description.",
  applications: ["Kitchen Worktops"],
  status: "published",
};

// ==========================================================================
// fetchPublishedMaterials
// ==========================================================================

function listClient({ rows = [], error = null } = {}) {
  const calls = { eq: [], order: [], limit: [] };
  const builder = {
    select: () => builder,
    eq: (field, value) => {
      calls.eq.push([field, value]);
      return builder;
    },
    order: (field, options) => {
      calls.order.push([field, options]);
      return builder;
    },
    limit: (count) => {
      calls.limit.push(count);
      return builder;
    },
    // supabase-js query builders are themselves thenable — `await query`
    // resolves this directly, with no separate terminal method call.
    then: (resolve, reject) => Promise.resolve(error ? { data: null, error } : { data: rows, error: null }).then(resolve, reject),
  };
  return {
    calls,
    client: {
      from: (table) => {
        assert.equal(table, "materials");
        return builder;
      },
    },
  };
}

test("fetchPublishedMaterials: MATERIAL_CATEGORIES is locked to exactly the five approved values, in order", () => {
  assert.deepEqual(MATERIAL_CATEGORIES, ["quartz", "granite", "marble", "porcelain", "dekton"]);
});

test("fetchPublishedMaterials: queries only status = published, ordered by name, with no category filter when none is given", async () => {
  const { client, calls } = listClient({ rows: [VALID_ROW] });
  currentClient = client;
  const result = await fetchPublishedMaterials();
  assert.deepEqual(calls.eq, [["status", "published"]]);
  assert.deepEqual(calls.order, [["name", { ascending: true }]]);
  assert.equal(calls.limit.length, 1);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    id: VALID_ROW.id,
    slug: VALID_ROW.slug,
    name: VALID_ROW.name,
    category: VALID_ROW.category,
    summary: VALID_ROW.summary,
    description: VALID_ROW.description,
    applications: VALID_ROW.applications,
  });
});

test("fetchPublishedMaterials: adds an exact category equality filter when a category is given", async () => {
  const { client, calls } = listClient({ rows: [] });
  currentClient = client;
  await fetchPublishedMaterials("granite");
  assert.deepEqual(calls.eq, [
    ["status", "published"],
    ["category", "granite"],
  ]);
});

test("fetchPublishedMaterials: a genuinely empty result is an empty array, not an error", async () => {
  const { client } = listClient({ rows: [] });
  currentClient = client;
  const result = await fetchPublishedMaterials();
  assert.deepEqual(result, []);
});

test("fetchPublishedMaterials: a real query failure throws one safe message, never the raw backend error", async () => {
  const { client } = listClient({ error: { message: "relation \"materials\" permission denied", code: "42501" } });
  currentClient = client;
  await assert.rejects(() => fetchPublishedMaterials(), (err) => {
    assert.equal(err.message, "Materials could not be loaded. Please try again.");
    assert.ok(!err.message.includes("permission denied"));
    return true;
  });
});

test("fetchPublishedMaterials: rejects a row with a category outside the five locked values", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, category: "sandstone" }] });
  currentClient = client;
  await assert.rejects(() => fetchPublishedMaterials(), /Materials could not be loaded/);
});

test("fetchPublishedMaterials: rejects a row with a non-array applications field", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, applications: "Kitchen Worktops" }] });
  currentClient = client;
  await assert.rejects(() => fetchPublishedMaterials(), /Materials could not be loaded/);
});

test("fetchPublishedMaterials: rejects a row whose applications array contains a non-string element", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, applications: ["Kitchen Worktops", 42] }] });
  currentClient = client;
  await assert.rejects(() => fetchPublishedMaterials(), /Materials could not be loaded/);
});

test("fetchPublishedMaterials: rejects a row missing a required name", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, name: "" }] });
  currentClient = client;
  await assert.rejects(() => fetchPublishedMaterials(), /Materials could not be loaded/);
});

test("fetchPublishedMaterials: rejects a row whose status is not published, even though the query already filters for it — defense in depth", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, status: "draft" }] });
  currentClient = client;
  await assert.rejects(() => fetchPublishedMaterials(), /Materials could not be loaded/);
});

test("fetchPublishedMaterials: accepts null summary and null description", async () => {
  const { client } = listClient({ rows: [{ ...VALID_ROW, summary: null, description: null }] });
  currentClient = client;
  const result = await fetchPublishedMaterials();
  assert.equal(result[0].summary, null);
  assert.equal(result[0].description, null);
});

// ==========================================================================
// fetchMaterialBySlug
// ==========================================================================

function detailClient({ row = null, error = null } = {}) {
  const calls = { eq: [] };
  const builder = {
    select: () => builder,
    eq: (field, value) => {
      calls.eq.push([field, value]);
      return builder;
    },
    maybeSingle: async () => (error ? { data: null, error } : { data: row, error: null }),
  };
  return {
    calls,
    client: {
      from: (table) => {
        assert.equal(table, "materials");
        return builder;
      },
    },
  };
}

test("fetchMaterialBySlug: queries by exact slug and status = published", async () => {
  const { client, calls } = detailClient({ row: VALID_ROW });
  currentClient = client;
  await fetchMaterialBySlug("calacatta-quartz");
  assert.deepEqual(calls.eq, [
    ["slug", "calacatta-quartz"],
    ["status", "published"],
  ]);
});

test("fetchMaterialBySlug: returns the mapped material for a real published row", async () => {
  const { client } = detailClient({ row: VALID_ROW });
  currentClient = client;
  const result = await fetchMaterialBySlug("calacatta-quartz");
  assert.deepEqual(result, {
    id: VALID_ROW.id,
    slug: VALID_ROW.slug,
    name: VALID_ROW.name,
    category: VALID_ROW.category,
    summary: VALID_ROW.summary,
    description: VALID_ROW.description,
    applications: VALID_ROW.applications,
  });
});

test("fetchMaterialBySlug: returns null for a nonexistent slug (no row found)", async () => {
  const { client } = detailClient({ row: null });
  currentClient = client;
  const result = await fetchMaterialBySlug("does-not-exist");
  assert.equal(result, null);
});

test("fetchMaterialBySlug: a real query failure throws one safe message, never the raw backend error", async () => {
  const { client } = detailClient({ error: { message: "connection reset", code: "08006" } });
  currentClient = client;
  await assert.rejects(() => fetchMaterialBySlug("calacatta-quartz"), (err) => {
    assert.equal(err.message, "This material could not be loaded. Please try again.");
    assert.ok(!err.message.includes("connection reset"));
    return true;
  });
});

test("fetchMaterialBySlug: rejects a malformed row rather than returning it as-is", async () => {
  const { client } = detailClient({ row: { ...VALID_ROW, category: "sandstone" } });
  currentClient = client;
  await assert.rejects(() => fetchMaterialBySlug("calacatta-quartz"), /This material could not be loaded/);
});
