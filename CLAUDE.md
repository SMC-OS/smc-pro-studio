# SMC Pro Studio — Claude Code project memory

Shared portfolio rules (Git, deployment, secrets, evidence order) are imported
below. This file covers **SMC Pro Studio only**. It is not GeoCore: GeoCore
(`SMC-OS/SMC-OS`) is a separate FastAPI/Next.js/Railway product, and none of
its architecture applies here.

@AI-PROJECT-CONTEXT.md

Also read these existing, authoritative files before substantial work:

- `AGENTS.md`: owner's working rules. It includes the **hard pricing rule** and
  the security foundation that must never be weakened.
- `DESIGN.md`: product and UX direction (professional-network pivot,
  2026-08-19).
- `tasks/plan.md`: architecture, schema/RLS matrix, consolidation map, phase
  plan.
- `tasks/todo.md`: the phase checklist and the detailed per-slice execution
  record. This is the historical source of truth for what shipped.
- `docs/data-processing-inventory.md`: data inventory for legal review.

Stable sections (1–10) change rarely. Volatile facts live only in **CURRENT
CHECKPOINT** and **WHERE TO RESUME** at the bottom.

---

## 1. Product identity

- **What it is:** a professional network and project-collaboration platform
  for the built environment, branded for Simo Marble & Construction. It is
  closer to LinkedIn plus CompanyCam than to a consumer social app
  (`DESIGN.md`).
- **Users:** customers and homeowners, plus professionals: architects,
  interior designers, stone professionals, fabricators, installers,
  suppliers, contractors, developers. SMC staff hold server-assigned roles.
- **Journey:** Discover → Network → Connect → Project → Deliver. The SMC
  service journey (Design → Quote → Survey → Fabrication → Installation)
  nests inside Project → Deliver.
- **Navigation:** Home · Network · Create · Projects · Profile. Messages is
  reached contextually.
- **Relationship model:** Follow (one-way) ≠ Connect (request/accept) ≠
  Collaborate (project membership/roles). Never conflate them.
- **Hard rules** (`AGENTS.md`):
  - Never show a monetary amount, stock level, certification, review,
    follower count or similar unless it comes from an authoritative,
    approved source. Otherwise use "Request Quote" or "Price on Application".
  - A production feature must genuinely work, fail safely, stay disabled, or
    clearly say that setup is required.
- **Origins:** began as a Google AI Studio app (`README.md` and
  `metadata.json` are the unmodified AI Studio templates). The large legacy
  `src/App.tsx` is that original app. See PRODUCT GENERATIONS below.

## PRODUCT GENERATIONS

This repository contains more than one generation of SMC Pro Studio. The
product you find in the source code is **not** automatically the product
that is current. Evidence below is from the repository and its Git history
(66 commits, first commit `4384a4f` on 2026-08-19, audited 2026-09-26).

### Generation 1 — pre-Git / imported foundation

- Work existed before this repository's first commit. It is referenced in
  `tasks/plan.md` as a local checkpoint:
  `C:\SMC PRO VISION APP\smc-pro-studio-20260818-social-phase1.zip`
- **Its contents are not available in this environment and have not been
  verified.** Do not describe what it contains.
- The first commit, `4384a4f` "Checkpoint after Phase 2 Supabase
  foundation", imported the application as it stood on 2026-08-19.

### Generation 2 — legacy AI Studio application (LEGACY/DISABLED)

Still present in this repository, and not deleted. It includes legacy code
for:

- quotes / instant estimator: `src/components/OnlineQuoteHub.tsx`,
  `QuoteSummary.tsx`, quote logic in `src/App.tsx`, `FinanceCalculatorModal.tsx`
- projects: `ProjectCommandView.tsx`, `ProjectTimelineVisualizer.tsx`,
  `ProjectVelocityChart.tsx`, `ProjectPdfModal.tsx`
- address/postcode flow: `src/App.tsx`, `BookAppointmentModal.tsx`,
  `AccountView.tsx`, `GuestWelcomeScreen.tsx` and others
- Stripe payment UI: `StripePaymentGateway.tsx`, plus demo-gated
  `/api/stripe/*` routes in `server.ts`
- related older customer-workflow components: `CrmPipelineView.tsx`,
  `UnifiedCustomerInbox.tsx`, and the rest of `src/components/`

These components are **not the authoritative current production product.**

