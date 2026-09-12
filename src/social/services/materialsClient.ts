import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";

/**
 * Mirrors public.material_category exactly (Phase 5 Slice A migration
 * 20260912000618_materials_catalogue_foundation.sql) — locked to exactly
 * these five values. No "other" or speculative category exists in the
 * schema, so none is accepted here either.
 */
export const MATERIAL_CATEGORIES = ["quartz", "granite", "marble", "porcelain", "dekton"] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

function isMaterialCategory(value: unknown): value is MaterialCategory {
  return typeof value === "string" && (MATERIAL_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Deliberately narrow: no price, stock, discount, origin, certification,
 * standards, warranty, provenance, or image/storage field exists on the
 * underlying table, so none is exposed here either.
 */
export interface Material {
  id: string;
  slug: string;
  name: string;
  category: MaterialCategory;
  summary: string | null;
  description: string | null;
  applications: string[];
}

const SAFE_LIST_ERROR = "Materials could not be loaded. Please try again.";
const SAFE_DETAIL_ERROR = "This material could not be loaded. Please try again.";

// No pagination exists this slice — a single bounded fetch is sufficient for
// a foundation-stage catalogue with no seed data. Not a page size a caller
// can influence.
const MATERIALS_LIST_LIMIT = 100;

const MATERIALS_SELECT = "id, slug, name, category, summary, description, applications, status";

/**
 * Validates every field by shape before trusting it, the same "never trust
 * the server blindly" discipline this codebase already applies to other new
 * data sources (see moderationClient.ts's parseQueueItem). `status` is
 * checked even though materials_public_read RLS already guarantees only
 * 'published' rows are ever returned to anon/authenticated — defense in
 * depth, not a substitute for that policy.
 */
function parseMaterial(raw: unknown, safeMessage: string): Material {
  if (!raw || typeof raw !== "object") throw new Error(safeMessage);
  const record = raw as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.length === 0) throw new Error(safeMessage);
  if (typeof record.slug !== "string" || record.slug.length === 0) throw new Error(safeMessage);
  if (typeof record.name !== "string" || record.name.length === 0) throw new Error(safeMessage);
  if (!isMaterialCategory(record.category)) throw new Error(safeMessage);
  if (record.summary !== null && typeof record.summary !== "string") throw new Error(safeMessage);
  if (record.description !== null && typeof record.description !== "string") throw new Error(safeMessage);
  if (!Array.isArray(record.applications) || !record.applications.every((item) => typeof item === "string")) {
    throw new Error(safeMessage);
  }
  if (record.status !== "published") throw new Error(safeMessage);

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    category: record.category,
    summary: record.summary as string | null,
    description: record.description as string | null,
    applications: record.applications as string[],
  };
}

/**
 * Guest-safe: reads only what materials_public_read exposes (status =
 * 'published'). The status = 'published' filter below is redundant with
 * that RLS by design (defense in depth / self-documenting intent, the same
 * pattern search_public_professionals's own client call already
 * establishes), not a substitute for it. No search and no pagination exist
 * this slice — a single bounded, alphabetically ordered fetch.
 */
export async function fetchPublishedMaterials(category?: MaterialCategory): Promise<Material[]> {
  if (!isSupabaseConfigured) return [];
  let query = getSupabaseClient()
    .from("materials")
    .select(MATERIALS_SELECT)
    .eq("status", "published")
    .order("name", { ascending: true })
    .limit(MATERIALS_LIST_LIMIT);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw new Error(SAFE_LIST_ERROR);
  return (data ?? []).map((row) => parseMaterial(row, SAFE_LIST_ERROR));
}

/**
 * Returns null both when no material with this slug exists and when one
 * exists but is draft/archived — materials_public_read RLS already
 * collapses those cases for us (a non-published row is genuinely absent
 * from the result set), and this deliberately doesn't try to tell them
 * apart, so an unpublished material's existence is never leaked. The same
 * "never confirm or deny" discipline other domains in this codebase already
 * apply to a private/inaccessible row.
 */
export async function fetchMaterialBySlug(slug: string): Promise<Material | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseClient()
    .from("materials")
    .select(MATERIALS_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(SAFE_DETAIL_ERROR);
  if (!data) return null;
  return parseMaterial(data, SAFE_DETAIL_ERROR);
}

