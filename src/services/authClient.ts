import type { AuthChangeEvent, Provider, Session } from "@supabase/supabase-js";
import { apiFetch } from "./apiClient";
import { getAuthRedirectUrl, getSupabaseClient, isSupabaseConfigured, SupabaseConfigurationError } from "./supabaseClient";

export type AccountType = "customer" | "professional";
export type ProfessionalCategory = "architect" | "interior_designer" | "stone_fabricator" | "stone_supplier" | "installer" | "contractor" | "developer" | "construction_professional" | "smc_team" | "other";
export type SupportedOAuthProvider = "google" | "apple" | "facebook";
export type StaffRole = "user" | "smc_staff" | "moderator" | "catalogue_editor" | "project_manager" | "admin" | "owner";

export interface AuthSession {
  subject: string;
  email?: string;
  emailVerified: boolean;
  roles: StaffRole[];
}

export class AuthConfigurationError extends SupabaseConfigurationError {
  constructor(message?: string) {
    super(message ?? "Production authentication has not been configured for this app.");
    this.name = "AuthConfigurationError";
  }
}

const enabledProviders: Record<SupportedOAuthProvider, boolean> = {
  google: import.meta.env.VITE_SUPABASE_OAUTH_GOOGLE_ENABLED === "true",
  apple: import.meta.env.VITE_SUPABASE_OAUTH_APPLE_ENABLED === "true",
  facebook: import.meta.env.VITE_SUPABASE_OAUTH_FACEBOOK_ENABLED === "true",
};

function requireConfigured() {
  if (!isSupabaseConfigured) throw new AuthConfigurationError();
  return getSupabaseClient();
}

function validateEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) throw new Error("Enter a valid email address.");
  return value;
}

function validatePassword(password: string): void {
  if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
  if (password.length > 1024) throw new Error("Password is too long.");
}

export function isOAuthProviderEnabled(provider: SupportedOAuthProvider): boolean {
  return isSupabaseConfigured && enabledProviders[provider];
}

export async function signUpWithPassword(input: { email: string; password: string; displayName: string; accountType: AccountType; professionalCategory?: ProfessionalCategory }): Promise<{ requiresEmailVerification: boolean }> {
  validatePassword(input.password);
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 100) throw new Error("Enter a name no longer than 100 characters.");
  const { data, error } = await requireConfigured().auth.signUp({
    email: validateEmail(input.email),
    password: input.password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        display_name: displayName,
        account_type: input.accountType,
        ...(input.accountType === "professional" ? { professional_category: input.professionalCategory ?? "other" } : {}),
      },
    },
  });
  if (error) throw new Error(error.message);
  return { requiresEmailVerification: !data.session };
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!password) throw new Error("Password is required.");
  const { error } = await requireConfigured().auth.signInWithPassword({ email: validateEmail(email), password });
  if (error) throw new Error("The email or password is incorrect, or the account is not ready for sign-in.");
}

export async function signInWithOAuth(provider: SupportedOAuthProvider): Promise<void> {
  if (!isOAuthProviderEnabled(provider)) throw new AuthConfigurationError(`${provider} sign-in is not configured for this environment.`);
  const { error } = await requireConfigured().auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo: getAuthRedirectUrl(), skipBrowserRedirect: false },
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await requireConfigured().auth.resetPasswordForEmail(validateEmail(email), {
    redirectTo: getAuthRedirectUrl("/auth/reset-password"),
  });
  if (error) throw new Error("Password recovery could not be started. Please try again later.");
}

export async function updatePassword(password: string): Promise<void> {
  validatePassword(password);
  const { error } = await requireConfigured().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function completeAuthRedirect(url = window.location.href): Promise<void> {
  if (!isSupabaseConfigured) return;
  const parsed = new URL(url);
  const errorDescription = parsed.searchParams.get("error_description");
  if (errorDescription) throw new Error(errorDescription);
  const code = parsed.searchParams.get("code");
  if (code) {
    const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
    if (error) throw new Error("The authentication link is invalid or has expired.");
    parsed.searchParams.delete("code");
    window.history.replaceState({}, document.title, `${parsed.pathname}${parsed.search}${parsed.hash}`);
  }
}

/**
 * `includeServerRoles` asks the Express API for server-verified staff roles.
 * The social shell passes false: it never uses these roles (every privileged
 * screen re-checks access through its own RPC), and a packaged mobile app has
 * no Express API to call (launch roadmap R6/V1-4). The legacy app keeps the
 * default.
 */
export async function getAuthSession(options: { includeServerRoles?: boolean } = {}): Promise<AuthSession | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.user) return null;
  let roles: StaffRole[] = [];
  if (options.includeServerRoles !== false) {
    try {
      const response = await apiFetch("/api/auth/session");
      if (response.ok) {
        const principal = await response.json() as { roles?: StaffRole[] };
        roles = Array.isArray(principal.roles) ? principal.roles : [];
      }
    } catch {
      roles = [];
    }
  }
  return {
    subject: data.session.user.id,
    email: data.session.user.email,
    emailVerified: Boolean(data.session.user.email_confirmed_at),
    roles,
  };
}

export function onAuthSessionChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const { data } = getSupabaseClient().auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign-out could not be completed.");
}

export async function requestAccountDeletion(): Promise<void> {
  const client = requireConfigured();
  const { data } = await client.auth.getUser();
  if (!data.user) throw new Error("Sign in again before requesting account deletion.");
  const { error } = await client.from("account_deletion_requests").insert({ user_id: data.user.id });
  if (error) {
    if (error.code === "23505") throw new Error("An account deletion request is already active.");
    throw new Error("The account deletion request could not be recorded.");
  }
  await signOut();
}