- Phase 5 Gate 0 (`992da5a`, `82a83de`, 2026-09-11) made the new
  application the unconditional production default.
- The legacy `App` renders only in a non-production build with
  `VITE_LEGACY_APP_OPT_IN=true` (`src/social/flags.ts`).
- Gate 0 also purged the legacy app's fabricated pricing and content.
- The legacy server integrations are demo-gated and return 503 in
  production.
- `tasks/plan.md` "Consolidation map" records the intended destination of
  each legacy feature.

### Generation 3 — current product direction (CURRENT)

A professional-network and materials product, verified from the present
codebase in `src/social/` and `supabase/migrations/`:

- Supabase Auth with email/password (OAuth wired but fail-closed)
- profiles and account types
- follow and connect
- professional network search
- activity feed, posts, comments and reactions
- direct messaging with realtime delivery, read state and blocking
- reporting, moderation review, enforcement and moderation history
- interim Community Guidelines
- materials catalogue (public read, plus staff draft/publish/archive)

Module-level states are in §4.

### Rule: establish a feature's state before treating it as active

When you discover a feature in the source code, establish whether it is:

- **CURRENT**: reachable in the production build and backed by real data
  or services
- **LEGACY/DISABLED**: present but excluded from production (for example,
  the Generation 2 components above)
- **PARTIAL**: partly built; open items recorded in `tasks/todo.md`
- **PLANNED**: described in `tasks/plan.md` / `DESIGN.md`, not built

Establish this **before** describing the feature as product functionality,
building on it or reporting it to the owner. Do not delete or rewrite
legacy code without an approved consolidation step.

## UNLOCATED PRODUCT WORK

The following expected SMC Pro Studio items have **not been found** in this
repository's Git history, in any other repository accessible to the
2026-09-26 audit session, or in the history of GeoCore (`SMC-OS/SMC-OS`):

- waitlist
- founding-member / "founding member" launch work
- dedicated launch pages
- any separate current implementation of those features

Their state is **unknown**. They may exist outside this repository or
outside the Git history accessible to that session.

- **Do not recreate them merely because they are missing here.** Recovery
  must be attempted first, per `AI-PROJECT-CONTEXT.md` §8.
- Do not invent their state.
- Record the location and state here once the owner identifies them.

## 2. Architecture (verified in the repository)

| Layer | Implementation |
|---|---|
| Frontend | React 19 + Vite 6 + Tailwind v4 + React Router 7. Entry `src/main.tsx` renders `SocialApp` (`src/social/`). The legacy `App` renders only when `VITE_LEGACY_APP_OPT_IN=true` **and** it is a non-production build (production forces it off). |
| Backend API | Express (`server.ts` plus `server/security.ts`). Security headers, controlled CORS (`ALLOWED_ORIGINS`), 64 kB JSON limit, rate limits, fail-closed `requireAuth` (verifies the Supabase JWT server-side), `requireRole`, schema validation, safe error handler. Only `/api/system/health` is public. |
| Legacy demo endpoints | Gemini chat, WhatsApp, telemetry, inventory, QR verification, beta, Stripe payment intent, DSAR. All sit behind `requireDemoMode`: **503 in production** and unless `ENABLE_DEMO_FEATURES=true`. They are not live features. |
| Database | Supabase Postgres. Migrations in `supabase/migrations`. pgTAP tests in `supabase/tests/database`. Supabase CLI pinned to `supabase@2.115.0`. Local `project_id` is `smc-pro-studio-audit`. |
| Auth | Supabase Auth. Email/password (min 8 chars), OTP UI. Google, Apple and Facebook OAuth are wired but **fail closed** (`VITE_SUPABASE_OAUTH_*_ENABLED=false`) with no SMC-owned credentials configured yet. The web session lives in `sessionStorage`; native persistence is disabled. |
| Authorisation | RLS on every exposed table. Staff roles in `public.user_roles` use the `staff_role` enum (`user`, `smc_staff`, `moderator`, `catalogue_editor`, `project_manager`, `admin`, `owner`) and are written only by trusted paths. Privileged writes go through `SECURITY DEFINER` RPCs that re-check `auth.uid()` and the role. A profession or account type never grants a role. |
| Realtime | Supabase Realtime for direct messages (membership-gated). |
| Storage | Supabase Storage buckets `avatars`, `public-media` (public) and `private-user-media` (private), from `20260818194625_storage_foundations.sql`. Upload flows are not wired into the social app yet. |
| AI | Gemini (`@google/genai`), server-side only (`GEMINI_API_KEY`), legacy/demo-gated. |
| Payments | Stripe SDKs are installed. Payment endpoints are demo-gated and disabled in production. **No real payments or subscriptions exist.** |
| Analytics / monitoring | **None.** PostHog is deliberately deferred pending a consent and event-taxonomy decision. No Sentry. |
| Mobile | Capacitor 8 config only (`capacitor.config.ts`, appId `com.smcprostudio.app`). **No `android/` or `ios/` projects exist yet.** |
| Hosting | **Not determined from the repository.** No deployment config (Dockerfile, Railway, Vercel, Cloud Run) is committed. `.env.example` mentions AI Studio / Cloud Run injection for `APP_URL`. There is no evidence of a hosted Supabase project. |

