# SMC Pro Studio transformation checklist

## Phase 1 — Architecture and UX specification

- [x] Create and verify recoverable source checkpoint.
- [x] Re-audit repository structure and oversized components.
- [x] Define final navigation and screen hierarchy.
- [x] Define relational schema, RLS matrix, and storage boundary.
- [x] Classify significant existing features: keep/improve/merge/move/disable/remove.
- [x] Define phased vertical implementation and verification gates.
- [ ] Owner approves Phase 1 plan and answers/defers open decisions.

## Phase 2A — Supabase local foundation

- [ ] Establish pinned Supabase dependencies, local CLI config, generated types, and migration conventions. (Supabase JS is pinned and `supabase/config.toml` exists; generated TypeScript types are not wired up yet.)
- [x] Add identity/profile/account-type migrations with RLS and role-separation tests. (`20260818194558_identity_profiles_roles.sql` + `rls.test.sql` + `phase2-foundation.test.mjs`.)
- [x] Add relationships and block/mute migrations with adversarial RLS tests. (Follows/connections/blocks landed in the Phase 3 social-core migration — see Phase 3 notes below — rather than as a separate Phase 2A step; structural pgTAP coverage exists in `rls_social_core.test.sql`, but it has not been executed against a live Postgres instance in this session — see Phase 3 notes.)
- [x] Add public/private storage buckets and upload-policy tests. (`20260818194625_storage_foundations.sql` + `rls.test.sql`.)
- [ ] Run Supabase security/performance advisors and resolve findings. (Not run this session — needs the confirmed dev/staging Supabase project, see below.)

### Checkpoint — Data foundation

- [ ] Anonymous/owner/member/unrelated/blocked/moderator policy matrix passes.
- [ ] No service-role or provider secret exists in a client bundle.
- [ ] Owner reviews schema before remote migration.

## Phase 2B — Authentication vertical slices

- [ ] Guest browse plus auth-required action boundary. (RLS distinguishes anon/authenticated throughout; the guest-facing UI boundary is being built screen by screen in Phase 3 — see notes.)
- [x] Email sign-up/sign-in/verification/reset/sign-out/session restore. (`src/services/authClient.ts` + `SecureAuthPortal.tsx`.)
- [x] Customer/professional onboarding; profession never grants roles. (Signup form collects account type/category; the `on_auth_user_created` trigger only ever assigns the `user` role.)
- [ ] Google/Apple/Facebook OAuth callback and provider-linking boundary. (Fail-closed by default and wired to a real Supabase call; no provider has real SMC-owned credentials configured/tested yet.)
- [ ] Web/Android/iOS redirect contract and secure token-storage boundary. (Web + Capacitor scheme handled in code; unverified on an actual native build.)
- [ ] Account deletion/session revocation/retention workflow. (Request creation + sign-out work; the identity-lock/retention-review/completion lifecycle has no processing logic yet.)

### Checkpoint — Authentication

- [ ] Auth unit/integration/E2E tests pass.
- [ ] Web production and server builds pass.
- [ ] Owner validates provider and deletion UX.

## Phase 3 — Social core

