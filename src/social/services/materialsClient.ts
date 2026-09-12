import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

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