Environment-variable **names**: see `.env.example`. Server-only secrets
(`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`) must never get a
`VITE_` prefix.

## 3. Repository structure

| Path | Contents |
|---|---|
| `src/social/` | **The current product.** `SocialApp.tsx` (routes), `routes/` (Home, Network, Create, Messages, Conversation, Profile, PublicProfile, Connections, MaterialDetail, CatalogueManagement, Moderation, CommunityGuidelines, Auth, ResetPassword, dev-only previews), `components/`, `services/` (typed Supabase clients: `socialClient`, `messagingClient`, `reportingClient`, `moderationClient`, `materialsClient`, `readStateEvents`, `useAuthSession`), `flags.ts`, `tokens.css` |
| `src/App.tsx`, `src/components/` | Legacy AI Studio app and its ~55 components. Disabled in production. Being consolidated hub by hub (plan "Consolidation map"). |
| `src/services/` | `supabaseClient.ts`, `authClient.ts`, `apiClient.ts`, `offlineStorage.ts` |
| `server.ts`, `server/security.ts` | Express API and security middleware |
| `supabase/` | `config.toml`, `migrations/` (15 files, 2026-08-18 → 2026-09-12), `tests/database/` (pgTAP) |
| `tests/` | `node:test` + jsdom client, route and service tests (`*.test.mjs`) |
| `scripts/scan-bundle-for-fabricated-content.mjs` | Static scan guarding the pricing/content rule |
| `tasks/`, `docs/`, `AGENTS.md`, `DESIGN.md` | Planning and execution record |
| `.github/workflows/quality.yml` | CI: `bun install --frozen-lockfile` → `bun run lint` → `bun run test` → `bun run build` (Node 24.18, Bun 1.3.14) |

## 4. Main modules and state

States: IMPLEMENTED · PARTIAL · BLOCKED · PLANNED · DEPRECATED

| Module | State | Notes |
|---|---|---|
| Identity, profiles, account types, staff roles | IMPLEMENTED | Local Supabase. Role assignment is server-only and audited. |
| Email auth (sign-up/in, verify, reset, sign-out, session restore) | IMPLEMENTED | |
| OAuth (Google/Apple/Facebook) | BLOCKED | Needs SMC-owned provider credentials; fails closed. |
| Account deletion | PARTIAL | Request plus sign-out work. The lock/retention/anonymisation worker does not exist. |
| Professional network (Home feed, Network search, profiles, follow, connect, posts, comments, reactions, saves, stories) | IMPLEMENTED / PARTIAL | Foundation built. Company pages, "Looking For…" posts and project invitations are design-only. |
| Direct messaging (list, thread, realtime, read state, unread badges, block) | IMPLEMENTED | Member removal/leave does not exist. No project conversations. |
| Reporting, moderation review, enforcement, moderation history | IMPLEMENTED | Moderator-only via RPCs. Append-only ledger. |
| Community Guidelines | IMPLEMENTED (interim) | Pending final UK legal review. |
| Notifications, mute, appeals | PLANNED | |
| Materials catalogue (Slice A: public read; Slice B: staff draft/publish/archive) | IMPLEMENTED | No images, search, pagination, slabs, collections or saved materials. The table is intentionally empty in every environment (no seed). |
| Materials hub (rest), Design Studio, Technical hub, Site & Installation hub, Account → Profile/Settings | PLANNED | Phase 5 consolidation. Not started. |
| **Projects** (membership, roles, evidence) | PLANNED | No `projects` schema exists yet. The Projects tab is a placeholder. The Generation 2 project components are LEGACY/DISABLED. |
| **Quotes / quote requests** | PLANNED | Planned as "Quote Request / Review Required" with server-only pricing. The Generation 2 quote/estimator UI is LEGACY/DISABLED in production. |
| **Customer / client portal** | PLANNED | Not present as a distinct module. The customer experience is the network plus the planned Projects. |
| **Waitlist / founding-member / launch pages** | UNLOCATED | Not found in accessible Git history. Do not recreate; see UNLOCATED PRODUCT WORK. |
| **Admin** | PARTIAL | Staff tools exist only for moderation (`/moderation/reports`) and catalogue editing (`/catalogue`). There is no general admin console. |
| **Marketing / public site** | NOT PRESENT | Public guest routes (Home/Network/profiles/materials/guidelines) exist inside the app. There is no separate marketing site. |
| Payments / Stripe | LEGACY/DISABLED (demo-only) | Generation 2 UI plus demo-gated routes. Blocked until an approved pricing and payments phase. |
| Analytics (PostHog) | PLANNED | Needs consent, retention and taxonomy approval. |
| Native apps (Android/iOS) | PLANNED | Phases 9–10. |

