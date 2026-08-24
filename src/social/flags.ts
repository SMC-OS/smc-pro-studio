/**
 * Phase 3 social shell feature flag.
 *
 * The new Home/Network/Create/Messages/Profile experience is additive and
 * off by default: `main.tsx` still renders the existing `App` unless this
 * flag is explicitly enabled, so nothing about the current production
 * experience changes until the owner opts in per environment.
 */
export const SOCIAL_SHELL_ENABLED: boolean =
  (import.meta.env.VITE_SOCIAL_SHELL_ENABLED as string | undefined) === "true";
