# Native foundation (Phase M1)

Capacitor 8 shell for Android and iOS around the existing web app. No product
scope changes; the web UI is unchanged apart from safe-area handling.

| | |
|---|---|
| App / bundle ID | `com.smcprostudio.app` (Android `applicationId` + `namespace`; iOS `PRODUCT_BUNDLE_IDENTIFIER`) |
| Name | SMC Pro Studio |
| Web build | `dist/` (Vite) copied into the native projects by `cap sync`; no `server.url` |
| Capacitor | core, cli, android, ios 8.5.2 |
| Plugins | `@capacitor/app` 8.1.1, `@capacitor/network` 8.0.1, `@capacitor/splash-screen` 8.0.2, `@capacitor/keyboard` 8.0.5, `@aparajita/capacitor-secure-storage` 8.0.1 |
| Android | minSdk 24, target/compile 36, AGP 8.13, Gradle 8.14.3, JDK 21 |
| iOS | iOS 15+, Swift Package Manager (no CocoaPods) |

## Commands

| Script | Does |
|---|---|
| `bun run build:native` | web build + `cap sync` (both platforms) |
| `bun run build:android` / `build:ios` | web build + sync one platform |
| `bun run open:android` / `open:ios` | open Android Studio / Xcode (iOS needs macOS) |
| `bun run native:assets` | regenerate icons and launch assets from `public/favicon.svg` (needs Python + Pillow) |

Copied web assets and generated configs (`android/app/src/main/assets/public`,
`ios/App/App/public`, `capacitor.config.json`) are git-ignored. The only
committed environment file is `.env.staging`, which holds public values only.

**Building for device QA** uses the staging environment:
`bun run build:android:staging` (see `docs/environments.md`). A build without
backend configuration fails closed ("setup required"). Never use production
for QA.

## Session storage (one abstraction: `src/services/authStorage.ts`)

| Platform | Store |
|---|---|
| Web | `sessionStorage` (unchanged) |
| iOS | Keychain, `afterFirstUnlockThisDeviceOnly`, no iCloud sync, never restored onto another device |
| Android | AES-256-GCM; key generated in and held by the Android Keystore; ciphertext in app-private storage, excluded from backup/device transfer |

Holds both the Supabase session and the PKCE code verifier (so links still
complete after the OS reclaims the app). Read failures return "nothing
stored" and never delete; write failures are swallowed; nothing is logged.
Network loss never clears the session (supabase-js only removes it when the
server rejects the refresh token).

**Why `@aparajita/capacitor-secure-storage` 8.0.1:** major-aligned with
Capacitor 8, actively released (Sept 2026), MIT. Modern crypto: Android
AES-GCM with Keystore-generated keys (the alternative
`capacitor-secure-storage-plugin` uses RSA/ECB/PKCS1 padding). iOS
accessibility classes include `…ThisDeviceOnly`. Its JS imports only
`@capacitor/core`; it declares other `@capacitor/*` packages as dependencies
(loose packaging), but they resolve to the project's single exact copies
(verified in `bun.lock`).

## Auth deep links (one handler: `src/social/native/authDeepLinks.ts`)

| Link | Opens | Used by |
|---|---|---|
| `smcprostudio://auth/callback` | `/auth/callback` | email verification, OAuth sign-in |
| `smcprostudio://auth/reset-password` | `/auth/reset-password` | password recovery |

These are exactly what `getAuthRedirectUrl()` sends to Supabase on native.
Every other scheme, host, path, credentials or port is ignored. The code
exchange is shared with the web redirect path (`src/services/authRedirect.ts`),
and `/auth/callback` now exists on the web too (it previously fell through to
"Page not found").

**Supabase redirect allow-list:** the local `supabase/config.toml` now includes
both native URLs and the web reset URL. For hosted projects, add
`smcprostudio://auth/callback` and `smcprostudio://auth/reset-password` to
Auth → URL Configuration → Redirect URLs for staging and production.

### Verified links: signing/domain prerequisites (not done, not claimed)

Custom schemes can be claimed by another app; PKCE makes an intercepted code
useless, but verified links are stronger. They need values that do not exist
yet and must not be invented:

