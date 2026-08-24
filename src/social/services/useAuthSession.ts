import { useEffect, useState } from "react";
import { getAuthSession, onAuthSessionChange, type AuthSession } from "../../services/authClient";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; session: AuthSession };

/** Wraps the existing authClient session so social routes can render guest vs. signed-in states honestly. */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getAuthSession();
      if (cancelled) return;
      setState(session ? { status: "authenticated", session } : { status: "guest" });
    }
    void load();

    const unsubscribe = onAuthSessionChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
