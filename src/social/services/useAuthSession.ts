import { useEffect, useState } from "react";
import { getAuthSession, onAuthSessionChange, type AuthSession } from "../../services/authClient";
import { subscribeToNetworkStatus, isOnline } from "./networkStatus";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; session: AuthSession };

const UNAVAILABLE_RETRY_MS = 10_000;

/**
 * Wraps the existing authClient session so social routes can render guest vs.
 * signed-in states honestly.
 *
 * V1-7: a session check that fails only because the connection dropped never
 * turns a signed-in member into a guest. The last known state is kept (or the
 * check stays "loading" on first load) and is retried when the connection
 * returns, or after a short delay if the device still reports being online.
 * Only a successful check that finds no session — e.g. after signing out, or
 * when the server rejects the session — produces "guest".
 */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let unavailable = false;

    async function load() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      try {
        // No Express API round-trip: social routes never read session.roles.
        const session = await getAuthSession({ includeServerRoles: false });
        if (cancelled) return;
        unavailable = false;
        setState(session ? { status: "authenticated", session } : { status: "guest" });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.name === "AuthSessionUnavailableError") {
          unavailable = true;
          if (isOnline()) retryTimer = setTimeout(() => void load(), UNAVAILABLE_RETRY_MS);
          return; // keep whatever we last knew
        }
        throw error;
      }
    }
    void load();

    const unsubscribeAuth = onAuthSessionChange(() => {
      void load();
    });
    const unsubscribeNetwork = subscribeToNetworkStatus(() => {
      if (unavailable && isOnline()) void load();
    });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribeAuth();
      unsubscribeNetwork();
    };
  }, []);

  return state;
}