| Platform | Needs | Then |
|---|---|---|
| Android App Links | release signing certificate SHA-256 (Play App Signing) | publish `https://smcprostudio.app/.well-known/assetlinks.json`; add an `autoVerify` https intent filter |
| iOS Universal Links | Apple Developer Team ID | publish `https://smcprostudio.app/.well-known/apple-app-site-association`; add the Associated Domains entitlement `applinks:smcprostudio.app` |

## Android hardware back (`src/social/native/hardwareBack.ts`)

Open modal → Escape (each dialog's own close rules apply, e.g. no close while
submitting) → history back → minimise at the root (never terminates). Nothing
is registered on iOS.

## Network (`src/social/services/networkStatus.ts`)

One source per platform: `window` online/offline on the web, the official
`@capacitor/network` plugin on native (Android WebView events are not
reliable). Banner text and behaviour are unchanged from V1-7. No mutation
queue.

## Look: icons, launch screen, system bars

- Icons are generated from the approved vector mark (`public/favicon.svg`)
  with no upscaling. Android uses an adaptive icon (vector foreground inside
  the 66dp safe zone, charcoal background, Android 13 monochrome) plus legacy
  PNGs. iOS uses a 1024px opaque RGB icon (no alpha).
- The launch screen is `#FBF9F5` with the tile centred at a restrained size:
  - Android 12+: system splash API;
  - older Android: a backport;
  - iOS: `LaunchScreen.storyboard` with an explicit colour, never black in
    dark mode.
- The app hides the launch screen after its first paint. The post-launch
  Android theme is light-only, with a `#FBF9F5` window background, so no
  black or white flash.
- System bars: dark content on the light shell (core `SystemBars`).
  Safe-area insets reach CSS through `env()` and Capacitor's injected
  `--safe-area-inset-*`:
  - the sticky header and an opaque status-bar strip respect the top inset;
  - the bottom nav and drawer respect the bottom inset;
  - centred dialogs stay within the safe region.
  - Covered by `scripts/qa/m1-native-layout-browser.mjs`.

## Permissions (final, merged)

`INTERNET`, `ACCESS_NETWORK_STATE` (both install-time "normal") and AndroidX's
app-internal signature permission. No camera, microphone, contacts, location,
photos or notifications. iOS: no usage-description keys (none needed).

## Platform security review

**Android**
- Cleartext traffic, mixed content and WebView debugging are all off.
- `allowBackup=false`, `fullBackupContent=false`, and `dataExtractionRules`
  exclude everything.
- Only `MainActivity` is exported.
- The FileProvider is non-exported and narrowed to `Pictures/` in app-private
  external files. The template exposed the external-storage root.
- No Google Services or Firebase hook.

**iOS**
- No ATS exceptions or arbitrary loads.
- One URL scheme (`smcprostudio`).
- No entitlements file yet (Associated Domains is pending, see above).
- No Team ID.
- `CAPACITOR_DEBUG` is set only in the Debug configuration.

**Both**
- Logging off (`loggingBehavior: none`).
- No secrets, URLs or keys are committed. CI's APK verifier enforces the
  manifest and packaged-config rules.

## Validation status

| Item | Status |
|---|---|
| Android project generation + sync | done (Capacitor CLI) |
| Android debug build | CI: `.github/workflows/native-android.yml` (Gradle/Android SDK are unreachable from the development container) |
| iOS project generation + sync | done on Linux (SPM, no CocoaPods needed) |
| Xcode validation / iOS build | **environment-blocked:** needs macOS + Xcode (or a macOS CI runner, which is billed at a higher rate) |

## Physical-device QA checklist (next phase)

- Sign in and kill the app, then reopen: still signed in. Restart the device,
  unlock, open: still signed in.
- Airplane mode: the banner shows, nothing claims success, and turning
  airplane mode off shows "back online". Sign-out never happens because of
  connectivity.
- Email verification and password-reset links open the app (staging redirect
  URLs configured) and complete. An expired link shows the error screen.
- Android back:
  - closes dialogs;
  - steps back through screens;
  - minimises at Home.
- Notch, Dynamic Island, gesture bar, keyboard over the message composer,
  landscape.
- Launch: no black or white flash in light or dark mode, and the icon looks
  right on the home screen (adaptive and themed icons on Android).
