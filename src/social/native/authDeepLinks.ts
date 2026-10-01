import {
  AUTH_LINK_INVALID_MESSAGE,
  readAuthRedirectParams,
  setAuthRedirectStatus,
} from "../../services/authRedirect";

/**
 * Central handler for native auth deep links. The only accepted links are:
 *
 *   smcprostudio://auth/callback        email verification / OAuth sign-in
 *   smcprostudio://auth/reset-password  password recovery
 *
 * These match getAuthRedirectUrl() in supabaseClient.ts, so Supabase sends
 * native members back to exactly these addresses. Anything else (another
 * scheme, host or path, embedded credentials, or a malformed URL) is rejected
 * without side effects. A custom scheme can be claimed by another app, which
 * is why every flow is PKCE: an intercepted code cannot be exchanged without
 * the verifier held in this app's secure storage.
 */
export const AUTH_DEEP_LINK_SCHEME = "smcprostudio:";

const ROUTES = {
  "/callback": "/auth/callback",
  "/reset-password": "/auth/reset-password",
} as const;

export type AuthDeepLink = {
  route: (typeof ROUTES)[keyof typeof ROUTES];
  code: string | null;
  error: string | null;
};

export function parseAuthDeepLink(raw: unknown): AuthDeepLink | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 4096) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== AUTH_DEEP_LINK_SCHEME || url.host !== "auth") return null;
  if (url.username || url.password || url.port) return null;
  const path = url.pathname.replace(/\/+$/, "") as keyof typeof ROUTES;
  const route = ROUTES[path];
  if (!route) return null;
  return { route, ...readAuthRedirectParams(url) };
}

export type DeepLinkDeps = {
  exchangeCode: (code: string) => Promise<void>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
};

/**
 * Completes an auth deep link: exchange the code (if any), report the
 * outcome, and open the matching in-app screen. Returns false when the URL is
 * not an accepted auth link (it is then ignored entirely).
 */
export async function handleAuthDeepLink(raw: unknown, deps: DeepLinkDeps): Promise<boolean> {
  const link = parseAuthDeepLink(raw);
  if (!link) return false;

  setAuthRedirectStatus({ state: "pending" });
  deps.navigate(link.route, { replace: true });

  if (link.error) {
    setAuthRedirectStatus({ state: "error", message: link.error });
    return true;
  }
  if (!link.code) {
    setAuthRedirectStatus({ state: "error", message: AUTH_LINK_INVALID_MESSAGE });
    return true;
  }
  try {
    await deps.exchangeCode(link.code);
    setAuthRedirectStatus({ state: "done" });
  } catch {
    setAuthRedirectStatus({ state: "error", message: AUTH_LINK_INVALID_MESSAGE });
  }
  return true;
}
