# Environments (Phase M2)

| | development | staging | production |
|---|---|---|---|
| Purpose | local work | physical-device QA | real users (not launched) |
| Supabase | local stack (`127.0.0.1:54321`) | `smc-pro-studio-staging`, ref `qezixxtknqbijnudvhal`, eu-west-2, staging-only data | not created yet |
| Client config | `.env.local` (git-ignored) | `.env.staging` (committed, public values only) | supplied by CI at release time (never committed) |
| Build | `bun run dev` | `bun run build:staging` / `build:android:staging` | `bun run build` |
| `smc-app-env` meta | `development` | `staging` | `production` |

**Device QA uses staging only. Never use production as a test environment.**

## What the client bundle may contain

Only values designed to be public:

- the Supabase project URL;
- the project's **publishable** key (`sb_publishable_…`), which grants nothing
  by itself; RLS and explicit grants protect the data (`docs/database-grants.md`);
- feature flags.

**Never** in a `VITE_*` variable or a committed file:

- the secret / service-role key;
- database passwords or connection strings;
- Stripe secret keys;
- signing keys;
- any production value in a staging file.

Server-only variables (`SUPABASE_SECRET_KEY`, …) have no `VITE_` prefix, so
Vite cannot inline them.

`.env.staging` explicitly sets every other client variable to empty or off. A
developer's `.env.local` (lower priority in Vite) therefore can't leak local
URLs into a staging build. `tests/environment-config.test.mjs` pins the allowed
keys and rejects secret-shaped values.

## Verification: `scripts/check-client-bundle.mjs`

This check runs automatically after every staging build, in both CI Android
workflows, and against the web assets extracted from the staging APK.

| Every target | Staging additionally |
|---|---|
| no `sb_secret_`, no `service_role` JWT, no `SUPABASE_SECRET_KEY` name, no Stripe secret/restricted key, no private-key block | the staging URL is present, and no other `*.supabase.co` host is (production absent) |
| no Google Fonts request | only the staging publishable key |
| no plain-HTTP localhost / 127.0.0.1 URL, except two exact library constants (react-router's URL base, gotrue-js's unused default) | `smc-app-env` = `staging` |

The `unconfigured` target is the fail-closed CI build: no backend at all.

## Staging Android build (debug, physical-device QA only)

```
bun install --frozen-lockfile
bun run build:android:staging           # build --mode staging → bundle check → cap sync android
cd android && ./gradlew assembleDebug   # JDK 21 + Android SDK 36
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

- CI: `.github/workflows/native-android-staging.yml` runs on pushes to
  `phase-m2-**` and on manual dispatch.
- It uploads the artifact `smc-pro-studio-STAGING-debug-apk` (kept 14 days).
- The APK is signed with the runner's throwaway debug key. It uses the same
  application ID (`com.smcprostudio.app`) as the future release, so uninstall
  it before installing a Play build.
- There is no release keystore and no release build.

## Staging auth redirect allow-list

- **Site URL:** `smcprostudio://auth/callback`. There is no hosted staging web
  origin yet; a placeholder would point emails at nothing.
- **Redirect URLs:**
  - `smcprostudio://auth/callback`
  - `smcprostudio://auth/reset-password`
  - `http://127.0.0.1:5173/auth/callback`
  - `http://127.0.0.1:5173/auth/reset-password`

  The last two allow local web testing against staging with
  `vite --mode staging`.
- No production URLs. When a hosted staging web origin exists, add its
  `/auth/callback` and `/auth/reset-password` and remove the localhost entries.

## Fonts

Inter (body/UI) and Fraunces (editorial headings) are self-hosted:

- **Files:** `src/fonts.css` and `src/assets/fonts/*`. They are the upstream
  variable WOFF2 files, Latin and Latin Extended subsets, SIL OFL 1.1, with
  licence text alongside.
- **Requests removed:** the Google Fonts stylesheet and font requests. Offline
  first launch renders with the real fonts (`scripts/qa/m2-fonts-offline-browser.mjs`).
- **Removed entirely:** Playfair Display, which was requested but unused.
- **Legacy app only:** Material Symbols is used only by the development-only
  legacy app, which still loads it from Google. Production and staging bundles
  never contain it.
- **Size:** +254 KB of font files in the bundle/APK. A typical page reads only
  the Latin files (~113 KB), and the JS bundle is unchanged.