## 5. Database

- **Technology:** Supabase Postgres. All exposed tables have RLS. Private
  helpers live in schema `private`.
- **Migrations:** Supabase CLI.
  - Create with `npx --yes supabase@2.115.0 migration new <name>`.
  - Migrations are additive. **Never edit an already-merged migration file.**
    Fix forward with a new migration.
- **Conventions** (`tasks/plan.md` "RLS policy matrix"):
  - explicit `TO anon`/`TO authenticated`
  - `(select auth.uid())`
  - ownership predicates, not role-only policies
  - `security_invoker` views
  - no authorisation from `user_metadata`
  - `SECURITY DEFINER` RPCs with an empty `search_path`, `authenticated`-only
    `EXECUTE`, no `anon`/`PUBLIC` grants
  - indexes on policy columns
- **Verification:**
  - `npx --yes supabase@2.115.0 start`
  - `npx --yes supabase@2.115.0 db reset` (**local only**)
  - `npm run test:db` (pgTAP)
  - `npx --yes supabase@2.115.0 db advisors --local --type all --level info`
- **Environments:** only a **local** Supabase stack is evidenced. The plan
  lists "dev/staging/production project ownership and region" as an open
  owner decision.
  - The connected Supabase account contains one project, "SMC-OS's
    Project" (created 2026-08-12, eu-west-1). It was `INACTIVE` at the
    2026-09-26 audit. **Its relationship to this repository has not been
    established.**
  - **Do not link, push to or create a hosted Supabase project without
    owner approval.** Never run `db reset` or `db push` against a
  hosted project.

## 6. Authentication and authorisation

- The client uses only the publishable key. The server verifies the bearer
  token with Supabase (`requireAuth`) and reads roles from `user_roles`
  (`requireRole`). Both fail closed.
- Guests: public content only. Interactions require auth.
- Private data (messages, reports, private profiles/saves) is protected by
  RLS plus membership. Blocks override follow, connect and message.
- Moderators and catalogue editors act only through audited RPCs. No client
  table write grants exist on moderated or catalogue tables.

## 7. Payments / subscriptions

None live. Stripe code is legacy and demo-gated. No RevenueCat, no
subscriptions, no webhooks. Any payments work needs a separate, approved
phase with authoritative UK pricing (`AGENTS.md`).

## 8. Testing and quality gates

```sh
bun install --frozen-lockfile
bun run lint            # tsc --noEmit
bun run test            # node:test + jsdom; REQUIRES Node >= 24 (CI uses 24.18)
bun run build           # vite build
bun run build:server    # esbuild server bundle
npm run test:db         # pgTAP; needs local Supabase (Docker) running
node scripts/scan-bundle-for-fabricated-content.mjs   # after build: scans dist/ for purged fabricated content
```

- Tests use `mock.module`. On Node 22, 26 test files fail with "does not
  provide an export named …". That is an environment mismatch, not a code
  failure. Use Node 24.
- No E2E suite and no mobile tests exist.
- **Before calling a slice "done":** lint, test, build, build:server, pgTAP
  on a fresh local `db reset`, advisors unchanged or improved, and an updated
  `tasks/todo.md` entry with honest test arithmetic. Stop at the owner's
  approval checkpoint between phases (`AGENTS.md`).

