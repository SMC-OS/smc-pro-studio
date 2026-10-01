import { useSyncExternalStore } from "react";
import { getSupabaseClient, isSupabaseConfigured, SupabaseConfigurationError } from "./supabaseClient";

/**
 * Shared state for auth redirects: email verification, OAuth and password
 * recovery. Both the web path (completeAuthRedirect on page load) and the
 * native path (smcprostudio:// deep links) report here, and /auth/callback
 * renders from it. There is one flow, not one per platform.
 */
export type AuthRedirectStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "done" }
  | { state: "error"; message: string };

let status: AuthRedirectStatus = { state: "idle" };
const listeners = new Set<() => void>();

export function setAuthRedirectStatus(next: AuthRedirectStatus): void {
  status = next;
  for (const l of [...listeners]) l();
}
export function getAuthRedirectStatus(): AuthRedirectStatus {
  return status;
}
export function subscribeAuthRedirectStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useAuthRedirectStatus(): AuthRedirectStatus {
  return useSyncExternalStore(subscribeAuthRedirectStatus, getAuthRedirectStatus, getAuthRedirectStatus);
}

// Supabase PKCE auth codes are UUIDs; accept a conservative URL-safe token.
const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/;
const MAX_ERROR_LENGTH = 300;

/**
 * Reads `code` and `error_description`/`error` from a redirect URL's query or
 * fragment (GoTrue reports some errors in the fragment). A malformed code is
 * treated as absent; error text is trimmed and length-capped plain text.
 */
export function readAuthRedirectParams(url: URL): { code: string | null; error: string | null } {
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const pick = (name: string) => url.searchParams.get(name) ?? hash.get(name);
  const rawCode = pick("code");
  const rawError = pick("error_description") ?? pick("error");
  return {
    code: rawCode && CODE_PATTERN.test(rawCode) ? rawCode : null,
    error: rawError ? rawError.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_LENGTH) || null : null,
  };
}

export const AUTH_LINK_INVALID_MESSAGE = "The authentication link is invalid or has expired.";

/**
 * Exchanges a PKCE auth code for a session. The single code-exchange path for
 * web redirects (completeAuthRedirect) and native deep links
 * (src/social/native/authDeepLinks.ts).
 */
export async function exchangeAuthCode(code: string): Promise<void> {
  if (!isSupabaseConfigured) throw new SupabaseConfigurationError();
  const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
  if (error) throw new Error(AUTH_LINK_INVALID_MESSAGE, { cause: error });
}

/** Web: completes an auth redirect on page load and reports the outcome. */
export async function completeAuthRedirect(url = window.location.href): Promise<void> {
  if (!isSupabaseConfigured) return;
  const parsed = new URL(url);
  const { code, error } = readAuthRedirectParams(parsed);
  if (!code && !error) {
    if (getAuthRedirectStatus().state === "idle") setAuthRedirectStatus({ state: "done" });
    return;
  }
  setAuthRedirectStatus({ state: "pending" });
  try {
    if (error) throw new Error(error);
    if (code) {
      await exchangeAuthCode(code);
      parsed.searchParams.delete("code");
      window.history.replaceState({}, document.title, `${parsed.pathname}${parsed.search}${parsed.hash}`);
    }
    setAuthRedirectStatus({ state: "done" });
  } catch (caught) {
    setAuthRedirectStatus({ state: "error", message: caught instanceof Error ? caught.message : AUTH_LINK_INVALID_MESSAGE });
    throw caught;
  }
}
