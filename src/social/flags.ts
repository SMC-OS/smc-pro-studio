/**
 * Phase 5 Gate 0 production-safety correction (supersedes the original
 * Phase 3 flag). The safe default is now the social shell — the legacy
 * `App` (which carries fabricated pricing/stock/certification/testimonial
 * content, see tasks/todo.md's Gate 0 inventory) can only ever render
 * through an explicit, clearly-named, development-only opt-in.
 *
 * `import.meta.env.PROD` is Vite's own build-time production flag — not
 * something a `.env` value can override, so this cannot be defeated by a
 * misconfigured or copy-pasted environment file. Even if
 * VITE_LEGACY_APP_OPT_IN="true" is mistakenly set in a production build,
 * LEGACY_APP_OPT_IN still evaluates to false: production fails closed to
 * the social shell unconditionally, matching AGENTS.md's own "prevention
 * of simulated production success" and "fail safely" requirements.
 *
 * The previous flag (VITE_SOCIAL_SHELL_ENABLED, defaulting to false — the
 * inverted, ambiguous shape this correction replaces) no longer exists;
 * setting it now does nothing.
 */
export const LEGACY_APP_OPT_IN: boolean =
  !import.meta.env.PROD && (import.meta.env.VITE_LEGACY_APP_OPT_IN as string | undefined) === "true";
