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
 * standards, warranty, or provenance field exists on the underlying table,
 * so none is exposed here either. `image_path` (Phase 5 Slice C) is the one
 * editorial image — an object key in the public materials-media bucket,
 * never a URL; resolve it with getMaterialImageUrl().
 */
export interface Material {
  id: string;
  slug: string;
  name: string;
  category: MaterialCategory;
  summary: string | null;
  description: string | null;
  applications: string[];
  image_path: string | null;
}

/** Mirrors the materials.image_path CHECK constraint (Slice C migration). */
const MATERIAL_IMAGE_PATH_PATTERN =
  /^materials\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$/;

/**
 * A row's image_path is trusted only if it is null or a well-formed key
 * inside that same material's own folder — the same rule the database's
 * CHECK constraint enforces, re-checked here rather than assumed.
 */
function isValidImagePathFor(materialId: string, value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === "string" && MATERIAL_IMAGE_PATH_PATTERN.test(value) && value.startsWith(`materials/${materialId}/`);
}

const SAFE_LIST_ERROR = "Materials could not be loaded. Please try again.";
const SAFE_DETAIL_ERROR = "This material could not be loaded. Please try again.";

// No pagination exists this slice — a single bounded fetch is sufficient for
// a foundation-stage catalogue with no seed data. Not a page size a caller
// can influence.
const MATERIALS_LIST_LIMIT = 100;

const MATERIALS_SELECT = "id, slug, name, category, summary, description, applications, image_path, status";

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
  if (!isValidImagePathFor(record.id, record.image_path)) throw new Error(safeMessage);
  if (record.status !== "published") throw new Error(safeMessage);

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    category: record.category,
    summary: record.summary as string | null,
    description: record.description as string | null,
    applications: record.applications as string[],
    image_path: record.image_path as string | null,
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
  | "archive"
  | "upload_image"
  | "set_image"
  | "clear_image";

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
/**
 * The Slice B mutation RPCs (create/update/publish/archive) return a fixed
 * column list that predates Slice C and carries no image_path — none of them
 * can change the image. Their results are therefore typed without it
 * (EditorMaterialSummary) rather than inventing a value.
 */
export type EditorMaterialSummary = Omit<EditorMaterial, "image_path">;

function parseEditorMaterialSummary(raw: unknown, operation: MaterialsOperation, safeMessage: string): EditorMaterialSummary {
  const { image_path: _ignored, ...rest } = parseEditorMaterial(
    raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>), image_path: null } : raw,
    operation,
    safeMessage,
  );
  return rest;
}

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
  if (!isValidImagePathFor(record.id, record.image_path)) throw new MaterialsOperationError(operation, safeMessage);
  if (!isMaterialStatus(record.status)) throw new MaterialsOperationError(operation, safeMessage);

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    category: record.category,
    summary: record.summary as string | null,
    description: record.description as string | null,
    applications: record.applications as string[],
    image_path: record.image_path as string | null,
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
const EDITOR_SELECT = "id, slug, name, category, summary, description, applications, image_path, status";

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
  // A freshly created draft genuinely has no image yet (image_path defaults to null).
  return parseEditorMaterial(
    data[0] && typeof data[0] === "object" ? { ...(data[0] as Record<string, unknown>), image_path: null } : data[0],
    "create_draft",
    SAFE_CREATE_ERROR,
  );
}

const SAFE_UPDATE_ERROR = "This material could not be saved. Please try again.";

/**
 * Calls public.update_draft_material(p_id, p_slug, p_name, p_category,
 * p_summary, p_description, p_applications) — full-replace semantics only,
 * matching the RPC's own contract; every editorial field is re-sent each
 * call. Only ever succeeds while the material is still a draft.
 */
export async function updateDraftMaterial(id: string, input: MaterialDraftInput): Promise<EditorMaterialSummary> {
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
  return parseEditorMaterialSummary(data[0], "update_draft", SAFE_UPDATE_ERROR);
}

const SAFE_PUBLISH_ERROR = "This material could not be published. Please try again.";

/** Calls public.publish_material(p_id). Requires a draft with a non-empty summary — the database is authoritative for this rule. */
export async function publishMaterial(id: string): Promise<EditorMaterialSummary> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(id, "The material ID");

  const { data, error } = await client.rpc("publish_material", { p_id: id });
  if (error) {
    throw new MaterialsOperationError("publish", SAFE_PUBLISH_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MaterialsOperationError("publish", SAFE_PUBLISH_ERROR);
  }
  return parseEditorMaterialSummary(data[0], "publish", SAFE_PUBLISH_ERROR);
}

const SAFE_ARCHIVE_ERROR = "This material could not be archived. Please try again.";

/** Calls public.archive_material(p_id). Works from either draft or published; archived is terminal this slice. */
export async function archiveMaterial(id: string): Promise<EditorMaterialSummary> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(id, "The material ID");

  const { data, error } = await client.rpc("archive_material", { p_id: id });
  if (error) {
    throw new MaterialsOperationError("archive", SAFE_ARCHIVE_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MaterialsOperationError("archive", SAFE_ARCHIVE_ERROR);
  }
  return parseEditorMaterialSummary(data[0], "archive", SAFE_ARCHIVE_ERROR);
}

