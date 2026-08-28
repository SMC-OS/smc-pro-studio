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

## Phase 3 — Professional network foundation *(re-scoped 2026-08-19, was "Social core")*

**Amendment note:** product direction locked to a professional network + project collaboration platform (see `DESIGN.md` and `tasks/plan.md` amendment sections). Original checklist items below are kept and checked off as before — nothing is deleted — with a new priority order layered on top:

1. Professional Network (screen, was Discover)
2. Professional Profiles
3. Connections
4. Follow
5. Network search/filter (profession, location, service area)
6. Company/business presentation foundation (architecture only — no schema yet)
7. Professional activity feed (Home)
8. Project/work updates
9. Public portfolio content
10. "Looking For..." / opportunity architecture (design only — no build yet)
11. Project invitations foundation (design only — no build yet)
12. Saved professionals/materials
13. Comments/reactions kept secondary, only where they support work/networking
14. Guest public professional discovery

Stories become secondary (field/project-update framing, not rebuilt this phase).

### Phase 3 Slice 3 progress note (2026-08-19)

Real comments/reactions/saves UI, Follow/Connect UI (`FollowButton`/`ConnectButton`), a new `/profile/:userId` public profile route, and a Discover-tab expansion to 6 categories were built and verified this slice — see the session's phase-3 project-memory notes for the full file list, security review, and test results. This work satisfies checklist items below marked "(slice 3)". Not yet committed; still needs owner review, and the Discover→Network rename/reframe from this amendment has not yet been applied to that code (next slice).

