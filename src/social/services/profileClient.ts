import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";

/**
 * V1-1 (launch roadmap): owner profile editing and onboarding completion.
 *
 * Writes go straight to public.profiles / public.professional_profiles under
 * the existing owner-only UPDATE policies and column grants — no new RPC and
 * no schema change. Every limit below mirrors a database CHECK constraint so
 * the user gets a clear message before the request; the database remains the
 * authority. `onboarding_completed` is set only by completeProfile(), and only
 * once the fields that make a profile genuinely useful are present — it is
 * what admits a professional to public Network search.
 *
 * Deliberately never written from here: account_type (changing customer <->
 * professional is not a profile edit), verification_status (staff-only),
 * avatar_path (no upload UI in V1).
 */

export type ProfileVisibility = "public" | "private";

export const PROFESSIONAL_CATEGORY_OPTIONS = [
  { value: "architect", label: "Architect" },
  { value: "interior_designer", label: "Interior Designer" },
  { value: "stone_fabricator", label: "Stone Fabricator" },
  { value: "stone_supplier", label: "Stone Supplier" },
  { value: "installer", label: "Installer" },
  { value: "contractor", label: "Contractor" },
  { value: "developer", label: "Developer" },
  { value: "construction_professional", label: "Construction Professional" },
  { value: "other", label: "Other" },
] as const;
export type EditableProfessionalCategory = (typeof PROFESSIONAL_CATEGORY_OPTIONS)[number]["value"];

const EDITABLE_CATEGORIES = new Set<string>(PROFESSIONAL_CATEGORY_OPTIONS.map((o) => o.value));

export const PROFILE_LIMITS = {
  displayName: 100,
  bio: 500,
  companyName: 160,
  serviceArea: 200,
  websiteUrl: 500,
  services: 12,
  serviceLength: 60,
} as const;

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,29}$/;

export interface ProfileInput {
  displayName: string;
  username: string;
  bio: string;
  visibility: ProfileVisibility;
}

export interface ProfessionalInput {
  /** Omit to leave the category unchanged (e.g. a staff-assigned category not offered in the editor). */
  category?: EditableProfessionalCategory;
  companyName: string;
  serviceArea: string;
  services: string[];
  websiteUrl: string;
}

export type ProfileOperation = "save_profile" | "save_professional";

export class ProfileOperationError extends Error {
  readonly operation: ProfileOperation;

  constructor(operation: ProfileOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProfileOperationError";
    this.operation = operation;
  }
}

/** A user-correctable input problem, distinct from a backend failure. */
export class ProfileValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ProfileValidationError";
    this.field = field;
  }
}

const SAFE_SAVE_PROFILE = "Your profile could not be saved. Please try again.";
const SAFE_SAVE_PROFESSIONAL = "Your professional details could not be saved. Please try again.";
const USERNAME_TAKEN = "That username is already taken. Try another.";

async function requireAuthenticatedClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw new SocialUnavailableError("Your session could not be verified. Please try again.", { cause: error });
  if (!data.user) throw new Error("Sign in to edit your profile.");
  return { client, userId: data.user.id };
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export function prepareProfile(input: ProfileInput) {
  const displayName = input.displayName.trim();
  if (!displayName) throw new ProfileValidationError("displayName", "Add a display name.");
  if (displayName.length > PROFILE_LIMITS.displayName) {
    throw new ProfileValidationError("displayName", `Display names must be ${PROFILE_LIMITS.displayName} characters or fewer.`);
  }
  const username = blankToNull(input.username.toLowerCase());
  if (username !== null && !USERNAME_PATTERN.test(username)) {
    throw new ProfileValidationError(
      "username",
      "Usernames are 3–30 characters: lowercase letters, numbers, dots or underscores, starting with a letter or number.",
    );
  }
  const bio = blankToNull(input.bio);
  if (bio !== null && bio.length > PROFILE_LIMITS.bio) {
    throw new ProfileValidationError("bio", `Bios must be ${PROFILE_LIMITS.bio} characters or fewer.`);
  }
  if (input.visibility !== "public" && input.visibility !== "private") {
    throw new ProfileValidationError("visibility", "Choose who can see your profile.");
  }
  return { display_name: displayName, username, bio, visibility: input.visibility };
}

export function normaliseWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ProfileValidationError("websiteUrl", "Enter a valid website address, e.g. https://example.co.uk");
  }
  if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) {
    throw new ProfileValidationError("websiteUrl", "Websites must be a secure https:// address.");
  }
  const href = url.toString();
  if (href.length > PROFILE_LIMITS.websiteUrl) {
    throw new ProfileValidationError("websiteUrl", `Website addresses must be ${PROFILE_LIMITS.websiteUrl} characters or fewer.`);
  }
  return href;
}

