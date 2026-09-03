# SMC Pro Studio Social Transformation Plan

## Amendment — 2026-08-19: professional network pivot

Owner-directed product-direction lock. Full rationale in `DESIGN.md`'s amendment section — summarised here as the concrete architecture/navigation delta against this plan's original "Final navigation" and "Screen hierarchy" sections below (neither section's original text is deleted; both are updated in place to the amended IA, with this note as the record of why).

**Delta against the original plan:**
- Navigation tab 2 changes from **Discover** to **Network**, re-purposed as professional discovery (people/trades/companies/service area/profession) rather than a materials-led browse surface. Materials/inspiration discovery is preserved but becomes a secondary/contextual surface, not a primary tab.
- Navigation tab 4 changes from **Messages** to **Projects** — Messages remains fully available, reachable contextually (header/profile/project/connection actions, notification shortcut) rather than a primary tab. Projects becomes primary because project-scoped collaboration (CompanyCam-style evidence, membership, roles) is now a first-class pillar, not a sub-section of Profile.
- Stories are retained as a foundation but de-emphasized and reframed toward field/project updates rather than entertainment content; no Phase 4-style moderation investment yet.
- The relationship model gains an explicit third rung — **Follow → Connect → Collaborate** — with Collaborate scoped strictly to project membership/roles/permissions, never conflated with Follow or Connect.
- **No schema changes required for this pivot.** `follows`, `connections`, `posts`, `comments`, `reactions`, `saved_posts` (all already migrated in `20260819120000_social_core.sql`) fully support the professional-network foundation work below. Project membership/roles (needed for the Collaborate rung and a real Projects tab) remain schema work for Phase 5 as originally planned — this amendment does not pull that forward without a dedicated migration + RLS review.
- "Looking For..." structured opportunity posts and company/business identity (multi-person company pages) are explicitly deferred — noted as future architecture to design for, not built now.

**Reusable as-is (no rework needed):** router/app shell, design tokens, bead/notch mobile nav mechanism, desktop nav rail mechanism (labels update, mechanism doesn't), auth redesign + animations, OTP UI foundation, `follows`/`connections`/`posts`/`comments`/`reactions`/`saved_posts` schema and RLS, `socialClient.ts` service-layer architecture, honest loading/empty/error/guest state components.

**Reframed, not rebuilt:** Discover → Network (same route mechanics, professional-first content and copy); Home feed copy/prioritisation (professional activity framing over generic "posts"); Stories → field/project updates framing.

**Deferred:** company/business identity schema, "Looking For..." opportunity post architecture, project invitations, full Projects-tab-as-CompanyCam implementation (Phase 5 as originally scoped) — Phase 3 continues to build the network/profile/connection foundation these will eventually sit on top of.

## Status and guardrails

This is the Phase 1 architecture/UX specification. It makes no application-source, database, Figma, Supabase, PostHog, payment, or native-project changes. Implementation starts only after owner approval.

- Baseline: completed production-foundation/security work remains authoritative.
- Checkpoint: `C:\SMC PRO VISION APP\smc-pro-studio-20260818-social-phase1.zip`
- Checkpoint SHA-256: `DE5C120303FCBABC0574C5AEBB59E39A0C09534AA5F1818537DFAC3A62BAC1B3`
- Never weaken fail-closed auth, server roles, validation, CORS, rate limits, safe errors, secret isolation, pricing safeguards, or offline protections.
- Never use demo content, engagement, stock, verification, pricing, or success states as live production data.
- Build vertical, reviewable slices; do not replace the application in one rewrite.

## Product architecture

The product becomes one network with two profile modes, not two apps:

`Discover -> Connect -> Design -> Quote -> Project -> Installation`

- Guests browse public feed, materials, inspiration, and public profiles.
- Customers gain save, project, quote, message, and collaboration actions after authentication.
- Professionals gain portfolio and professional publishing fields, but no administrative authority.
- Staff/admin permissions remain server-controlled and are absent until explicitly provisioned.
- Specialist tools appear inside Material, Project, Technical, and Site contexts instead of the global navigation.

## Final navigation *(amended 2026-08-19 — see amendment section above)*

### Mobile primary navigation

| Tab | Purpose | Authentication boundary |
|---|---|---|
| Home | Professional activity feed — project/portfolio updates, field updates, opportunities | Public read; interactions require auth |
| Network *(was Discover)* | Professional discovery — people, trades, companies; materials/inspiration reachable contextually | Public read; save/follow/connect actions require auth |
| Create | Project update, portfolio post, field update, "Looking For..." (future), general post | Auth required; options depend on profile and project role |
| Projects *(was Messages)* | Private/collaborative project workspace — evidence, activity, people, materials | Auth required; membership-enforced |
| Profile | Public professional/customer identity plus private account/workspace | Public profile read; owner controls require auth |

Messages remains fully available — reachable via header action, profile action, project action, connection action, and a notification shortcut — rather than occupying a primary tab. Desktop uses the same information architecture in a persistent left rail; it does not expose a second menu taxonomy.

### Contextual hubs

- Materials: entered from Home, Network, Projects, search, or contextual actions (no longer a primary-tab-led browse surface).
- Design Studio: entered from a saved inspiration/material or project.
- Quote Request: entered from a material, design, professional, or project.
- Project: entered from Home, Profile, Network, notifications, or contextual actions.
- Technical and Site & Installation: project/material sub-sections, progressively disclosed by role.
- Settings, legal, moderation/help: profile menu, not primary navigation.

## Screen hierarchy

```text
App shell
├── Home
│   ├── Stories tray -> Story viewer -> contextual action
│   ├── Feed -> Post detail -> comments/share/report
│   └── Recommendations -> material/professional/project detail
├── Discover
│   ├── Search and filters
│   ├── Inspiration grid
│   ├── Materials
│   │   ├── Family/category
│   │   ├── Material detail -> save/add/request sample/request quote
│   │   └── Slab detail (only verified stock/properties)
│   ├── Professionals -> professional profile -> follow/connect/contact
│   └── Public projects/inspiration
├── Create
│   ├── Post / Story
│   ├── Project update
│   └── Professional portfolio/material post (eligible profiles)
├── Messages
│   ├── Conversation list
│   ├── Direct conversation
│   └── Project conversation
└── Profile
    ├── Posts / portfolio
    ├── Saved collections
    ├── Projects
    │   ├── Overview / stage / next action / decisions
    │   ├── Materials / Design / Quote / Measurements
    │   ├── Documents / Technical / Site
    │   ├── Fabrication / Installation / Tracker
    │   └── Messages / Participants
    ├── Connections / Following / Quotes
    └── Settings
        ├── Account / providers / notifications / privacy
        ├── Blocked and muted users
        ├── Data export / account deletion
        └── Terms / privacy / community guidelines
```

### Principal screen design contract

- Bright warm-stone base; charcoal typography; mineral accents; imagery provides colour.
- Original SMC card language with light elevation, generous spacing, 44px minimum targets.
- Mobile-first safe-area shell, responsive tablet columns, keyboard-safe composer/messages.
- Every remote view has loading, honest empty, error, retry, and offline states.
- No engagement counts unless backed by real aggregate data.
- Create and destructive actions use explicit visibility and confirmation controls.
- Figma validation set: Home, Discover, Story viewer, Create, Messages, customer profile, professional profile, Materials, Project, Quote, Auth.

## Data architecture

Supabase Auth is identity; Postgres is authorization and product state. The frontend receives only the publishable key. Server/service-role credentials remain backend-only. Every exposed table has RLS; privileged moderation/administration is performed by audited server boundaries, not client metadata.

### Core domains and tables

| Domain | Tables | Notes |
|---|---|---|
| Identity | `profiles`, `professional_profiles`, `user_roles`, `terms_acceptances` | `profiles.id -> auth.users.id`; roles written only by trusted server/admin |
| Relationships | `follows`, `connections`, `blocks`, `mutes` | Unique directed pairs; block rules override follow/connect/message visibility |
| Social | `posts`, `post_media`, `comments`, `reactions`, `stories`, `story_media`, `story_views`, `saved_posts` | Explicit visibility; soft moderation status; story expiry |
| Catalogue | `material_categories`, `materials`, `slabs`, `collections`, `collection_materials`, `saved_materials` | Technical/stock/origin fields nullable until authoritative; no inferred facts |
| Projects | `projects`, `project_members`, `project_materials`, `project_updates`, `project_decisions`, `documents` | Membership role and per-record visibility govern access |
| Quotes | `quotes`, `quote_items`, `quote_attachments` | Default `review_required`; monetary fields nullable and server-written only from approved pricing source |
| Messaging | `conversations`, `conversation_members`, `messages` | Optional `project_id`; only active members may read/write |
| Safety | `reports`, `moderation_actions`, `notifications`, `notification_preferences`, `account_deletion_requests` | Reports private to reporter and moderators; actions append-only/audited |

Avoid a polymorphic `saved_items` table because it cannot preserve strong foreign keys. Use focused join tables initially and introduce additional saved types only when needed.

### Key relationship rules

- A user has one profile and optionally one professional profile.
- Account type/profession is descriptive; it never confers roles.
- Follows are unilateral. Connections are a request/accept state machine.
- Posts may reference a public/authorized project or material, but cannot inherit broader visibility than the referenced project.
- Conversation access is membership-based; project membership does not silently expose all direct messages.
- Quote totals/prices can be set only by trusted SMC workflows from approved data.
- Deletion uses a documented lifecycle: immediate access lock, session revocation, retention/legal review, then deletion/anonymisation.

### RLS policy matrix

| Data | Select | Insert/update/delete |
|---|---|---|
| Public profiles/posts/materials | Guests may read only rows explicitly public and active | Owner-authored fields only; moderation/verification fields server-only |
| Private profile/saves | Owner only | Owner only with both `USING` and `WITH CHECK` |
| Connections | Requester/addressee | State transitions constrained; users cannot self-accept as the other party |
| Projects/documents/updates | Owner or active project member with permitted role | Role-specific; no client-supplied owner reassignment |
| Quotes | Requester plus assigned authorized staff | Customer submits request; price/status fields server-controlled |
| Conversations/messages | Active conversation member | Active member; sender forced to `auth.uid()` |
| Reports | Reporter can see own submission; moderators via server boundary | Reporter creates; moderation fields server-only |
| Roles/moderation actions | No general client access | Trusted server/admin only |

Policy implementation requirements: explicit `TO anon`/`TO authenticated`; `(select auth.uid())`; ownership predicates (not role-only policies); indexes on policy columns; `security_invoker` views; no authorization from `user_metadata`; no public `SECURITY DEFINER`; RLS and storage policies tested with anonymous, owner, member, unrelated user, blocked user, and moderator fixtures.

### Storage architecture

- `public-media`: approved public avatars, post/story media, and public catalogue/editorial media.
- `private-project-media`: project files, quote attachments, measurements, documents; signed URLs after membership checks.
- Server validates MIME signature, size, dimensions/duration, malware pipeline status, and ownership; extensions are not trusted.
- Upload begins in quarantine/pending state; content is not public until validation succeeds.
- Storage object paths are user/project scoped; overwrite requires select/insert/update policies.

## Frontend/backend boundaries

- React feature routes replace the `activeTab` mega-render incrementally; route-level lazy imports split bundles.
- Feature modules: `auth`, `feed`, `discover`, `content`, `profiles`, `materials`, `projects`, `quotes`, `messages`, `moderation`, `settings`.
- Supabase client handles authenticated RLS-safe CRUD and Realtime where appropriate.
- Express remains the trusted boundary for Gemini, Stripe (later phase), moderation/admin operations, approved pricing, webhooks, and high-risk workflows.
- Shared schemas/types validate client and server contracts; user-generated rich text is stored as plain text/structured safe content, never trusted HTML.
- PostHog is deferred until event taxonomy, consent, retention, and production project are approved; no PII in event properties.

## Consolidation map

| Existing feature | Decision | Proposed destination / reason |
|---|---|---|
| `GuestWelcomeScreen`, `HomeDashboard` | Replace/Reuse selectively | New public Home feed; reuse brand/media primitives, remove generic hero and fake metrics |
| Material catalogue in `App.tsx` | Improve/Move | Materials hub and Discover; retain verified descriptive fields only |
| `BulkSlabReserveView` | Merge/Disable transaction | Materials/Slab detail; enquiry action until live stock/reservation exists |
| `ArtisanShopView` | Merge | Marketplace/Materials; catalogue-only without verified price/stock/checkout |
| `DigitalCuratorView`, `DailyTreasureVault` | Merge/Move | Discover/editorial collections; remove fabricated scarcity/rewards |
| `GeologicalProvenanceView` | Improve/Move | Material education only; remove unverified origin/ledger/certification claims |
| A-Design/visualizer in `App.tsx`, `ExhibitionWalkthroughView` | Merge | Design Studio; preserve useful visualisation with clear capability limits |
| `OnlineQuoteHub`, `QuoteSummary`, quote logic in `App.tsx` | Replace/Reuse forms | Focused Quote Request; status is Review Required without approved pricing |
| `FinanceCalculatorModal`, `FinancialCommandView`, Stripe/legal payment surfaces | Disable/Move later | No public price/finance/payment until authoritative pricing and Stripe phase |
| `ProjectCommandView`, project panels in `App.tsx` | Improve/Merge | Unified Project hub |
| `ProjectTimelineVisualizer`, `ProjectVelocityChart` | Merge | Project Tracker, using real stages only |
| `SlabYieldGranularReport`, `SlabYieldSummaryChart` | Move/Restrict | Professional project technical view; no fabricated value totals |
| CRM pipeline/analytics/publishing/beta portals | Disable public/Move internal | Future staff console with server roles; never part of customer navigation |
| `EdgeProfilesView`, `SubstrateSpecsView`, `JointDetailsView`, `TechnicalLibraryView` | Merge | Technical hub tabs |
| `SiteReadinessView`, `MeasureTool`, crew/calendar components | Merge | Site & Installation hub; role-based details and AR accuracy disclaimer |
| `UnifiedCustomerInbox`, concealed/WhatsApp chat | Merge | Messages; external WhatsApp link remains optional, not a fake in-app success |
| `SecureAuthPortal`, `ManagerSecurityGate` | Replace | Supabase Auth UI/boundary; remove client-side role gates |
| `AccountView` | Improve/Split | Profile and Settings; remove fake facility/reward/order/financial data |
| Referrals components | Disable | Optional post-launch acquisition feature; current rewards/discounts are unverified |
| Legal/privacy/compliance components | Improve/Consolidate | Settings/Legal; counsel review required; describe implemented controls only |
| Offline manager | Improve/Move | Network status and pending-actions UI; no private API cache |

## Pricing remediation

Pricing is a launch gate, not a cosmetic cleanup.

1. Build a price-occurrence inventory covering TS/TSX, AI prompts, legal copy, seed data, generated documents, rewards, discounts, fees, valuations, and stock values.
2. Classify each amount as approved/current, contractual/legal-owner-provided, demo-only, or unverified.
3. Remove unverified values and price sorting/calculation paths from production UI; use Request Quote / Price on Application.
4. Add centrally managed `price_books`/`price_entries` only after SMC supplies authority, currency, VAT basis, unit, scope, effective dates, and approver. These tables are not included in the initial schema until that source exists.
5. Ensure Gemini prompts cannot invent or repeat prices and quote endpoints cannot accept client-authored totals.

## Phased implementation

### Phase 2 — Supabase/auth foundation

Create local migrations and tests first, then a non-production Supabase branch/project after owner supplies the target. Implement identity/profile vertical slices, RLS, storage quarantine, web/mobile OAuth redirects, secure token storage boundary, and account deletion. Checkpoint and owner review.

### Phase 3 — Social shell and core

Introduce router/app shell and light design tokens behind a feature flag. Deliver guest browsing, profile, post/feed, follows/connections, saves/comments, then stories. Each slice includes honest states, moderation entry points, tests, and lazy loading.

### Phase 4 — Messaging, moderation, notifications

Deliver membership-secured conversations, reports/block/mute, moderation queue boundary, notification preferences and push-ready records. Abuse/rate tests precede enablement.

**Slice A (2026-08-24):** direct-messaging schema/RLS foundation landed (`conversations`/`conversation_members`/`messages`, `create_direct_conversation()` RPC) — see `tasks/todo.md` for the exact scope. No UI/route/client wiring yet; `MessagesRoute` remains the placeholder. Block/mute/report UI, the moderation queue, and notifications remain fully unbuilt.

**Slice B (2026-08-24):** typed, unit-tested service boundary landed (`src/social/services/messagingClient.ts` — create/get direct conversation, fetch conversations, fetch messages with keyset pagination, send message) — see `tasks/todo.md` for the exact scope. Still no route/UI/Realtime/notifications/block-mute-UI work; `MessagesRoute` remains the placeholder.

**Slice C (2026-08-27):** the existing Slice B boundary is now wired into an honest direct-messaging UI: authenticated conversation list, responsive `/messages/:conversationId` thread route, keyset “load older” pagination, explicit manual refresh, confirmed-row-only sends, and a profile Message action that navigates only after the direct-conversation RPC succeeds. Guests and malformed IDs query nothing; StrictMode and route-switch generations prevent stale list/thread responses from replacing newer state. No schema, Realtime, polling, unread/delivery/read/presence claims, notifications, moderation, or project-conversation work was added. Messaging remains incomplete overall; see `tasks/todo.md` for verification and remaining scope.

**Slice C.1 (2026-08-28):** fixes a confirmed post-merge QA finding — a blocked user starting a conversation could see the raw `create_direct_conversation` RPC exception text. `messagingClient.ts` now routes every backend failure across all four messaging operations through one typed `MessagingOperationError`, each with a fixed safe message (identical regardless of cause, so "blocked" is never distinguishable from any other failure) and the original error preserved only as `cause`. No UI component needed changes — they already rendered only `error.message`. No schema/RLS/RPC change. Messaging remains incomplete overall; see `tasks/todo.md` for the exact scope, test counts, and live verification.

**Slice D (2026-08-29):** authenticated Realtime delivery for direct messages. One additive migration adds `public.messages` (and only that table) to the pre-existing `supabase_realtime` publication, RLS-gated per subscriber by the unchanged `messages_member_read` policy — no policy or SECURITY DEFINER change. `messagingClient.ts` adds `subscribeToConversationMessages()`, a typed subscription boundary that only ever signals "something changed" (never a raw payload); `ThreadView` always re-runs the same authenticated `fetchMessages` on every signal, coalescing concurrent signals into one further fetch. Manual Refresh, pagination, and draft preservation from Slice C are all unaffected by Realtime connection state. Live two-user (plus a non-member third and a temporary block/unblock, both via authenticated QA sessions, never service-role) verification confirmed bidirectional live delivery, outage/reconnect catch-up via a fresh remount/subscribe, RLS-based isolation and blocked-send rejection, and no raw Realtime/Postgres detail exposed in DOM or console. Messaging remains incomplete overall; see `tasks/todo.md` for the exact scope, test counts, and live verification detail.

**Slice D follow-up (2026-08-29):** closes the one gap the live pass above left narrower than intended — proof that the *same already-mounted* subscription (not a remount) correctly handles the underlying channel reporting SUBSCRIBED again after an outage. No code change was needed: `messagingClient.ts`'s status callback was already a persistent, reentrant closure, matching how `@supabase/realtime-js`'s own `RealtimeChannel.subscribe()` re-invokes that same callback on every rejoin (confirmed by reading its source). Three new tests (two service-level in `tests/messaging-realtime-client.test.mjs`, one mounted in `tests/conversation-route.test.mjs`) drive one channel/subscription through SUBSCRIBED→error→SUBSCRIBED cycles with no navigation, proving: connected is reported again, a fresh catch-up fetch runs each time, no second channel/subscription is ever created, cleanup stays a single idempotent call, and a message sent during the outage arrives correctly deduplicated and chronological. Full JS suite 93/93 (up from 90/90); pgTAP unchanged 162/162. The one thing that remains live-unobserved is narrower still: an open tab healing itself with zero interaction at all (vs. a remount), blocked only by a local Docker/Kong artifact from the outage-simulation method, not by any known code gap.

**Slice E (2026-08-29): secure direct-message read-state database foundation only — no UI/service/badge/notification work.** New additive migration `supabase/migrations/20260829172436_message_read_state.sql` (generated with the pinned `supabase@2.115.0` CLI's `migration new`) adds a supporting `messages_conversation_id_created_at_id_key` unique constraint on `(conversation_id, created_at, id)` and a new table `public.message_read_state` — one row per `(conversation_id, user_id)`, storing the caller's high-water read cursor as the same deterministic `(last_read_message_created_at, last_read_message_id)` tuple `messagingClient.ts`/`ThreadView.tsx` already use for message ordering, never a bare timestamp. A composite FK ties `(conversation_id, user_id)` to `conversation_members` (`on delete cascade`, so a removed membership/conversation can never orphan a read-state row) and another ties the complete `(conversation_id, last_read_message_created_at, last_read_message_id)` cursor to the new `messages` unique constraint (declaratively guaranteeing a cursor can never point at another conversation's message *and* that its stored timestamp is not falsified/stale — see the Slice E follow-up below for why the id-only shape this paragraph originally described was insufficient); a CHECK forbids a partial null cursor. RLS is enabled with exactly one owner-only SELECT policy; clients get no INSERT/UPDATE/DELETE grant on this table at all — `public.mark_conversation_read(conversation_id, message_id)` (SECURITY DEFINER, `auth.uid()`-bound, no caller-suppliable user id) is the sole write path, using a single atomic `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE <strictly newer>` statement so the cursor can never move backwards even under concurrent/repeated/out-of-order calls. `public.get_unread_message_counts()` (SECURITY INVOKER — every table it joins is already correctly RLS-scoped to the caller, so no elevated privilege is needed) returns each of the caller's conversations with a count of messages from other senders, at or after their membership began, newer than their stored cursor (or all of them, if no read-state row exists yet — the documented first-use contract). pgTAP coverage added to `supabase/tests/database/direct_messaging.test.sql`: 67 assertions added over the 89-assertion baseline (156 total in this file) covering the full structural/behavioural contract, including monotonicity, cross-conversation cursor rejection, non-member/anon rejection, owner-only privacy, and that a block never fabricates or bypasses read access — full suite 229/229 (`npx supabase@2.115.0 db reset` then `test db`, both from a clean reset and on top of the merged Slice D state). The local `supabase_realtime` publication still contains exactly `public.messages` after reset — this table is never added to it. No route/component/client/Realtime/badge/notification code was touched (`messagingClient.ts`, `ThreadView.tsx`, and every other Phase 4 UI file are unmodified); full JS suite unchanged at 93/93, lint/build/server-build clean. Still needed before the Phase 4 messaging checkbox can close: everything Slice D already listed, plus the UI/service layer this foundation exists to support (mark-as-read on scroll/focus, an unread badge, a conversation-list unread indicator) and any block/mute/report UI.

**Slice E follow-up (2026-08-29): FK integrity correction — bind the complete read cursor to the actual message row.** The original cursor FK above proved `(conversation_id, last_read_message_id)` against `messages` but never checked `last_read_message_created_at` against that same row, so a caller with direct table access (there is none today, but the constraint itself made no such guarantee) could have stored a genuine `conversation_id`/message id paired with an arbitrary, falsified `last_read_message_created_at`. Corrected in place, same migration file (not yet merged, so this is an edit to in-flight work, not a historical migration): `messages_conversation_id_id_key` → `messages_conversation_id_created_at_id_key`, now `unique (conversation_id, created_at, id)`; `message_read_state_cursor_fk` now `foreign key (conversation_id, last_read_message_created_at, last_read_message_id) references public.messages (conversation_id, created_at, id)` — column order matches the existing `(created_at, id)` cursor-ordering convention throughout. No trigger was needed; a declarative composite FK expresses the complete invariant. The RPC, the membership FK, the CHECK, and the unread-count query all needed no change — the RPC already wrote both columns together from a single `messages` row lookup. Proven directly (outside the test transaction) with a manual insert: a genuine `conversation_id`/message-id pair with `last_read_message_created_at` set to `2000-01-01` was rejected with `ERROR: insert or update on table "message_read_state" violates foreign key constraint "message_read_state_cursor_fk"`, citing the full three-column tuple. `direct_messaging.test.sql` gained 6 further assertions (2 proving the FK's exact three-column order and the backing unique constraint's exact order/columns, 2 proving direct-insert rejection — one with a falsified timestamp, one with a real timestamp/id from a different conversation, and 2 proving `mark_conversation_read` stores the message's actual `created_at`, not merely a value the RPC could have fabricated) — 73 assertions now added over the 89-assertion baseline, 162 total in this file, full suite 235/235 from a completely clean `db reset`. Lint, JS tests (93/93, unchanged), web build, and server build all re-verified clean; `supabase_realtime` re-inspected and still contains exactly `public.messages`.

**Slice F (2026-08-29): read-state service/UI wiring — no migration/RLS/grant/RPC change; messaging still not fully complete.** Wraps the merged Slice E contract exactly as shipped. `messagingClient.ts` adds `fetchUnreadMessageCounts()` (zero-argument `get_unread_message_counts` call, validated into a duplicate-free `Map<string, number>`, with `bigint` `unread_count` accepted only as a finite non-negative safe integer — never coerced) and `markConversationRead()` (exact `p_conversation_id`/`p_message_id` RPC params, requires the single returned row's conversation/message/user ids to all match the request/session before trusting it). A small new pub/sub (`readStateEvents.ts`) lets `ThreadView` tell the sibling `ConversationList` pane "this conversation is now confirmed read" without either needing a reference to the other (`MessagingLayout`'s `rightPane` prop is opaque). `ConversationList` fetches conversations and counts together, treats a missing/duplicate/unknown-conversation count as a contract error (safe Retry, never an assumed zero), and renders an accessible badge (exact count in an `sr-only` label; visible cap at "99+"). `ThreadView` marks the newest confirmed message after every authoritative success (initial load, Refresh, Realtime catch-up, confirmed send) — never from a raw Realtime payload, never regressing on an older page — deduping/coalescing redundant attempts while leaving the database RPC's own monotonic upsert as the real concurrency guarantee; a failed mark-read shows a non-blocking, accessible, first-person-only status with a 44px Retry that always targets the current newest message. `BottomNav`/`NavRail` untouched. Full JS suite 143/143 (up from the 93/93 pre-Slice-F baseline — see the 2026-08-30 correction below for the exact reconciled per-file arithmetic; the original "45 new service tests" figure here was wrong and did not reconcile against the 50-test net change), TypeScript lint/web build/server build clean, pgTAP unchanged 235/235 (ran against the already-running stack, no reset). Live two-QA-account verification (real signup/Inbucket flow) confirmed genuine zero unread and sender-exempt counts; the list's own badge only ever reflects the true count once its own lifecycle (mount or Retry) re-fetches — there is no live/polling update path, and the "1 mid-flight, then 2" observation during this pass was exactly that snapshot behavior, not a live increment (see the 2026-08-30 correction for the exact wording fix). Mark-on-open/catch-up was confirmed by inspecting the `message_read_state` DB row directly, and badge-clears-only-on-confirmed-success was confirmed via the local mount-scoped hand-off described below. Via real (non-pgTAP) queries inside a rolled-back transaction: a genuine non-member gets zero unread rows and a fail-closed mark-read rejection, and one real member cannot select another's read-state row. A live forced-RPC-failure check was attempted (temporarily revoking `authenticated`'s execute grant) but was blocked by the harness's own destructive-action safeguard before anything was touched; the equivalent behavior is proven by the mounted test suite instead, and the grant was independently confirmed unchanged. QA data (3 users, 1 conversation, 4 messages, 2 read-state rows) was deleted via cascade at the end of the pass. See `tasks/todo.md` for exact types/functions, test names, and full live-verification detail.

**Slice F correction (2026-08-30): reconciled test-count arithmetic; closed a cross-authenticated-session badge-leak gap in the read-state event bus; corrected list-freshness wording to be unambiguous.** No migration/RLS/grant/RPC/pgTAP change. The original "45 new service tests + 9 + 13 = 67" never reconciled against the reported 93→143 net change (50); the real per-file additions (verified against pre-Slice-F baselines extracted from git HEAD `ae0c9cf`) are `messaging-client.test.mjs` +26, `messaging-client-unconfigured.test.mjs` +2, `messages-route.test.mjs` +9, `conversation-route.test.mjs` +13 — summing to exactly 50. Separately, `ConversationReadEvent` (the pub/sub `ThreadView` uses to tell `ConversationList` a conversation was just confirmed read) carried no user identity, and `ConversationList`'s subscription/memory were not reset on an in-place authenticated-user change (it is not remounted on every auth transition) — since a direct conversation's two members share one `conversation_id`, this could let one user's confirmation wrongly zero a different, later-signed-in user's own genuinely-unread badge for that same conversation. Fixed by adding a server-validated `userId` to the event and re-scoping `ConversationList`'s subscription and confirmed-read memory to the current `authUserId`; proven with 4 new tests in `tests/read-state-lifecycle.test.mjs` (2 of which were confirmed to genuinely fail against the pre-fix code before passing again once restored) plus a spy added to an existing test proving a failed mark-read emits no event. Full JS suite now 147/147 (93 + 26 + 2 + 9 + 13 + 4). List-freshness claims were also reworded in place: the list only ever reflects a fresh count on its own mount/reload/Retry (no polling, no list-scoped Realtime subscription); a mounted thread's confirmed mark-read can additionally clear that one matching badge locally in a still-mounted list via the same event, but nothing in this slice ever live-increments a badge for a newly-arrived message. See `tasks/todo.md` for the full reconciliation and exact test names.

**Slice G (2026-08-30): profile-level block/unblock UI — moderation/reporting remain unbuilt, messaging is still not fully complete.** No migration/RLS/grant change: wraps `public.blocks` and its existing `blocks_owner_read/insert/delete` policies (`20260819120000_social_core.sql`) exactly as shipped. New `BlockButton.tsx` renders on `PublicProfileRoute` alongside the existing Follow/Connect/Message actions — the only place a target's identity is confirmed independently, so this is the only place block/unblock lives; unblock is a direct action (mirrors `FollowButton`'s own toggle), block requires an accessible confirmation dialog first (focus-trap/Escape/focus-restore, mirroring `CommentsDrawer`'s existing modal convention) since it is destructive to messaging capability in both directions. `PublicProfileRoute` owns the caller's own block state (`fetchMyBlockState`, generation-guarded against a stale response for a previous profile) and passes it down to both `BlockButton` and a `MessageButton` gated to `blocked === false` only — never while loading, never while unavailable. Every user-facing string is strictly own-action framed ("You've blocked this person…"); nothing anywhere in this slice can render the reverse direction (whether the target has blocked the caller), because `fetchMyBlockState`/`blockUser`/`unblockUser` structurally cannot query it — `blocks_owner_read` RLS makes that row unreadable to anyone but its own blocker, so there is no query this file could write that would surface it, proven by a dedicated test asserting the module's only block-related exports are these three.

A real defect was found and fixed during review, not merely during initial implementation: `blockUser()` originally used `.upsert(..., { onConflict })`, which PostgREST compiles to `INSERT ... ON CONFLICT DO UPDATE` — a statement that requires UPDATE privilege Postgres refuses to plan without, and `blocks`' own grant (`select, insert, delete` only, no UPDATE) means this failed every time with `permission denied for table blocks`, confirmed by running the exact statement against a live local instance as the `authenticated` role. Fixed to a plain `.insert()` that, on a `23505` unique-violation (the caller already blocks this target), falls back to reading the existing row via `.select()` — which the existing SELECT grant does allow — rather than fabricating a new success; re-verified live afterward, including through the real unmocked service module in-browser, where a second `blockUser()` call against an already-blocked target returned the identical original `createdAt`. `unblockUser()`'s plain `.delete()` needed no such fix and is idempotent by construction (`removed: true`/`false`, never an error either way) — also proven live (two consecutive calls, `true` then `false`).

**Slice G correction (2026-08-30): investigated and disproved a hypothesized RLS gap in the fresh-thread block banner; hardened `fetchConversationCounterpart` against a future non-direct conversation kind; added explicit non-leak/idempotency proofs.** No migration/RLS/grant change. `ThreadView` also shows a read-only "You've blocked this person" banner (disabling the composer) using `fetchConversationCounterpart()` (new: the other member's id for a conversation the caller already belongs to, reading `public.conversation_members`) chained into the same `fetchMyBlockState`. The concern raised on review was that this fresh-mount lookup might be unsafe under the platform's fail-closed RLS discipline once a block exists. Inspecting the exact policies (`20260824090000_direct_messaging_foundation.sql`) shows this is not the case for this schema: `conversation_members_member_read`, `messages_member_read`, and `message_read_state`'s owner-scoped read policy are all conditioned purely on `private.is_conversation_member()` — never on `private.has_blocked()`. Only `messages_member_insert` (sending) is block-gated, via `private.conversation_has_blocked_participant()`. This was re-verified live, not just read from SQL: with an existing conversation/messages between A and B and an active A→B block, a genuinely fresh full-page navigation to A's thread (fetch instrumented before the app's own data effects ran, so no request was missed) returned `conversation_members` GET 200, `messages` GET 200 (prior history intact), `conversations` GET 200, `blocks` GET 200, `rpc/get_unread_message_counts` POST 200, `rpc/mark_conversation_read` POST 200, and the Realtime channel reached SUBSCRIBED ("Live updates on") — zero RLS rejections on the read side, banner and composer-disable both rendering correctly. `fetchConversationCounterpart` and the thread banner are therefore retained, not removed.

Two hardenings were still made to `fetchConversationCounterpart` per that review: it no longer `.limit(1)`s its query — `public.conversation_kind` is a single-value enum (`'direct'` only) today, but its own comment explicitly anticipates a future non-direct kind, so a second matching row is now a thrown contract failure (never an arbitrary pick that would mis-identify the "other" participant of some future multi-member conversation), and a malformed single row (missing/non-UUID `user_id`) is likewise now a thrown contract failure rather than being silently coerced to the same `null` reserved for a genuine "no counterpart" outcome. Four new unit tests pin the function's privacy contract explicitly: a non-member's RLS-filtered empty result reads as `null`, never an error or a guess; a resolvable counterpart is returned regardless of any block between the two members (the function is not conditioned on `public.blocks` at all — it only ever reveals identity the caller already legitimately knows from having that conversation open); the new multi-row rejection; and the new malformed-row rejection. `tests/messaging-client.test.mjs` 89 → 93 (+4); full JS suite 201 → 205 (+4), reconciling exactly against the 147-test pre-Slice-G baseline (147 + 14 block-button + 38 messaging-client + 4 messaging-client-unconfigured + 2 conversation-route = 205). pgTAP unchanged 235/235; lint/build/server-build clean. QA accounts created for both the initial pass and this correction (4 total) were all deleted via cascade afterward; `public.blocks` and `auth.users` (for the `*@test.local` fixtures) both confirmed empty. Moderation queue, reporting, mute, and notifications remain entirely unbuilt — see `tasks/todo.md` for the exact remaining scope.

**Slice H (2026-08-30): secure user/message reporting database foundation only — schema, submission functions, and pgTAP coverage; no reporting UI, moderation dashboard, notifications, or automatic enforcement.** New additive migration `supabase/migrations/20260830105617_reporting_foundation.sql` (created via the pinned `supabase@2.115.0` CLI's `migration new`, not a hand-invented filename). No existing migration, table, policy, grant, or column is modified.

**Slice I (2026-08-30): profile and direct-message reporting submission UI, built entirely on Slice H's two merged RPCs — no migration/RLS/RPC/pgTAP change of any kind.** New `src/social/services/reportingClient.ts` (typed `submitProfileReport`/`submitMessageReport`, mirroring messagingClient.ts's own auth/UUID/safe-error conventions exactly) and `src/social/components/ReportDialog.tsx` (one reusable, accessible dialog reused for both targets, its focus-trap/Escape/focus-restore contract copied from BlockButton.tsx's own precedent). Wired into `PublicProfileRoute.tsx` ("Report profile", coexisting with Message/Block, never gated on block state, never shown to guests or on one's own profile) and `ThreadView.tsx` ("Report message" per confirmed message from the other participant only, bound solely to `message.id`). Full JS suite 205 → **275/275** (+70); pgTAP unchanged 356/356. Live-verified against a real local Supabase instance with disposable QA accounts (all cleaned up afterward): a real RPC round trip, exact receipt shape, live duplicate-pending idempotency, self-report/own-message/non-member rejections via direct RPC calls bypassing the UI, reporter/reported/unrelated/moderator RLS visibility, no automatic block/deletion/role-change side effects, and real-browser keyboard (Tab-wrap, Escape-restore-focus) and mobile-viewport behavior. No moderator dashboard, report history, status mutations, or notifications exist yet — see `tasks/todo.md` for the exact scope and arithmetic.

**Slice I.1 (2026-08-30): two Copilot-flagged fixes in `ReportDialog.tsx` only — a stranded-focus bug after confirmed success, and a native `maxLength` conflicting with the trimmed-length validation contract.** No RPC/service/database change. JS suite 275 → **281/281** (+6); pgTAP unchanged 356/356. See `tasks/todo.md` for the exact fixes and test arithmetic.

**Slice J (2026-08-30): secure moderator report review workflow and dashboard — the smallest end-to-end capability for a moderator to discover the queue, inspect minimum evidence, and explicitly resolve or dismiss a pending report, every decision permanently attributed. Explicitly excludes automatic enforcement.** New additive migration adds exactly three nullable columns to `public.reports` (`reviewed_at`, `reviewed_by_user_id` — RESTRICT, not the reporter/reported FKs' NO ACTION, so a moderator's profile can't be deleted out from under their attributed decisions — and `review_note`), a state-consistency CHECK tying them declaratively to `status`, and a defense-in-depth trigger that freezes a report's original evidence forever and its review columns once finalized. Three new SECURITY DEFINER RPCs: `check_moderator_access()`, `list_moderation_reports()` (keyset-paginated, minimum-evidence-only), and `review_report()` (a single atomic compare-and-swap on `status = 'pending'`, which is the entire concurrency guarantee and also enforces a conflict-of-interest rule rejecting a moderator deciding their own submitted-or-targeted report). Two real bugs were caught live rather than merely in pgTAP — a `SECURITY INVOKER` function that failed under planner inlining once real privileges were checked, and a `RETURNING`/plpgsql-variable name collision — both fixed and re-verified live before being counted as done. New typed `moderationClient.ts` and a `/moderation/reports` route (`ReviewDialog.tsx`/`ModerationRoute.tsx`), discoverable only via a `ProfileRoute` link gated on a confirmed moderator check. A genuine architectural bug (the review dialog's success view being unmountable before a user ever saw it, caught by the mounted test suite) was fixed by deferring the parent's queue update to the dialog's own Close click — the same "defer until acknowledged" discipline Slice I.1 already established. Full JS suite 281 → **354/354** (+73); pgTAP 356 → **439/439** (+83). Live-verified end-to-end in a real browser against four disposable QA accounts, including the conflict-of-interest rejection and immediate post-revocation denial in the same authenticated session (no re-login needed); all QA data deleted afterward. See `tasks/todo.md` for the exact schema, RPC signatures, client API, UI/state design, and full live-verification detail.

**Slice K (2026-08-31): secure manual message moderation enforcement — the smallest coherent enforcement capability, message-only, reversible, and permanently audited, built on a dedicated read-only discovery pass rather than assumed.** Discovery established the exact evidence this design rests on: `public.moderation_status` already existed on `posts`/`comments` (fully RLS-wired, zero write grant to anyone), `messages` had no such column at all, and `direct_messaging_foundation.sql`'s own comment named this exact gap — *"Adding it now would be unusable schema decoration ahead of the report/removal slice that would give it meaning... Revisit when that slice is designed."* `report_target_kind` only supports `profile`/`message` (posts/comments aren't reportable, so enforcing on them would be disconnected from the review pipeline), and account-level warnings/suspensions/bans were found to require a genuinely larger product decision (a new moderator-exclusive, site-wide profile column, or Supabase Auth's separate `banned_until` mechanism) — deliberately not built. New additive migration `20260831151303_moderation_enforcement.sql` adds `messages.moderation_status` (reusing the existing enum — no new type), replaces `messages_member_read` (drop+recreate, not an edit to the historical file) to also require `moderation_status = 'visible'` with **no sender-exception carve-out** — per the approved product decision, hiding removes a message from both conversation members including its own sender — and adds the append-only `moderation_actions` ledger `tasks/plan.md`'s own original Phase-1 Safety-domain table already anticipated but never built. `public.moderate_reported_message(report_id, action, note?)` (SECURITY DEFINER, `hide_message`/`restore_message` only — no profile/post/comment action type exists) mirrors `review_report()`'s exact atomic-compare-and-swap/conflict-of-interest discipline, gated additionally on `target_kind = 'message'` (checked before status) and `status = 'resolved'` — a pending, dismissed, or profile-target report is never enforceable, and enforcement can never skip the review step Slice J already established. A `before update or delete` trigger makes the ledger unconditionally immutable from the moment each row is written — stricter than `reports_immutable_fields`, which only freezes after finalization. `list_moderation_reports()` was replaced (its `RETURNS TABLE` shape changed) to add `message_moderation_status`, so moderator evidence access to a hidden message's exact body remains completely unaffected by hiding it. New `EnforcementDialog.tsx` (structurally identical to `ReviewDialog.tsx`, same deferred-until-Close success pattern) wired into `ModerationRoute.tsx`'s existing resolved-report detail view. Live smoke-testing (the same discipline this session has used throughout) caught zero RPC bugs and one test-writing bug of its own; five `results_eq` catalog-string comparisons hit the identical collation ambiguity Slice J's own `udt_name` check already worked around, fixed the same way. Full JS suite 354 → **385/385** (+31); pgTAP 447 → **527/527** (+80). `supabase db advisors`: zero new WARN/ERROR. `supabase_realtime` re-verified unchanged — confirmed by reading `messagingClient.ts`'s own subscription code (`event: "INSERT"` only), not assumed, so a moderator's `UPDATE` is structurally never delivered to an existing subscriber. See `tasks/todo.md` for the exact schema, RPC signature, client/UI design, and full test arithmetic.

**Slice K correction (2026-09-02): a dedicated pre-staging pass removed a speculative index and verified the `list_moderation_reports()` amendment against 14 explicit conditions — 13 held; the 14th (strict client-side cross-validation of `message_moderation_status` against `targetKind`) was genuinely false and is now fixed.** `messages_moderation_status_hidden_idx` is removed (no proven query plan justified it, and the advisor itself flagged it unused); the deterministic `moderation_actions` history/FK-support indexes are untouched. `parseQueueItem` in `moderationClient.ts` now rejects a message-target row with a null status and a profile-target row with a non-null one — previously it only checked the value's own shape, not its consistency with `targetKind`. Further invariants proven live rather than merely relied upon: a profile-target report is rejected by `moderation_actions_report_message_fk` itself on a raw insert attempt; a rejected compare-and-swap creates no ledger row; `acted_at` is proven equal to the actual inserted row's `created_at`; `TRUNCATE` is confirmed absent from every client grant. pgTAP 80 → **87/87** for the new file (database suite 447 → **534/534**); JS 385 → **387/387**. See `tasks/todo.md` for the full condition-by-condition verification and exact test arithmetic.

*Privileged role — found, not invented.* The task required identifying an already-existing privileged application role authorized to review sensitive reports, explicitly forbidding a new `staff`/`moderator`/`admin` role. `public.staff_role` (`20260818194558_identity_profiles_roles.sql`) already ships a `'moderator'` value, assigned/revoked exclusively through the fully RLS-locked `public.user_roles` table (no client of any kind can read or write it; every change is already audited via the pre-existing `private.role_assignment_audit` trigger), and `public.moderation_status` (`20260819120000_social_core.sql`) already ties the identical word to a content-removal outcome (`'removed_by_moderator'`). New `private.is_active_moderator()` — zero-argument, SECURITY DEFINER, `search_path = ''`, checking exactly `role = 'moderator'::public.staff_role` bound to `auth.uid()` internally (the same no-p_user_id-parameter discipline `private.is_conversation_member()` already established) — is the first thing in the schema that actually reads this pre-existing role; no new role, table, or assignment mechanism was created.

*Vocabulary.* `public.report_category` (spam, harassment, hate_or_abuse, threat_or_violence, sexual_content, impersonation, scam_or_fraud, other — no existing authoritative taxonomy was found elsewhere in the schema, so this is a new, deliberately generic list) and `public.report_target_kind` (profile, message). `public.report_status` ships only three values — `pending` (the sole status a client submission can ever produce), `resolved`, `dismissed` — deliberately no `under_review` intermediate, matching `social_core.sql`'s own explicit "don't add schema decoration ahead of the slice that gives it meaning" discipline (no review-mutation API ships this slice).

*Storage.* One normalized `public.reports` table for both target kinds. `reports_target_shape_consistent` makes an invalid partial-null target tuple impossible; `reports_message_reference_fk` — a single composite FK on `(message_id, conversation_id, reported_user_id)` referencing a new supporting `messages_id_conversation_id_sender_id_key` unique constraint on `(id, conversation_id, sender_id)` — declaratively proves a message report's message exists, belongs to its stored conversation, *and* that the stored `reported_user_id` is the message's real sender, all in one constraint (Postgres's default MATCH SIMPLE means it is inert for profile reports, where those three columns are null by the shape constraint). `reports_details_bounded`/`reports_other_requires_details` enforce the bounded/trimmed/`other`-requires-details rules declaratively. Retention is a deliberate, explained departure from follows/blocks/conversation_members' cascade-from-profiles convention: `reporter_id`/`reported_user_id` (→ `profiles`) and `message_id`/`conversation_id` (→ `messages`/`conversations`) all take NO ACTION on delete — the same rationale `message_read_state_cursor_fk` already established — so report evidence cannot silently vanish if a referenced profile/message/conversation is ever removed by a future slice. No reviewer/reviewed-at/review-notes columns were added — deferred to the moderation-dashboard slice that would actually give them meaning, the identical discipline already applied to `moderation_status` on `messages`.

*Duplicate/idempotency contract.* Two partial unique indexes, not one polymorphic index with a NULL-safety workaround: `reports_profile_active_duplicate_unique` on `(reporter_id, reported_user_id, category) where target_kind = 'profile' and status = 'pending'`, and `reports_message_active_duplicate_unique` on `(reporter_id, message_id, category) where target_kind = 'message' and status = 'pending'` — each index's own predicate already guarantees its indexed columns are never null within its scope (by `reports_target_shape_consistent`), so ordinary UNIQUE semantics are already correct with no `coalesce()`/`NULLS NOT DISTINCT` needed. `submit_profile_report()`/`submit_message_report()` wrap their insert in the identical `begin/exception when unique_violation` pattern `create_direct_conversation()` already established: a repeat call while the original is still `pending` returns the *original* row's receipt (silently ignoring any different `details` text on the repeat), never a second active row, and this is race-safe under genuine concurrency because it is the database's own index, not application logic, that decides the winner. A different category is, by design, a distinct allowed report. Once a status moves off `'pending'`, the row no longer participates in either index, so a genuinely new report becomes insertable again.

*Submission API.* `public.submit_profile_report(reported_user_id uuid, category public.report_category, details text default null)` and `public.submit_message_report(message_id uuid, category public.report_category, details text default null)` — both SECURITY DEFINER (reports grants no client INSERT of any kind), `search_path = ''`, bound to `auth.uid()` with no reporter/status/reviewer parameter of any arity (proven by `hasnt_function` in the test file), `revoke all from public` + `grant execute to authenticated only`. Both return `public.report_receipt` (id, target_kind, category, created_at) — a composite return type, not the full row, so reporter_id/reported_user_id/message_id/conversation_id/details/status can never leak back through the return value regardless of anything else in the function body. `submit_message_report()` derives `conversation_id`/`reported_user_id` (the real sender) entirely server-side from the message row in the same query that checks conversation membership — a nonexistent message and a message in a conversation the caller does not belong to are indistinguishable (identical exception), the same "never confirm or deny" discipline `mark_conversation_read()` already established. Neither function checks `private.has_blocked()` in either direction — reporting is intentionally block-blind, proven live in the test file (a profile report against an already-blocked user succeeds identically). Details validation rejects whitespace-only input outright rather than silently treating it as "not provided" (a genuine gap caught and fixed while writing pgTAP coverage, before this was ever run against real fixtures).

*Reporter/privileged visibility.* `reports_moderator_read` is the only RLS policy on `public.reports` — `using (private.is_active_moderator())` — the same "broad table-level SELECT grant, narrow RLS predicate does the real work" pattern already established for `message_read_state`/`blocks`/`saved_posts`. No insert/update/delete grant or policy exists for any client role at all. No "my reports" reporter-facing read API was added (not required for this slice; `tasks/plan.md`'s original Safety-domain table anticipates one eventually, deferred). Proven live in pgTAP with real role-switched fixtures, not just structurally: the reporter herself, the reported user, and an unrelated third party can each select zero rows from `reports`; an active moderator can select all of them; revoking that moderator's role (`user_roles.revoked_at`) immediately removes access; even the active moderator has no UPDATE/DELETE grant (review mutation deferred).

*Verification.* `supabase/tests/database/reporting.test.sql` — new, focused file, 121 pgTAP assertions (structural: types/table/columns/constraints/both partial indexes' exact predicates/RLS/policies/grants/both new functions' full signature-security-search_path-language-volatility-grant contract/no anon or PUBLIC execute/no hidden reporter-or-status-accepting overload/not in `supabase_realtime`; behavioural: unauthenticated rejected two distinct ways — anon has no grant at all, authenticated-with-no-session hits the internal check — self-report/self-message rejected, nonexistent profile and message targets rejected safely and identically to "inaccessible", non-member rejected the same way, whitespace-only/over-limit/`other`-without-details all rejected, a valid submission's receipt and underlying row both verified with `reporter_id` pinned to the exact `auth.uid()` used, a message report's derived sender/conversation verified against the real message row, block-blindness proven by a successful report against an already-blocked target, distinct-category-is-a-distinct-report proven, exact-duplicate idempotency proven (same id returned, original details preserved, still exactly one row), the concurrency mechanism proven directly via a raw insert against the unrestricted role hitting `unique_violation` — real two-session concurrency cannot run inside one pgTAP transaction, so this is the documented direct proof of the same index the function's own exception handler relies on — the post-resolution "a new report is now allowed" transition proven via direct fixture status manipulation (no mutation API ships this slice), reporter/reported-user/other-reporter/all cannot select, moderator can, revoked moderator cannot, ordinary users cannot UPDATE/DELETE even their own report, and no automatic block/message-deletion/role-change occurs as a side effect of reporting). Full database suite: 235 → **356/356** (+121), from a completely clean `db reset`. Database advisors (`supabase db advisors --local --type all`): zero new security findings; four new INFO-level "unindexed foreign key" performance notes on `reports` (`reported_user_id`, `message_id`, `conversation_id`, and the composite `reports_message_reference_fk`) — a deliberate, documented trade-off (`reporter_id` is already covered by both partial unique indexes; the others would only matter for a moderator-dashboard query this slice does not ship, and the task's own "add only required indexes" instruction was followed rather than speculatively indexing for a future slice). `supabase_realtime` re-inspected after the fresh reset: still exactly `public.messages`, unchanged. `npm run lint`/`npm test` (205/205, unchanged — no JS/TS file touched this slice)/`npm run build`/`npm run build:server` all clean; `bun install --frozen-lockfile` reports no dependency changes. Docker Desktop was never restarted — only `supabase db reset` (which restarts the already-running Postgres/Auth/Realtime containers internally, not the Desktop application) was used, twice, and containers were confirmed healthy after each. No reporting UI, moderation dashboard, notifications, mute, or automatic enforcement exist yet; review-mutation is deferred to the moderation-dashboard slice. Messaging and moderation/safety remain not fully complete — see `tasks/todo.md` for the exact remaining scope.

### Phase 5 — SMC hubs

Consolidate Materials, Design Studio, Quote Request, Project, Technical, and Site & Installation one hub at a time. Existing useful components are adapted, not bulk-deleted. Complete the pricing purge before these routes become production-visible.

### Phase 6 — Catalogue/enquiry commerce

Add approved catalogue, sample, reservation-enquiry flows. Payments, live stock, and transactional checkout remain disabled until separately designed, approved, and verified.

### Phase 7 — UX/accessibility/performance

Complete responsive/safe-area states, focus and screen-reader behaviour, reduced motion, image/video optimisation, route splitting, telemetry consent, and device/browser matrix.

### Phase 8 — Verification/security

Run unit, integration, E2E, pgTAP/RLS, upload abuse, IDOR, stored-XSS, authorization, dependency, and production build checks. Record evidence and unresolved risks.

### Phases 9–10 — Native/store readiness

Only after web/social stability: Capacitor native projects, deep links/OAuth, secure storage, camera/media permissions, push, icons/splash/privacy manifests, Android release build, macOS/Xcode build/signing, and store disclosures.

## Verification gates

Every implementation checkpoint runs applicable `npm run lint`, `npm run build`, `npm run build:server`, focused tests, dependency/security checks, and Supabase advisors/RLS tests. Native phases additionally require Capacitor sync and native builds. Failures are reported, never hidden.

## Owner decisions required before Phase 2

1. Supabase dev/staging/production project ownership and region; whether an existing project must be inspected.
2. Final production domains and Capacitor deep-link scheme/bundle identifiers.
3. Which OAuth providers are commercially/legally ready (Apple, Google, Facebook) and who owns their developer accounts.
4. SMC staff role model and named approvers; professional profile status must not imply staff access.
5. Authoritative material, technical-property, stock, certification, origin, and pricing data owners.
6. Public-content default and project visibility choices (`private` recommended for new projects).
7. UK legal counsel review owner for Terms, Privacy, Community Guidelines, retention, DSAR, and deletion.
8. Moderation staffing/escalation policy and minimum age/audience policy.
9. Figma team/project or approval to create the Phase 2 UX validation file in Drafts.
10. PostHog organization/project, consent model, data residency, retention, and approved event taxonomy.

## Major risks

| Risk | Impact | Mitigation |
|---|---|---|
| Mega-component extraction causes regressions | High | Feature flag, vertical routes, characterization tests, checkpoint each hub |
| RLS mistake exposes private data | Critical | Deny-by-default policies, pgTAP role matrix, advisors, adversarial tests |
| Existing fake prices/content leak into production | Critical | Automated price/content inventory and production visibility gate |
| UGC creates abuse/store-review exposure | High | Report/block/mute at first public release, moderation SLA and guidelines |
| OAuth works on web but fails in native shells | High | Redirect contract early; real-device tests before native release |
| Media uploads enable malware/XSS/privacy leaks | High | Quarantine, signature checks, limits, safe rendering, private buckets |
| Design rewrite disrupts working tools | Medium | Preserve tool logic behind contextual hubs; migrate one slice at a time |

## Approval gate

Phase 2 must not start until the owner reviews this plan, answers or explicitly defers the decisions above, and approves the proposed navigation, schema boundary, and consolidation map.
