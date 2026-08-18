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

- [ ] Establish pinned Supabase dependencies, local CLI config, generated types, and migration conventions.
- [ ] Add identity/profile/account-type migrations with RLS and role-separation tests.
- [ ] Add relationships and block/mute migrations with adversarial RLS tests.
- [ ] Add public/private storage buckets and upload-policy tests.
- [ ] Run Supabase security/performance advisors and resolve findings.

### Checkpoint — Data foundation

- [ ] Anonymous/owner/member/unrelated/blocked/moderator policy matrix passes.
- [ ] No service-role or provider secret exists in a client bundle.
- [ ] Owner reviews schema before remote migration.

## Phase 2B — Authentication vertical slices

- [ ] Guest browse plus auth-required action boundary.
- [ ] Email sign-up/sign-in/verification/reset/sign-out/session restore.
- [ ] Customer/professional onboarding; profession never grants roles.
- [ ] Google/Apple/Facebook OAuth callback and provider-linking boundary.
- [ ] Web/Android/iOS redirect contract and secure token-storage boundary.
- [ ] Account deletion/session revocation/retention workflow.

### Checkpoint — Authentication

- [ ] Auth unit/integration/E2E tests pass.
- [ ] Web production and server builds pass.
- [ ] Owner validates provider and deletion UX.

## Phase 3 — Social core

- [ ] Introduce feature-flagged router, mobile shell, design tokens, and lazy route boundaries.
- [ ] Build customer/professional profiles with honest empty states.
- [ ] Build post/media creation, visibility, owner removal, and report entry point.
- [ ] Build public/personalized feed without fabricated counts or fallback content.
- [ ] Build follows, connections, saves, reactions, and comments.
- [ ] Build stories with expiry, views, contextual actions, reporting, and honest empty state.
- [ ] Build Discover search/filter for materials, people, projects, and inspiration.

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