// ==========================================================================
// Phase 5 Slice C: one editorial image per material.
//
// Upload order is deliberate: (1) the file is uploaded to a fresh,
// never-reused key under materials/<id>/ (upsert: false, so nothing is ever
// overwritten in place); (2) set_material_image verifies the object really
// exists and points the row at it; (3) only then is the previous object
// removed. A failure at (1) or (2) leaves the material exactly as it was.
// A failure at (3) leaves an orphaned file but a correct row — the cleanup
// is best-effort and never fails the operation. Removal follows the same
// rule: the row is cleared first, the object deleted second.
//
// Storage writes are gated by the role-checked materials-media policies, and
// both RPCs independently re-verify an active catalogue editor.
// ==========================================================================

export const MATERIAL_IMAGES_BUCKET = "materials-media";
export const MATERIAL_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const MATERIAL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const IMAGE_EXTENSION: Record<(typeof MATERIAL_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface MaterialImageResult {
  id: string;
  image_path: string | null;
}

const SAFE_UPLOAD_IMAGE_ERROR = "This image could not be uploaded. Please try again.";
const SAFE_SET_IMAGE_ERROR = "This image could not be saved. Please try again.";
const SAFE_CLEAR_IMAGE_ERROR = "This image could not be removed. Please try again.";

/**
 * Guest-safe: resolves a stored object key to the bucket's public URL. Returns
 * null for no image, an unconfigured client, or a key that is not a valid
 * materials-media path — never a guessed or placeholder URL.
 */
export function getMaterialImageUrl(imagePath: string | null): string | null {
  if (imagePath === null || !isSupabaseConfigured) return null;
  if (!MATERIAL_IMAGE_PATH_PATTERN.test(imagePath)) return null;
  const { data } = getSupabaseClient().storage.from(MATERIAL_IMAGES_BUCKET).getPublicUrl(imagePath);
  return data?.publicUrl ?? null;
}

function parseImageResult(data: unknown, materialId: string, operation: MaterialsOperation, safeMessage: string): MaterialImageResult {
  if (!Array.isArray(data) || data.length !== 1) throw new MaterialsOperationError(operation, safeMessage);
  const row = data[0] as Record<string, unknown> | null;
  if (!row || typeof row !== "object" || row.id !== materialId) throw new MaterialsOperationError(operation, safeMessage);
  if (row.image_path !== null && typeof row.image_path !== "string") throw new MaterialsOperationError(operation, safeMessage);
  return { id: row.id as string, image_path: row.image_path as string | null };
}

/** Deletes an object only if it is a well-formed key inside this material's own folder; never throws. */
async function removeImageObjectQuietly(
  client: ReturnType<typeof getSupabaseClient>,
  materialId: string,
  imagePath: string | null | undefined,
): Promise<void> {
  if (!imagePath || !MATERIAL_IMAGE_PATH_PATTERN.test(imagePath) || !imagePath.startsWith(`materials/${materialId}/`)) return;
  try {
    await client.storage.from(MATERIAL_IMAGES_BUCKET).remove([imagePath]);
  } catch {
    // Best-effort: the database row is already correct; an orphaned object is harmless.
  }
}

/**
 * Uploads a JPEG/PNG/WebP (≤8MB) and makes it the material's image. Pass the
 * material's current image_path as `previousImagePath` to have the old object
 * removed once the row is confirmed updated.
 */
export async function uploadMaterialImage(
  materialId: string,
  file: File,
  previousImagePath?: string | null,
): Promise<MaterialImageResult> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(materialId, "The material ID");
  if (!(MATERIAL_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > MATERIAL_IMAGE_MAX_BYTES) {
    throw new Error("Images must be 8MB or smaller.");
  }
  if (file.size === 0) {
    throw new Error("This image file is empty.");
  }

  const extension = IMAGE_EXTENSION[file.type as (typeof MATERIAL_IMAGE_TYPES)[number]];
  const path = `materials/${materialId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(MATERIAL_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (uploadError) {
    throw new MaterialsOperationError("upload_image", SAFE_UPLOAD_IMAGE_ERROR, { cause: uploadError });
  }

  const { data, error } = await client.rpc("set_material_image", { p_id: materialId, p_image_path: path });
  if (error) {
    throw new MaterialsOperationError("set_image", SAFE_SET_IMAGE_ERROR, { cause: error });
  }
  const result = parseImageResult(data, materialId, "set_image", SAFE_SET_IMAGE_ERROR);

  if (previousImagePath && previousImagePath !== result.image_path) {
    await removeImageObjectQuietly(client, materialId, previousImagePath);
  }
  return result;
}

/** Clears the material's image, then deletes the stored object (best-effort). */
export async function removeMaterialImage(materialId: string, currentImagePath: string | null): Promise<MaterialImageResult> {
  const { client } = await requireAuthenticatedClient("Sign in to manage the catalogue.");
  requireUuid(materialId, "The material ID");

  const { data, error } = await client.rpc("clear_material_image", { p_id: materialId });
  if (error) {
    throw new MaterialsOperationError("clear_image", SAFE_CLEAR_IMAGE_ERROR, { cause: error });
  }
  const result = parseImageResult(data, materialId, "clear_image", SAFE_CLEAR_IMAGE_ERROR);
  await removeImageObjectQuietly(client, materialId, currentImagePath);
  return result;
}