- [ ] Introduce feature-flagged router, mobile shell, design tokens, and lazy route boundaries. (Router/shell/tokens done behind `VITE_SOCIAL_SHELL_ENABLED`; routes are not yet code-split/lazy-loaded.)
- [ ] Build customer/professional profiles with honest empty states. (Own-profile read view done; editing, avatars, and the professional-specific fields are not built yet.)
- [ ] Build post/media creation, visibility, owner removal, and report entry point. (Text-only post creation with visibility choice is done; media attachments, owner delete UI, and reporting are not. **Slice G (2026-08-23):** post creation now also carries a `post_type` — see the Slice G note below. Still not done: media attachments, owner delete UI, reporting.)
- [ ] Build public/personalized feed without fabricated counts or fallback content. (Public feed reads real (currently empty) data honestly; there is no personalised/followers feed yet.)
- [x] Build follows, connections, saves, reactions, and comments. (slice 3 — `ReactionButton`, `CommentsDrawer`, `FollowButton`, `ConnectButton`, wired into `PostCard`/`PublicProfileRoute`; real DB-backed, no fabricated counts, security-reviewed. Public follower/following counts still deliberately not shown — RLS only lets the two parties read a given `follows` row. **Slice D (2026-08-21): owner-reviewed and accepted as already complete, no code changes needed.** One hardening item logged as deferred backlog, not a blocker: `follows_owner_insert` doesn't check `private.has_blocked()`, so a blocked user can still insert a `follows` row targeting their blocker — no data leak (`can_view_post`/relationship reads independently enforce blocks), just an inconsistent row. Any future fix must ship as a new additive migration with policy replacement (drop+recreate, not edit the historical file), pgTAP coverage, and live DB verification.)
- [ ] Build stories with expiry, views, contextual actions, reporting, and honest empty state. (Not started; de-emphasized per the 2026-08-19 amendment — reframe toward field/project updates before investing further, not an entertainment-style rebuild.)
- [ ] Build Network search/filter for people, trades, companies, and service area/profession *(was "Discover search/filter for materials, people, projects, and inspiration")*. (Network rename/reframe, tabs, and the profession/service-area dropdown+text filters landed in an earlier slice. **Slice E (2026-08-21):** added server-side substring search across `display_name`/`company_name`/`service_area` via a new `search_public_professionals` SECURITY INVOKER RPC (`supabase/migrations/20260821090000_network_search_professionals.sql`), pg_trgm indexes, case-insensitive keyset pagination, and an onboarding-incomplete exclusion scoped to this function only (no RLS policy changed). Wired into `NetworkRoute.tsx`/`socialClient.ts` with input debounce and a "Load more" control. Structural pgTAP coverage added (`supabase/tests/database/network_search.test.sql`); **not yet run against a live Postgres/Supabase instance in this session — checkbox stays unchecked until `supabase test db` and a real dev-project smoke test both pass.** Multi-select profession, sort, verification_status/services[] filters, and durable Playwright/E2E tooling remain explicitly deferred.)

### Phase 3 Slice G progress note (2026-08-23)

**Exact shipped scope:** `public.post_type` enum with exactly two values, `general` and `portfolio`. `posts.post_type` — not null, default `general`. `field_update`, `project_update`, and `opportunity` are **not** shipped and remain explicitly deferred: `field_update` until the Stories/media design defines it, `project_update` until real projects/membership/project-update authorization exist, `opportunity` until the approved "Looking For..." architecture is designed. No `post_media` wiring, no fabricated portfolio evidence (body/media/author-type/visibility are never used to infer `portfolio` — every existing and new default-path post stays honestly `general`).

Files: new additive migration `supabase/migrations/20260823120000_posts_post_type.sql` (enum + column + `grant insert/update (post_type) to authenticated`; no RLS policy added or changed — `post_type` is presentation metadata, not a visibility/authorization dimension). New pgTAP file `supabase/tests/database/post_type.test.sql`, written and run red (8/11 new assertions failing against the pre-migration schema) before the migration existed, then green after. `src/social/services/socialClient.ts` (new `PostType` type; `post_type` added to `FeedPost`, `createPost`, `fetchHomeFeed`'s select, `fetchPublicPostsByAuthor`'s select). `src/social/routes/CreateRoute.tsx` (accessible required `fieldset`/radio-group selector, General default, per-option description, draft+type preserved on failed submit, `busy` guard against duplicate submission). `src/social/components/PostCard.tsx` (restrained "Portfolio" label via exact `post_type === "portfolio"` equality — no badge for general, and no coercion of an unrecognized future value into "Portfolio"). `src/social/routes/InteractionPreviewRoute.tsx` (added `post_type: "general"` to its fixture post — required by the now-non-optional `FeedPost.post_type` field).

**Exact test results:** `npm run lint` — clean. `npm run build` — succeeds (pre-existing >500kB chunk-size warning, unrelated). `npm test` — 5/5 pass. `npx supabase@2.115.0 test db` against a local Docker Postgres — 73/73 pass across all four test files (10 new `post_type.test.sql` assertions + the pre-existing 63). `git diff --check` — clean (only pre-existing LF→CRLF repo-convention warnings). Live browser QA against the local stack (real signed-in user, real Postgres rows, not mocked): default General on load; Portfolio selectable and persists to the DB row as `post_type: "portfolio"`; a forced submit failure (corrupted session token) preserved both the draft body and the Portfolio selection; a rapid double-click on Publish produced exactly one `POST` and exactly one DB row; keyboard-only operation confirmed (Tab reaches the radio group on the checked item, `ArrowDown` moves focus and selection to Portfolio, native grouping verified via shared `name` attribute); `PostCard` badge verified both ways via `/dev/interaction-preview` ("Portfolio" label appears only when `post_type` is `portfolio`, absent for `general`); no horizontal overflow at 375px/768px; no new `transition`/`animate`/`duration-`/motion classes were introduced by this diff (grepped), so no reduced-motion regression is possible here.

**Pre-existing bug found during Slice G QA, fixed and verified (2026-08-23):** `fetchHomeFeed`'s and `fetchPublicPostsByAuthor`'s `author:profiles(...)` embed shorthand in `socialClient.ts` was genuinely ambiguous to PostgREST (`PGRST201` — `posts`/`profiles` has three relationship paths: the direct FK, plus many-to-many via `reactions` and via `saved_posts`), causing the real Home feed to fail end-to-end in any environment with the full social-core schema — since the Slice 3 migration, not something Slice G introduced, and previously untested live (this todo file had already flagged that gap). Fixed by disambiguating both call sites with the confirmed FK name: `author:profiles!posts_author_id_fkey(...)`. The FK name was confirmed directly against the live Postgres catalog (`pg_constraint`/`information_schema`), not guessed or inferred from the migration text alone — exactly one FK exists from `posts` to `profiles`, `posts_author_id_fkey` (`posts.author_id → profiles.id`). `comments`'s and `connections`'s `:profiles(...)` embeds were checked the same way and are not touched: `comments→profiles` has exactly one relationship path (confirmed via catalog query showing no table references `comments`, plus a live 200 OK on the unmodified embed), and `connections`'s two embeds already carried explicit `!connections_requester_id_fkey`/`!connections_addressee_id_fkey` hints. No schema, migration, RLS, grant, or post-type change — `npm run test:db` still passes 73/73 unchanged, confirming nothing in the database layer moved. Live-verified: real signed-in Home feed now returns 200 (previously 300/PGRST201) and renders both real posts with the correct badge (Portfolio post shows "· Portfolio", General post shows none); guest (anon) Home feed also succeeds and is still governed entirely by existing RLS (unaffected, since only the embed hint changed); `fetchPublicPostsByAuthor`'s corrected query also returns 200 with real data (its own UI section is gated by an unrelated, pre-existing `isProfessional` condition on `PublicProfileRoute` — not a regression, not in scope here).

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

- [ ] Build member-secured direct and project conversations. (**Slice A (2026-08-24): schema/RLS foundation only, no UI.** `supabase/migrations/20260824090000_direct_messaging_foundation.sql` adds `conversations` (`kind` enum, currently only `direct`), `conversation_members`, and append-only `messages`, all RLS-enabled and member-scoped. Clients have no write access to `conversations`/`conversation_members` at all — the only path to create a direct conversation is `create_direct_conversation(other_user_id uuid)`, a SECURITY DEFINER RPC that is idempotent (reversed-argument and repeated calls return the same conversation, via a canonicalized-pair unique index), rejects self-conversations and nonexistent targets, and blocks creation in either direction of an existing block via the unchanged `private.has_blocked()` helper. Message sends are blocked the same way, both at creation time and if a block is imposed afterward, and are append-only (no update/delete grant, even for the sender). Two new private helper functions (`private.is_conversation_member`, `private.conversation_has_blocked_participant`) route membership/block checks through SECURITY DEFINER, avoiding an RLS self-recursion trap a raw self-join on `conversation_members` would otherwise hit. `MessagesRoute` is untouched and stays the existing "coming soon" placeholder — no route/component/service-client work in this slice. pgTAP coverage: `supabase/tests/database/direct_messaging.test.sql`, 85 assertions, passing locally (`npx supabase@2.115.0 test db`: 158/158 across all five test files). Still needed before this checklist item is done: conversation-list/thread UI and wiring it into a route using `messagingClient.ts` (see the Slice B note below — the typed service boundary itself already exists), plus project-scoped conversations (deferred to Phase 5, once project membership exists).

**Slice B (2026-08-24): typed service boundary only, still no UI/route/component/navigation/Realtime work.** New `src/social/services/messagingClient.ts` (kept separate from `socialClient.ts` rather than growing that file further) exports `ConversationKind`, `ConversationMember`, `ConversationSummary` (includes real embedded `members`, never a fabricated profile/last-message/unread-count/delivery field — the schema has no honest source for any of those), `DirectMessage`, `MessageCursor`, `MessagePage`, and four functions, all gated through one shared private `requireAuthenticatedClient()` helper: an unconfigured Supabase client throws `SocialUnavailableError`, and a missing session throws an explicit "Sign in to …" error — in both cases before any conversation/message query or RPC ever runs. `createOrGetDirectConversation(otherUserId)` (auth-gated, UUID-validated, calls the `create_direct_conversation` RPC, propagates its exception messages verbatim), `fetchMyConversations(limit?)` (unconfigured/unauthenticated → throws before querying; `[]` only for a successful authenticated query that genuinely found zero rows; a real query/network failure still throws; limit clamped to [1, 50]), `fetchMessages(conversationId, cursor?, pageSize?)` (same auth-before-query gate; keyset-paginated on `(created_at desc, id desc)`, identical mechanics to `fetchHomeFeed`'s cursor — no schema limitation blocks this, so no migration/approval gate was needed; relies entirely on `messages_member_read` RLS for membership, never duplicates it client-side), and `sendMessage(conversationId, body)` (auth-gated, trims/rejects empty or >2000-char bodies before ever inserting, `sender_id` is always the authenticated session's id with no caller-supplied override possible, returns the server-confirmed row via `.select().single()`). **Corrected 2026-08-24, same slice:** `fetchMyConversations`/`fetchMessages` originally (wrongly) returned a fabricated empty result for an unconfigured client or a missing session — indistinguishable from a genuine empty inbox. Both now route through `requireAuthenticatedClient()` like every other function in the file, so an empty result can only ever come from a real, successful, authenticated zero-row query. **Corrected again, same slice:** `requireAuthenticatedClient()` originally collapsed a genuine `auth.getUser()` failure (a real session-verification/network problem) into the same generic "Sign in to …" text as a plain missing session — misleading, since the caller may already be signed in. It now distinguishes the two: a `getUser()` error throws `SocialUnavailableError` with a safe, generic "Your session could not be verified. Please try again." message (the original auth error attached via `Error` `cause`, and `SocialUnavailableError` in `socialClient.ts` extended to accept `ErrorOptions` for this), and only a *successful* `getUser()` call with no user throws the existing action-specific "Sign in to …" text — before any query/RPC/insert runs either way. `tests/messaging-client.test.mjs` (26 unit tests, up from 20 — added explicit unauthenticated-throws-before-query and getUser()-failure-throws-SocialUnavailableError cases for all four exported functions, and reworded the existing zero-row cases as "authenticated, successful, genuinely empty") plus a new `tests/messaging-client-unconfigured.test.mjs` (2 unit tests; split out because `node:test`'s `mock.module` exports are a one-time snapshot, not a live binding, so a single mocked `isSupabaseConfigured` value can't flip between "configured" and "unconfigured" scenarios within one file) — 28 messaging-service tests total, all against a fake Supabase client (this repo's first service-layer client tests, mocking `supabaseClient.ts` directly rather than a whole route) — passing (`bun run test`: 40/40 across all files). `MessagesRoute.tsx` is untouched. No migration or pgTAP change this slice (`npm run test:db` still 158/158, unchanged). Still needed: conversation-list/thread UI, wiring this service into a route, Realtime, unread counts, notifications, block/mute UI, project-scoped conversations.)

**Slice C (2026-08-27): direct-messaging UI only; messaging is not fully complete.** `MessagesRoute` now renders an authenticated conversation list with honest loading, confirmed-empty, failure/retry, and neutral-profile-fallback states; guests receive a sign-in boundary and start no messaging query. `ConversationRoute` validates the UUID before mounting the thread, so malformed IDs query nothing. `MessagingLayout` presents list-only/thread-only mobile routes and a two-pane desktop layout; the thread has an accessible Back control, focused heading, labelled composer, polite additions region, alerts, chronological deduplicated keyset pagination, and explicit Refresh because this slice adds neither Realtime nor polling. `ThreadView` invalidates stale StrictMode/route-switch responses, appends only the row confirmed by `sendMessage`, preserves the draft on failure, clears it only after confirmation, and blocks repeat submission while pending. `MessageButton` is hidden for guests and the viewer's own profile and navigates only after `createOrGetDirectConversation()` succeeds. No fabricated unread, delivery, read, presence, online, typing, or last-message state is shown. No schema/migration/storage/RLS change was made. Behavioral coverage uses the repository's mounted `node:test` + jsdom setup: 23/23 Slice C UI interaction tests pass; the complete JS suite passes 63/63, TypeScript lint passes, the web build passes with the existing >500 kB chunk warning, and the server build passes. The database suite could not be rerun on this machine: Bun is absent, Docker is absent, and the pinned Supabase CLI wrapper failed to spawn; the last unchanged-schema result remains Slice B's recorded 158/158, not a new Slice C verification. Still needed before the parent checkbox can close: project-scoped conversations (after project membership exists), moderation/report/block/mute UI coverage, notifications, and any separately approved live-update/unread model.

**Slice C.1 (2026-08-28): safe messaging error presentation only; messaging is still not fully complete.** Fixes a confirmed post-merge QA finding: a blocked user starting a conversation could see `createOrGetDirectConversation`'s raw RPC exception text verbatim, including the internal `create_direct_conversation` function name. `src/social/services/messagingClient.ts` adds one exported `MessagingOperationError` (extends `Error`; `operation: "create_conversation" | "list_conversations" | "fetch_messages" | "send_message"` for tests/logging only, never rendered) and routes every Postgres/PostgREST/RPC failure in the file through it. All four operations now throw a fixed, caller-authored safe message — never derived from `error.message`/`.details`/`.hint` — with the original backend error preserved only as `Error` `cause`: create/retrieve conversation → "This conversation is unavailable. Please try again." (identical for every cause — self-message, missing user, a block, or a genuine failure — so a blocked caller gets no signal distinguishing "blocked" from "any other reason," per the "do not infer or reveal whether another user blocked the caller" requirement); list conversations → "Your conversations could not be loaded. Please try again." (unchanged text, now typed); fetch thread messages → "This conversation could not be loaded. Please try again." (reworded from "Messages could not be loaded…" for consistency); send → "This message could not be sent. Please try again." (unchanged text, now typed). `MessageButton.tsx`, `ThreadView.tsx`, and `ConversationList.tsx` needed no changes — all three already rendered only `error.message` with a hardcoded fallback for a non-`Error` throw, so normalizing at the service boundary alone makes every UI surface safe. Caller-side validation (malformed UUID, empty/over-2000-char body), `SocialUnavailableError` (unconfigured client / failed session verification), and the plain "Sign in to …" errors are all untouched and remain distinct from `MessagingOperationError`. No migration/schema/RLS/RPC/pgTAP change — `npm run test:db` still 158/158, unchanged. Tests: `tests/messaging-client.test.mjs` replaces the one test that asserted the RPC's raw text propagated verbatim with regressions proving a blocked-pair error, a self-message error, and a malformed-payload error all collapse to the identical safe `create_conversation` message with `cause` preserved, plus equivalent safe-message/cause-preservation coverage added for `list_conversations`/`fetch_messages`/`send_message` (a shared `assertSafeMessagingError` helper checks type, safe message, `cause`, and the absence of raw fragments in one call) — 29 tests, up from 23. New `tests/messaging-error-boundary.test.mjs` (3 tests) mounts the *real* `MessageButton`/`ThreadView` against a mocked `supabaseClient.ts` (one layer lower than the other component test files, which mock `messagingClient.ts` itself) so the real normalization genuinely runs end-to-end: a blocked-pair RPC error renders only the safe message and never navigates, an RLS rejection on the initial thread load renders only the safe message, and a blocked send preserves the draft and renders only the safe message — all three assert the raw fragments (`create_direct_conversation`, `messages_member_insert`, `row-level security`, SQLSTATE codes, `policy`) are absent from both `textContent` and `innerHTML`. `tests/conversation-route.test.mjs`, `tests/messages-route.test.mjs`, and `tests/message-button.test.mjs` had their fixture error text reworded from raw-looking backend strings ("permission denied for table messages", "connection reset", "this conversation is not available") to the real safe text, so no test in the suite models a raw backend message as expected propagation any more; their Retry-still-works assertions are otherwise unchanged. Full suite: 71/71 (up from 65/65). TypeScript lint clean, web build clean, server build clean. Live-verified against the local QA accounts: a blocked `qa-user-c` clicking Message on a blocking `qa-user-b`'s profile shows only "This conversation is unavailable. Please try again." with no navigation; a blocked `qa-user-a` sending into an existing thread with `qa-user-b` shows only "This message could not be sent. Please try again." with the draft preserved; both checked against the rendered DOM and browser console for the same raw fragments the new test asserts against — none found. Temporary block rows were created and removed via each blocking QA user's own authenticated session (never service-role); zero rows remain in `public.blocks` afterward. Still needed before the Phase 4 messaging checkbox can close: everything Slice C already listed (project-scoped conversations, moderation/report/block/mute UI, notifications, any approved live-update/unread model), plus a UI affordance for blocking/unblocking itself (the `blocks` table and its RLS already exist from Slice A; there is still no client-reachable way to create a block outside direct authenticated REST calls like the ones used for this slice's own verification).
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
