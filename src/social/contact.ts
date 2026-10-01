/**
 * Public support and policy surfaces (owner decision O9). One source of truth
 * for every screen, the store listings and the docs.
 */
export const SUPPORT_EMAIL = "support@smcprostudio.app";

export const PUBLIC_PATHS = {
  support: "/support",
  deleteAccount: "/delete-account",
  privacy: "/privacy",
  terms: "/terms",
  communityGuidelines: "/community-guidelines",
  settings: "/settings",
} as const;

export const supportMailto = (subject?: string) =>
  `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
