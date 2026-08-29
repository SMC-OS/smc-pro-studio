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