## 9. Deployment

- **There is no verified deployment.** No hosting config, no staging or
  production environment, and no hosted Supabase project are evidenced in
  the repository.
- Before any deployment work, the owner must decide:
  - Supabase projects (dev/staging/prod) and region
  - web and API hosting, and production domains
  - the OAuth providers
- Deployment work must follow `AI-PROJECT-CONTEXT.md` §5.
- The web app and the Express API deploy separately (`VITE_API_BASE_URL`
  points at the API; required for Capacitor builds).
- Migration sequence once hosted environments exist:
  1. apply to staging (`supabase db push` against the linked staging
     project, with approval)
  2. run advisors and pgTAP-equivalent checks
  3. deploy the app to staging and verify
  4. owner approval
  5. production

## 10. Project-specific safety rules

- Never weaken fail-closed auth, server-controlled roles, RLS, CORS, rate
  limits, safe errors, secret isolation, or the production legacy-app kill
  switch.
- Never add seed or demo rows that could reach a real environment. Never
  fabricate pricing or business facts.
- Never enable `ENABLE_DEMO_FEATURES` or `VITE_LEGACY_APP_OPT_IN` in any
  deployed environment.
- Build in small vertical slices, one PR per slice (the repo's established
  pattern: "Phase N Slice X").
- Revert through a PR, as with PR #16, not a force-push.

---

## CURRENT CHECKPOINT

**Last verified: 2026-09-26** (Git remote, and local lint/test/build in the
audit session.)

- **Branch:** `main` @ `f222cc3` (2026-09-12): merge of PR #24 "Phase 5
  Slice B: secure materials catalogue publishing". There are no other remote
  branches.
- **Latest completed:**
  - Phase 5 Gate 0 (pricing/content purge; production defaults to the social
    shell)
  - Materials Slice A (public catalogue)
  - Materials Slice B (staff publishing RPCs)
- **Phase status:** Phases 2–4 engineering are complete, with the open items
  in `tasks/todo.md`. Phase 5 is in progress (Materials hub partly done).
  Phases 6–10 have not started.
- **Local gates (2026-09-26 audit):** `lint` pass; `build` pass;
  `build:server` pass; `test` **571/571 pass on Node 24.21**; fabricated-content bundle scan pass. pgTAP was not
  run in this audit. The last recorded pgTAP result in `tasks/todo.md`
  (Slice L) was 580/580 plus the Slice A/B additions.
- **Deployment:** none evidenced. **Staging:** none. **Production:** none.
- **Product generations:** Generation 3 is CURRENT and Generation 2 is
  LEGACY/DISABLED (see PRODUCT GENERATIONS). The waitlist, founding-member
  and launch-page work is UNLOCATED (see UNLOCATED PRODUCT WORK).
- **Launch blockers:**
  - owner decisions (Supabase projects, domains, OAuth credentials, staff
    role model, pricing/data owners, PostHog)
  - UK legal review (Terms, Privacy, Community Guidelines, retention)
  - account-deletion worker
  - Projects and Quote Request not built
  - no hosting
  - native projects not created

## WHERE TO RESUME

- **Checkpoint:** `main`@`f222cc3`, Phase 5, after Materials Slice B.
- **Most recently completed:** secure staff catalogue publishing (four
  `SECURITY DEFINER` RPCs, 61 pgTAP assertions).
- **Remains:**
  1. Next Materials slices (imagery/storage, search, pagination) or the next
     hub.
  2. Projects schema (membership/roles) and Quote Request.
  3. Owner decisions listed above.
- **Verify first:** `git fetch && git log origin/main -3`, check for new
  branches/PRs, run the gates on Node 24, and do a local
  `supabase db reset && npm run test:db`.
- **Safest next action:** propose, and get owner approval for, the next
  bounded Phase 5 slice in `tasks/todo.md` before writing code, because
  `AGENTS.md` requires stopping at approval checkpoints.
- **Do NOT change yet:**
  - the Generation 2 legacy code: do not delete or re-enable it without an
    approved consolidation step
  - the unlocated waitlist and founding-member work: do not recreate it
  - any merged migration
  - the production legacy-app kill switch
  - demo gating
  - pricing display rules
  - OAuth enablement flags
  - anything hosted (no hosted Supabase or deployment exists or is approved)
