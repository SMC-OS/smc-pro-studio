# SMC Pro Studio — Launch Roadmap (authoritative)

**This file is the single source of truth for launch sequencing, V1 scope and release gates.**
`tasks/plan.md` (architecture/IA history) and `tasks/todo.md` (per-slice engineering record) remain the detailed historical record; where they disagree with this file about *what ships in V1 and in what order*, this file wins.

Last verified: 2026-10-01 · Verified against: `main` @ `f222cc3`, plus the unmerged feature branches listed below.

---

## 1. Current state (verified 2026-10-01)

| Fact | Evidence |
|---|---|
| `main` = `origin/main` = `f222cc3` (PR #24, Materials Slice B) | `git log`, `git branch -a -vv` |
| Owner's working copy `C:\SMC PRO VISION APP\smc-pro-studio-audit` on branch `phase-5-slice-c-materials-catalogue-imagery` @ `f222cc3` | 161 files show as modified but differ **only in CRLF line endings**; the only real uncommitted work was 4 untracked Slice C files (recovered — see below) |
| Unmerged branches on `origin` | `docs/claude-project-memory` (docs only) · `phase-5-db-hardening-revoke-anon-rpc-execute` → `phase-5-slice-c-materials-catalogue-imagery` → `v1-1-profile-editing-onboarding` → `v1-2-settings-account-deletion` → `phase-h-ci-gates` (each stacked on the previous; merge in that order) |
| No hosted Supabase project for SMC Pro Studio exists | `.env.local` points at `127.0.0.1:54321`; the only project on the connected Supabase account (`grycfqndntzsexzoxkeu`) is unrelated and INACTIVE |
| No staging or production environment, no web deployment | No hosting config in the repo; nothing deployed |
| No native projects | `capacitor.config.ts` exists (`com.smcprostudio.app`); `android/` and `ios/` do not |

### Gates run on 2026-10-01

| Gate | Result |
|---|---|
| `npm run lint` (tsc) | ✅ |
| `npm test` (Node **24.18**, as CI) | ✅ 609/609 on the Slice C branch (571/571 on `main`) — **fails on Node 22** (26 files; `mock.module` behaviour), so the Node version must be pinned |
| pgTAP (`supabase/tests/database`) | ✅ 741/741 on the Slice C branch — **26 assertions failed on `main`** against a platform-faithful stack; fixed by the hardening branch |
| `npm run test:integration` (real backend, no mocks) | ✅ 21/21 (×3 runs) |
| Browser QA, real backend | Slice E 21/22 (missing `favicon.ico`) · Slice C 9/10 (`/api/auth/session` 404 — Express API not running in QA) |
| `npm run build` / `build:server` | ✅ (main chunk > 500 kB warning) |
| Bundle fabricated-content scan | ✅ 0 matches |
| `git diff --check` | ✅ |
| CI (`.github/workflows/quality.yml`) | lint + unit + build only — **no DB tests, no integration, no server build** |

**Local backend note.** Docker image registries are unreachable from the cloud workspace used on 2026-10-01, so the DB/integration gates ran on a local stack assembled from official releases: Postgres **16.13** + `supabase/postgres` init scripts and migrations, Supabase Auth v2.195.0, Storage API v1.69.11, PostgREST v16.1, and a minimal `/rest|/auth|/storage` gateway. Production runs Postgres **17**. The owner's Docker Desktop route (`npx supabase@2.115.0 start` / `test db`) remains the canonical local stack and should be re-run to confirm.

---

## 2. Defects found and fixed during the 2026-10-01 audit

| # | Severity | Defect | Fix | Branch |
|---|---|---|---|---|
| D1 | High (defence in depth) | 15 signed-in-only RPCs (most `SECURITY DEFINER`) were executable by `anon` on a default Supabase project — platform default privileges grant `anon` EXECUTE directly; `revoke … from public` does not remove it (Supabase advisor lint 0028). 26 existing pgTAP assertions failed. | Migration `20261001015000_revoke_anon_execute_on_signed_in_rpcs.sql` + guard test `rpc_execute_grants.test.sql` (only `search_public_professionals` may be anon-callable) | hardening |
| D2 | Medium | Slice C: replaced/removed material images were never deleted — Storage API deletes with `DELETE … RETURNING`, and the bucket had no SELECT policy, so `remove()` silently returned `[]` | Editor-only SELECT policy `storage_materials_media_editor_read` | slice-c |
| D3 | Medium | Slice C image RPCs had the same anon EXECUTE gap as D1 | revoke from `public, anon` in the Slice C migration | slice-c |

## 3. Open defects / risks (not yet fixed)

| # | Severity | Issue | Plan |
|---|---|---|---|
| R1 | ~~Launch blocker~~ **Fixed on branch `v1-1-profile-editing-onboarding`** | **Nothing in the app ever sets `profiles.onboarding_completed = true`, and there is no profile-editing UI** (company name, service area, bio, visibility). `search_public_professionals` requires `onboarding_completed`, so **in production the Network would always be empty**. The Slice E real-backend gate passed only because fixtures set the flag directly. | V1-1 below |
| R2 | **Partly fixed** — request/cancel UI on branch `v1-2-settings-account-deletion`; **processing still open** | No in-app account deletion in the shipped shell — only in the dev-only legacy `AccountView`. The deletion request table has no processing/completion workflow. | V1-2 |
| R3 | **Launch blocker** (UK GDPR, both stores) | Signup asks users to accept the Terms of Use and Privacy Notice, but neither is reachable in the shipped shell (the components exist only in the legacy app) and both still need final UK legal review. | V1-3 + owner/legal |
| R4 | Medium (trust) | Any user can self-select the professional category **"SMC Team"** at signup and is then labelled "SMC Team" on Network and profiles. No staff access is granted, but the label invites impersonation. | Owner decision O3 |
| R5 | Medium | `avatars` / `public-media` buckets have the same missing-SELECT-policy pattern as D2: owner deletes would silently no-op. No UI uses them yet. | Fix with the first avatar/media upload slice |
| R6 | ~~Medium~~ **Fixed on branch `v1-2-settings-account-deletion`** | The shell calls the Express API (`/api/auth/session`) on every session read (fails safe to "no roles"). A packaged mobile app needs a deployed API URL, or this call removed from the social shell. | V1-4 |
| R7 | Low | Missing favicon / app icons; splash background `#0a0a0a` contradicts the bright design direction. | Phase M |
| R8 | ~~Low~~ **Fixed on branch `v1-2-settings-account-deletion`** | Network tabs "Projects / Architecture / Interiors / Applications" render "arrive in a later slice" placeholders. | Hide in V1 (V1-5) |
| R9 | Low | Main JS chunk > 500 kB; routes not code-split. | Phase H |
| R12 | **High** (blocks deletion processing) | Deleting a user's `auth.users` row will fail for anyone who has filed a report or acted as a moderator: `reports.reporter_id`/`reported_user_id` and `moderation_actions.moderator_id` reference `profiles` without `ON DELETE CASCADE/SET NULL` (`moderation_actions` is explicitly `RESTRICT`). The completion design must decide what happens to safety records (anonymise vs. retain) — legal input needed. | O4 → dedicated migration |
| R10 | ~~Low~~ Addressed on branch `phase-h-ci-gates` (unverified in Actions) | Unit tests require Node ≥ 24 but `package.json` had no `engines`; CI omitted DB tests and the server build. | Phase H |

---

## 4. V1 scope matrix (proposed — requires owner sign-off, O1)

Status key: **COMPLETE** = real, tested, shippable · **NEEDS FIX** = in V1, not shippable yet · **DEFERRED** = not in V1, must not appear functional · **LEGACY** = old `App` code, dev-only, not shipped.

| Area | Status | Notes |
|---|---|---|
| Email sign-up / sign-in / sign-out / reset / session restore | COMPLETE | OTP UI present; min 8 chars |
| Google / Apple / Facebook sign-in | DEFERRED | Fail-closed; no SMC credentials configured. **Apple Guideline 4.8:** if any third-party login ships on iOS, Sign in with Apple must too |
| Onboarding (account type, category) | COMPLETE on branch | Completion recorded when a professional adds profession + service area (V1-1) |
| Own profile view | COMPLETE | |
| Profile editing (name, username, bio, visibility, profession, company, service area, services, website) | COMPLETE on branch | `/profile/edit` (V1-1); SMC Team not self-selectable in the editor |
| Avatar upload | DEFERRED | Bucket exists; no UI; R5 first |
| Public professional profiles | COMPLETE | |
| Home feed (text posts, General/Portfolio) | COMPLETE | Media attachments DEFERRED |
| Follow / Connect / comments / reactions / saves | COMPLETE | |
| Network professional search & filters | COMPLETE | Real-backend gate closed 2026-10-01 — but useless until R1 is fixed |
| Materials catalogue (public read, staff publishing, imagery) | COMPLETE on branch | Slice C pending merge |
| Direct messaging (+ Realtime, unread, read state) | COMPLETE | |
| Block / report / moderation queue / enforcement / history | COMPLETE | Guidelines interim pending legal review |
| Community Guidelines page | COMPLETE (interim) | Legal review open |
| Terms / Privacy pages in shipped shell | NEEDS FIX | R3 |
| Account deletion — in-app request / cancel | COMPLETE on branch | Settings → Delete account (V1-2) |
| Account deletion — processing to completion | NEEDS FIX | Staff/server step not built; blocked by R12 and O4 |
| Settings / privacy controls screen | COMPLETE on branch (legal links pending V1-3) | `/settings`: email, edit profile & visibility, guidelines, support, sign out, delete account |
| Support / contact | NEEDS FIX | In-app mailto to smcprostudio@outlook.com (O9); stores also need a public support **URL** (web page) |
| Notifications (push / in-app) | DEFERRED | Do not request push permission in V1 |
| Projects (collaboration workspace) | DEFERRED | Not built; no schema. Messages occupies nav tab 4 in V1 |
| Quote Request / Review Required | DEFERRED | Legacy instant quote retired |
| Design Studio, AR/measure, shop, slabs, payments (Stripe), Gemini chat, WhatsApp/CNC stubs | LEGACY | Dev-only behind `VITE_LEGACY_APP_OPT_IN`; demo-gated server endpoints |
| Stories | DEFERRED | De-emphasised |
| Error / empty / loading states | COMPLETE | Consistent `StateViews` |
| Offline / network-loss | NEEDS FIX | Errors are safe, but there is no offline banner or retry-on-reconnect; verify on device |

---

## 5. Launch sequence

Each phase ends with the gates in §6. Steps marked ⛔ stop for owner approval.

### Phase 1 — Close current development (in progress)
- [x] Recover the uncommitted Slice C files from the owner's PC.
- [x] Slice E real-backend gate (`search_public_professionals`) — 12/12 integration + browser QA.
- [x] D1 hardening (anon EXECUTE) — branch pushed.
- [x] Slice C imagery completed + verified — branch pushed.
- [ ] ⛔ Owner reviews/merges the hardening branch, then the Slice C branch (stacked; merge in that order).

### Phase 2 — V1 completion (freeze scope at O1)
- [x] **V1-1** Profile editing + onboarding completion (R1) — branch `v1-1-profile-editing-onboarding`: unit 14 + route 9 + real-backend 6 + browser 8/8: edit display name, bio, visibility; professionals add company name, service area, services, website; "complete profile" marks `onboarding_completed`. Real-backend test: a newly signed-up professional becomes discoverable only after completing their profile.
- [~] **V1-2** Account deletion (R2) — in-app request/cancel done on branch `v1-2-settings-account-deletion` (unit/mounted 7, real-backend 5, browser 9/9). Remaining: a server-side processing path (Edge Function or staff runbook) that completes the deletion within a stated period, after R12 is resolved. ⛔ Owner sets the retention period and the handling of safety records (O4).
- [ ] **V1-3** Terms, Privacy Notice and Support routes in the shell, linked from signup, Settings and the store listings (R3). ⛔ Legal text is owner/legal-supplied.
- [x] **V1-4** Social shell no longer calls `/api/auth/session` (R6) — branch `v1-2-settings-account-deletion`.
- [x] **V1-5** Placeholder Network tabs hidden (R8) — same branch.
- [x] **V1-6** Settings screen — same branch (legal links to add with V1-3).
- [ ] **V1-7** Offline banner + retry-on-reconnect.

### Phase H — Production hardening
- [~] CI: `database` job (`supabase test db` + `test:integration` + advisors), `build:server` and bundle scan added, Node pinned via `.nvmrc`/`engines` — branch `phase-h-ci-gates`. **Not yet observed running on GitHub Actions**: verify on the first PR.
- [ ] Re-run the Supabase advisors (`db advisors --local`) after D1/D2; resolve WARNs.
- [ ] Fix R5 storage SELECT policies before any avatar/media UI.
- [ ] `npm audit` triage; route-level code splitting (R9).
- [ ] Security review of Express `server.ts`: the demo-gated endpoints must stay disabled in production (`ENABLE_DEMO_FEATURES` unset); consider removing them from the production build.

### Phase M — Mobile (Capacitor 8 — continue the existing shell, no rewrite)
- [ ] `npx cap add android` / `npx cap add ios`; appId `com.smcprostudio.app` (⛔ O2 confirms the ID — it is permanent once published).
- [ ] Icons, adaptive icon, splash (bright palette), status/nav bar, safe areas, keyboard, hardware back.
- [ ] Deep link `smcprostudio://auth/callback` (already allowed in `supabase/config.toml`) + Android App Links / iOS Universal Links for password reset.
- [ ] Secure token storage: today the native path keeps the session **in memory only** (sign-in lost on app restart) — replace with Keychain/Keystore-backed storage.
- [ ] iOS `PrivacyInfo.xcprivacy`; Android network security config (HTTPS only).
- [ ] Release signing structure (keystore never committed); `.aab` build.
- [ ] Device QA at 360×640 and 430×932.

### Phase S — Staging
- [ ] ⛔ Owner creates the staging and production Supabase projects (paid/billing decision) and a web host if web launch is wanted.
- [ ] Apply migrations to staging; run advisors; full smoke on staging only.

### Phase L — Legal and store compliance
- [ ] Privacy Policy, Terms (UK), Data Safety (Google), App Privacy (Apple), age rating, screenshots, store copy, reviewer notes + test account.

### Phase R — Release candidates
- [ ] Android RC (`.aab`), installed and smoke-tested against staging. ⛔ No Play Console upload without approval.
- [ ] iOS RC: requires macOS + Xcode (or a macOS CI runner) for archive/signing. ⛔ No App Store Connect submission without approval.

---

## 6. Release gates (all must be green, none weakened)

`npm run lint` · `npm test` (Node 24) · `supabase test db` · `npm run test:integration` (local stack) · `npm run build` · `npm run build:server` · bundle fabricated-content scan · `git diff --check` · Supabase advisors (no new WARN) · browser QA at 375 px and 1280 px · Android build · device smoke.

## 7. Owner decisions required

| # | Decision | Recommendation |
|---|---|---|
| O1 | Freeze V1 = professional network + messaging + materials catalogue + safety; Projects and Quote Request become V1.1 | **Yes.** Projects has no schema and is the largest remaining build; shipping a coherent network first is the faster route to a store-approved app |
| O2 | Confirm the permanent app ID `com.smcprostudio.app` and the store name "SMC Pro Studio" | Confirm before `cap add` |
| O3 | Remove "SMC Team" from self-selectable categories (staff-assigned only) | **Yes** — prevents impersonation |
| O4 | Account-deletion completion period and any data-retention exceptions | Needs your legal input (UK GDPR: "without undue delay", normally within one month) |
| O5 | Deploy the Express API for V1, or drop it from the mobile/social shell | **Drop** for V1; nothing in V1 needs it |
| O6 | Create staging and production Supabase projects (billing) | Required before Phase S |
| O7 | Legal sign-off on Terms, Privacy Notice and Community Guidelines | Required before any public release |
| O8 | Merge the stacked branches in order: hardening → Slice C → V1-1 → V1-2 → CI gates | Ready for review |
| O9 | Confirm `smcprostudio@outlook.com` as the public support contact (already the published safety contact), and provide a public support web page URL for the store listings | Use a domain address (e.g. support@…) before launch for trust |