export function prepareProfessional(input: ProfessionalInput) {
  if (input.category !== undefined && !EDITABLE_CATEGORIES.has(input.category)) {
    throw new ProfileValidationError("category", "Choose your profession.");
  }
  const companyName = blankToNull(input.companyName);
  if (companyName !== null && companyName.length > PROFILE_LIMITS.companyName) {
    throw new ProfileValidationError("companyName", `Company names must be ${PROFILE_LIMITS.companyName} characters or fewer.`);
  }
  const serviceArea = blankToNull(input.serviceArea);
  if (serviceArea !== null && serviceArea.length > PROFILE_LIMITS.serviceArea) {
    throw new ProfileValidationError("serviceArea", `Service areas must be ${PROFILE_LIMITS.serviceArea} characters or fewer.`);
  }
  const seen = new Set<string>();
  const services: string[] = [];
  for (const raw of input.services) {
    const service = raw.trim();
    if (!service) continue;
    if (service.length > PROFILE_LIMITS.serviceLength) {
      throw new ProfileValidationError("services", `Each service must be ${PROFILE_LIMITS.serviceLength} characters or fewer.`);
    }
    const key = service.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    services.push(service);
  }
  if (services.length > PROFILE_LIMITS.services) {
    throw new ProfileValidationError("services", `List up to ${PROFILE_LIMITS.services} services.`);
  }
  const update: Record<string, unknown> = {
    company_name: companyName,
    service_area: serviceArea,
    services,
    website_url: normaliseWebsite(input.websiteUrl),
  };
  if (input.category !== undefined) update.category = input.category;
  return update;
}

/**
 * What a profile needs before it counts as complete. Professionals must say
 * what they do and where they work — the two things Network search and
 * filtering are built on. Returned as a list so the UI can say exactly what
 * is missing.
 */
export function missingForCompletion(args: {
  accountType: "customer" | "professional";
  displayName: string;
  category: string | null | undefined;
  serviceArea: string | null | undefined;
}): Array<"displayName" | "category" | "serviceArea"> {
  const missing: Array<"displayName" | "category" | "serviceArea"> = [];
  if (!args.displayName.trim()) missing.push("displayName");
  if (args.accountType === "professional") {
    if (!args.category) missing.push("category");
    if (!args.serviceArea?.trim()) missing.push("serviceArea");
  }
  return missing;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/**
 * Saves the profile (and, for professionals, the professional details), then
 * marks onboarding complete when nothing required is missing. The professional
 * row is written first so a failure there never leaves a profile marked
 * complete without its professional details.
 */
export async function saveOwnProfile(args: {
  accountType: "customer" | "professional";
  profile: ProfileInput;
  professional?: ProfessionalInput;
}): Promise<{ onboardingCompleted: boolean }> {
  const { client, userId } = await requireAuthenticatedClient();
  const profileUpdate = prepareProfile(args.profile);
  const professionalUpdate =
    args.accountType === "professional" && args.professional ? prepareProfessional(args.professional) : null;

  let effectiveCategory: string | null = null;
  if (professionalUpdate) {
    const { data, error } = await client
      .from("professional_profiles")
      .update(professionalUpdate)
      .eq("user_id", userId)
      .select("category, service_area")
      .single();
    if (error || !data) throw new ProfileOperationError("save_professional", SAFE_SAVE_PROFESSIONAL, { cause: error ?? undefined });
    effectiveCategory = (data as { category: string | null }).category;
  }

  const missing = missingForCompletion({
    accountType: args.accountType,
    displayName: profileUpdate.display_name,
    category: effectiveCategory,
    serviceArea: professionalUpdate ? (professionalUpdate.service_area as string | null) : null,
  });
  const onboardingCompleted = missing.length === 0;

  const { data, error } = await client
    .from("profiles")
    .update({ ...profileUpdate, ...(onboardingCompleted ? { onboarding_completed: true } : {}) })
    .eq("id", userId)
    .select("id, onboarding_completed")
    .single();
  if (isUniqueViolation(error)) throw new ProfileValidationError("username", USERNAME_TAKEN);
  if (error || !data) throw new ProfileOperationError("save_profile", SAFE_SAVE_PROFILE, { cause: error ?? undefined });
  return { onboardingCompleted: Boolean((data as { onboarding_completed: boolean }).onboarding_completed) };
}