// ==========================================================================
// Phase 5 Slice B: staff catalogue publishing.
//
// Everything below is auth-gated (mirrors moderationClient.ts's
// requireAuthenticatedClient convention, not fetchPublishedMaterials/
// fetchMaterialBySlug's guest-safe convention above) — these operations
// require a signed-in, active catalogue_editor, re-verified server-side on
// every call by 20260912020809_materials_catalogue_publishing.sql's RPCs.
// This file never queries or writes public.materials directly for any of
// these operations (no client insert/update/delete grant exists) — every
// mutation flows through a SECURITY DEFINER RPC, and the one additional
// read (fetchMaterialsForEditor) flows through the materials_editor_read
// RLS policy via a plain select, exactly like fetchPublishedMaterials does
// for the public policy above.
// ==========================================================================

/** Mirrors public.material_status exactly. */
export type MaterialStatus = "draft" | "published" | "archived";

function isMaterialStatus(value: unknown): value is MaterialStatus {
  return value === "draft" || value === "published" || value === "archived";
}

/** A material as seen by a catalogue editor — the same fields a guest sees, plus status. */
export interface EditorMaterial extends Material {
  status: MaterialStatus;
}

export type MaterialsOperation =
  | "check_access"
  | "fetch_for_editor"
  | "create_draft"
  | "update_draft"
  | "publish"
  | "archive";

/**
 * Every catalogue-write failure — access denied, a revoked role, a failed
 * transition, a validation error, or a genuine network/database problem —
 * collapses to one fixed safe message per operation, the original error
 * preserved as `cause` for logging. Mirrors ModerationOperationError
 * exactly (moderationClient.ts).
 */
export class MaterialsOperationError extends Error {
  readonly operation: MaterialsOperation;

  constructor(operation: MaterialsOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MaterialsOperationError";
    this.operation = operation;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rejects a malformed ID before it ever reaches an RPC call — same guard shape as moderationClient.ts's requireUuid. */
function requireUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a valid ID.`);
  }
  return value;
}

/**
 * This repository's existing trusted authentication pattern, duplicated
 * here rather than imported — each service file owns its own copy
 * (messagingClient.ts/reportingClient.ts/moderationClient.ts already do the
 * same). An unconfigured client throws SocialUnavailableError, a genuine
 * auth.getUser() failure also throws SocialUnavailableError with a generic
 * session-verification message (never the action-specific "Sign in..."
 * text), and only a *successful* getUser() call with no user throws
 * `signInMessage`. All three happen before any RPC call.
 */
async function requireAuthenticatedClient(signInMessage: string) {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  const client = getSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw new SocialUnavailableError("Your session could not be verified. Please try again.", { cause: userError });
  }
  if (!userData.user) throw new Error(signInMessage);
  return { client, userId: userData.user.id };
}

const MATERIAL_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MATERIAL_NAME_MAX_LENGTH = 150;
const MATERIAL_SUMMARY_MAX_LENGTH = 240;
const MATERIAL_DESCRIPTION_MAX_LENGTH = 4000;
const MATERIAL_SLUG_MAX_LENGTH = 80;
const MATERIAL_APPLICATIONS_MAX_COUNT = 12;
const MATERIAL_APPLICATION_MAX_LENGTH = 60;

/**
 * Client-side mirror of the RPCs' own server-side validation — a fast,
 * friendly error without a round trip. The database remains authoritative
 * and independently re-validates every one of these limits; this is
 * defense in depth / better UX, never the only enforcement.
 */
export interface MaterialDraftInput {
  slug: string;
  name: string;
  category: MaterialCategory;
  summary?: string | null;
  description?: string | null;
  applications?: string[];
}

interface PreparedMaterialInput {
  slug: string;
  name: string;
  category: MaterialCategory;
  summary: string | null;
  description: string | null;
  applications: string[];
}

function prepareMaterialInput(input: MaterialDraftInput): PreparedMaterialInput {
  const slug = input.slug.trim();
  if (!MATERIAL_SLUG_PATTERN.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and single hyphens only.");
  }
  if (slug.length > MATERIAL_SLUG_MAX_LENGTH) {
    throw new Error(`Slug must be ${MATERIAL_SLUG_MAX_LENGTH} characters or fewer.`);
  }

  const name = input.name.trim();
  if (name.length < 1 || name.length > MATERIAL_NAME_MAX_LENGTH) {
    throw new Error(`Name must be between 1 and ${MATERIAL_NAME_MAX_LENGTH} characters.`);
  }

  if (!isMaterialCategory(input.category)) {
    throw new Error("Choose a valid material category.");
  }

  let summary: string | null = null;
  if (input.summary !== undefined && input.summary !== null) {
    const trimmed = input.summary.trim();
    if (trimmed !== "") {
      if (trimmed.length > MATERIAL_SUMMARY_MAX_LENGTH) {
        throw new Error(`Summary must be ${MATERIAL_SUMMARY_MAX_LENGTH} characters or fewer.`);
      }
      summary = trimmed;
    }
  }

  let description: string | null = null;
  if (input.description !== undefined && input.description !== null) {
    const trimmed = input.description.trim();
    if (trimmed !== "") {
      if (trimmed.length > MATERIAL_DESCRIPTION_MAX_LENGTH) {
        throw new Error(`Description must be ${MATERIAL_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
      }
      description = trimmed;
    }
  }

  const rawApplications = input.applications ?? [];
  if (rawApplications.length > MATERIAL_APPLICATIONS_MAX_COUNT) {
    throw new Error(`Applications must be ${MATERIAL_APPLICATIONS_MAX_COUNT} items or fewer.`);
  }
  const applications = rawApplications.map((entry) => {
    const trimmed = entry.trim();
    if (trimmed === "") {
      throw new Error("Applications entries cannot be blank.");
    }
    if (trimmed.length > MATERIAL_APPLICATION_MAX_LENGTH) {
      throw new Error(`Each application must be ${MATERIAL_APPLICATION_MAX_LENGTH} characters or fewer.`);
    }
    return trimmed;
  });

  return { slug, name, category: input.category, summary, description, applications };
}