- [ ] Introduce feature-flagged router, mobile shell, design tokens, and lazy route boundaries. (Router/shell/tokens done behind `VITE_SOCIAL_SHELL_ENABLED`; routes are not yet code-split/lazy-loaded.)
- [ ] Build customer/professional profiles with honest empty states. (Own-profile read view done; editing, avatars, and the professional-specific fields are not built yet.)
- [ ] Build post/media creation, visibility, owner removal, and report entry point. (Text-only post creation with visibility choice is done; media attachments, owner delete UI, and reporting are not.)
- [ ] Build public/personalized feed without fabricated counts or fallback content. (Public feed reads real (currently empty) data honestly; there is no personalised/followers feed yet.)
- [ ] Build follows, connections, saves, reactions, and comments. (Schema, RLS, and service functions exist for follow/unfollow/save; there is no UI for any of it yet, and comments/reactions have no service functions or UI yet.)
- [ ] Build stories with expiry, views, contextual actions, reporting, and honest empty state. (Not started; Home shows an honest "not built yet" notice instead of a Stories tray.)
- [ ] Build Discover search/filter for materials, people, projects, and inspiration. (Public professional directory only; no search/filter, and materials/projects/inspiration wait on later phases' schema.)

### Phase 3 progress notes (this slice)

- New `supabase/migrations/20260819120000_social_core.sql`: `follows`, `connections`, `blocks`, `posts`, `post_media`, `comments`, `reactions`, `saved_posts`, all RLS-enabled, deny-by-default, with a shared `private.can_view_post()` helper so visibility logic isn't duplicated per table. Structural pgTAP coverage in `supabase/tests/database/rls_social_core.test.sql` — **not executed against a live Postgres/Supabase instance in this session** (no local Supabase CLI/Docker available here, and the one Supabase project visible via the Supabase MCP has an unrelated migration history and zero tables, so it was left untouched). Needs `supabase test db` locally or against an explicitly-approved dev project before this is considered verified.
- New `src/social/` module: feature-flagged shell (`AppShell.tsx`, `SocialApp.tsx`), the five primary routes, `socialClient.ts` (guest-safe reads + authenticated writes), honest loading/empty/error states throughout. Verified in a real Chromium browser (Playwright) at mobile and desktop viewports, flag on and off, guest state only.
- Known gap: the reused `SecureAuthPortal` auth screen keeps its original dark/gold styling — restyling it to the bright identity is deferred to a follow-up slice rather than rushed into this one.
- Known gap: desktop currently reuses the same bottom nav as mobile; the plan's desktop nav-rail adaptation is not built yet.

### Checkpoint — Social core

- [ ] Accessibility/mobile matrix and critical social E2E paths pass.
- [ ] Stored-XSS, IDOR, spam/rate and blocked-user tests pass.
- [ ] Bundle budgets and lazy-loading checks pass.

## Phase 4 — Messages, moderation, notifications

- [ ] Build member-secured direct and project conversations.
- [ ] Build report/block/mute enforcement across feed, profiles, stories, and messages.
- [ ] Build server-controlled moderation queue and append-only actions.
- [ ] Build notification records/preferences and push-ready delivery boundary.

### Checkpoint — Safety and communication

- [ ] Conversation privacy and membership transition tests pass.
- [ ] Moderation abuse cases and auditability reviewed.
- [ ] Community Guidelines and reporting UX receive owner/legal review.

## Phase 5 — SMC hubs

- [ ] Complete authoritative pricing/content inventory and production purge.
- [ ] Consolidate Materials hub.
- [ ] Consolidate Design Studio.
- [ ] Replace instant quote with Quote Request / Review Required workflow.
- [ ] Consolidate Project and Tracker.
- [ ] Consolidate Technical hub.
- [ ] Consolidate Site & Installation hub, including AR limitations.
- [ ] Consolidate Account into Profile and Settings.

### Checkpoint — SMC journey

- [ ] Discover -> Save -> Project -> Quote -> Project update path passes.
- [ ] No unapproved price, stock, verification, certification, origin, or success claim remains.
- [ ] Existing working functionality has a documented destination or explicit owner-approved retirement.

## Phase 6 — Catalogue/enquiry commerce

- [ ] Implement approved catalogue ingestion and provenance fields.
- [ ] Implement sample and slab-reservation enquiry states.
- [ ] Keep checkout/payments disabled pending separate approved phase.

## Phase 7 — UX, accessibility, performance, analytics

- [ ] Validate principal screens in Figma and record approved variants.
- [ ] Complete safe-area, keyboard, tablet, landscape, enlarged-text, and reduced-motion work.
- [ ] Complete semantic/focus/contrast/alt-text audit.
- [ ] Complete media optimisation, route splitting, bundle budgets, and network/offline states.
- [ ] Configure consent-aware PostHog only after privacy/event approval.

## Phase 8 — Production verification/security

- [ ] Unit, integration, E2E, RLS/pgTAP, upload, authz, and failure-path suites pass.
- [ ] Dependency audit and security review pass or blockers are accepted explicitly.
- [ ] Lint, frontend build, server build, and production smoke test pass.

## Phases 9–10 — Native and stores

- [ ] Add/sync Capacitor native projects only after product stability gate.
- [ ] Validate native OAuth/deep links, secure storage, media/camera, push, permissions.
- [ ] Produce Android release build and device evidence.
- [ ] Prepare iOS project/privacy manifest; complete build/signing/device evidence on macOS/Xcode.
- [ ] Complete store metadata, screenshots, privacy/data-safety, moderation, and deletion disclosures.