/**
 * Validates every field by shape before trusting it, including `status`
 * (any of the three values is acceptable here, unlike parseMaterial's
 * published-only check) — the same "never trust the server blindly"
 * discipline parseMaterial and moderationClient.ts's parseQueueItem already
 * establish.
 */
function parseEditorMaterial(raw: unknown, operation: MaterialsOperation, safeMessage: string): EditorMaterial {
  if (!raw || typeof raw !== "object") throw new MaterialsOperationError(operation, safeMessage);
  const record = raw as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.length === 0) throw new MaterialsOperationError(operation, safeMessage);
  if (typeof record.slug !== "string" || record.slug.length === 0) throw new MaterialsOperationError(operation, safeMessage);
  if (typeof record.name !== "string" || record.name.length === 0) throw new MaterialsOperationError(operation, safeMessage);
  if (!isMaterialCategory(record.category)) throw new MaterialsOperationError(operation, safeMessage);
  if (record.summary !== null && typeof record.summary !== "string") throw new MaterialsOperationError(operation, safeMessage);
  if (record.description !== null && typeof record.description !== "string") throw new MaterialsOperationError(operation, safeMessage);
  if (!Array.isArray(record.applications) || !record.applications.every((item) => typeof item === "string")) {
    throw new MaterialsOperationError(operation, safeMessage);
  }
  if (!isMaterialStatus(record.status)) throw new MaterialsOperationError(operation, safeMessage);

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    category: record.category,
    summary: record.summary as string | null,
    description: record.description as string | null,
    applications: record.applications as string[],
    status: record.status,
  };
}

const SAFE_ACCESS_CHECK_ERROR = "We couldn't verify your access. Please try again.";

/**
 * Calls public.check_catalogue_editor_access() — zero arguments, exactly
 * matching its signature. A `false` return is a genuine, confirmed "not
 * currently an active catalogue editor" answer, never an error and never
 * fabricated — but any real failure (unconfigured client, auth verification
 * failure, network/database problem, or a malformed non-boolean response)
 * always throws, never reinterpreted as a successful denial. Mirrors
 * moderationClient.ts's checkModeratorAccess exactly.
 */
export async function checkCatalogueEditorAccess(): Promise<boolean> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  const { data, error } = await client.rpc("check_catalogue_editor_access");
  if (error) {
    throw new MaterialsOperationError("check_access", SAFE_ACCESS_CHECK_ERROR, { cause: error });
  }
  if (typeof data !== "boolean") {
    throw new MaterialsOperationError("check_access", SAFE_ACCESS_CHECK_ERROR);
  }
  return data;
}

const SAFE_EDITOR_LIST_ERROR = "The catalogue could not be loaded. Please try again.";
const EDITOR_SELECT = "id, slug, name, category, summary, description, applications, status";

/**
 * Every status, not just published — relies entirely on materials_editor_
 * read RLS to decide what comes back (an active catalogue editor sees
 * everything; anyone else sees nothing new beyond materials_public_read's
 * own published-only rows). No pagination exists this slice, matching
 * fetchPublishedMaterials's own bounded single fetch.
 */
export async function fetchMaterialsForEditor(): Promise<EditorMaterial[]> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  const { data, error } = await client
    .from("materials")
    .select(EDITOR_SELECT)
    .order("updated_at", { ascending: false })
    .limit(MATERIALS_LIST_LIMIT);
  if (error) {
    throw new MaterialsOperationError("fetch_for_editor", SAFE_EDITOR_LIST_ERROR, { cause: error });
  }
  return (data ?? []).map((row) => parseEditorMaterial(row, "fetch_for_editor", SAFE_EDITOR_LIST_ERROR));
}

const SAFE_CREATE_ERROR = "This material could not be created. Please try again.";

/**
 * Calls public.create_draft_material(p_slug, p_name, p_category, p_summary,
 * p_description, p_applications) — the exact merged parameter names, and no
 * others; there is no p_status parameter of any kind to send even if this
 * file wanted to — a fresh material always lands as 'draft' server-side.
 * Client-side validation (prepareMaterialInput) runs first for a fast,
 * friendly error; the RPC independently re-validates every limit regardless.
 */
export async function createDraftMaterial(input: MaterialDraftInput): Promise<EditorMaterial> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  const prepared = prepareMaterialInput(input);

  const { data, error } = await client.rpc("create_draft_material", {
    p_slug: prepared.slug,
    p_name: prepared.name,
    p_category: prepared.category,
    p_summary: prepared.summary,
    p_description: prepared.description,
    p_applications: prepared.applications,
  });
  if (error) {
    throw new MaterialsOperationError("create_draft", SAFE_CREATE_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MaterialsOperationError("create_draft", SAFE_CREATE_ERROR);
  }
  return parseEditorMaterial(data[0], "create_draft", SAFE_CREATE_ERROR);
}

const SAFE_UPDATE_ERROR = "This material could not be saved. Please try again.";

/**
 * Calls public.update_draft_material(p_id, p_slug, p_name, p_category,
 * p_summary, p_description, p_applications) — full-replace semantics only,
 * matching the RPC's own contract; every editorial field is re-sent each
 * call. Only ever succeeds while the material is still a draft.
 */
export async function updateDraftMaterial(id: string, input: MaterialDraftInput): Promise<EditorMaterial> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(id, "The material ID");
  const prepared = prepareMaterialInput(input);

  const { data, error } = await client.rpc("update_draft_material", {
    p_id: id,
    p_slug: prepared.slug,
    p_name: prepared.name,
    p_category: prepared.category,
    p_summary: prepared.summary,
    p_description: prepared.description,
    p_applications: prepared.applications,
  });
  if (error) {
    throw new MaterialsOperationError("update_draft", SAFE_UPDATE_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MaterialsOperationError("update_draft", SAFE_UPDATE_ERROR);
  }
  return parseEditorMaterial(data[0], "update_draft", SAFE_UPDATE_ERROR);
}

const SAFE_PUBLISH_ERROR = "This material could not be published. Please try again.";

/** Calls public.publish_material(p_id). Requires a draft with a non-empty summary — the database is authoritative for this rule. */
export async function publishMaterial(id: string): Promise<EditorMaterial> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(id, "The material ID");

  const { data, error } = await client.rpc("publish_material", { p_id: id });
  if (error) {
    throw new MaterialsOperationError("publish", SAFE_PUBLISH_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MaterialsOperationError("publish", SAFE_PUBLISH_ERROR);
  }
  return parseEditorMaterial(data[0], "publish", SAFE_PUBLISH_ERROR);
}

const SAFE_ARCHIVE_ERROR = "This material could not be archived. Please try again.";

/** Calls public.archive_material(p_id). Works from either draft or published; archived is terminal this slice. */
export async function archiveMaterial(id: string): Promise<EditorMaterial> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(id, "The material ID");

  const { data, error } = await client.rpc("archive_material", { p_id: id });
  if (error) {
    throw new MaterialsOperationError("archive", SAFE_ARCHIVE_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MaterialsOperationError("archive", SAFE_ARCHIVE_ERROR);
  }
  return parseEditorMaterial(data[0], "archive", SAFE_ARCHIVE_ERROR);
}
