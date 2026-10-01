# iOS physical-device QA: STAGING (prepared, not run)

**Status:** not started. No iOS device build exists yet, so no iOS physical QA
has happened and none is claimed.

## What is needed first

| Need | Why | Who |
|---|---|---|
| Apple Developer Program membership (£79/year from Apple; check the current price) and its **Team ID** | Signing for any build that installs on a real iPhone. A Team ID is never invented | Owner |
| A Mac with Xcode 26+ **or** an approved macOS CI runner | iOS builds need Xcode. This Linux workspace can't build them | Owner decision (below) |
| Bundle ID `com.smcprostudio.app` registered in the developer account | Matches the Xcode project | Owner |

## Local Mac or macOS CI runner?

| | Local Mac (recommended for QA) | GitHub macOS runner |
|---|---|---|
| Installs on your iPhone | Yes: Xcode → Run with a free personal team or the paid team | Needs signing certificates and profiles stored as CI secrets, plus TestFlight or ad-hoc distribution |
| Cost | None beyond the developer membership | Billed per minute at the macOS rate on a private repo |
| Effort | `bun run build:staging && npx cap sync ios && npx cap open ios`, then Run | More setup, slower feedback |

**Recommendation:** a local Mac for physical QA. The CI template
`docs/ci-templates/native-ios-staging.yml` only proves the app compiles for the
Simulator, unsigned. It is deliberately **not enabled**. Copying it into
`.github/workflows` needs your approval because it uses paid macOS minutes.

## Matrix

Use `docs/device-qa/android-staging-qa.md` sections 1–9, with these iOS
differences:

| # | Change for iOS |
|---|---|
| 1.2 | No adaptive or themed icon. Check the home-screen icon has no black corners or alpha halo |
| 3.2–3.4 | No hardware Back. Check the in-app back controls and the edge-swipe back gesture instead. The app never quits itself |
| 4.1–4.2 | Check the notch / Dynamic Island and the home indicator in portrait and landscape |
| 4.3 | The keyboard resizes the view (Keyboard plugin `resize: native`). The composer stays visible |
| 8.1–8.2 | Use VoiceOver instead of TalkBack |
| 10 | Test the deep links from Notes or Safari by tapping a `smcprostudio://auth/callback?error=access_denied` link. Universal Links are not configured and not claimed |
| 2.6 | Session survives a restart after first unlock (Keychain `afterFirstUnlockThisDeviceOnly`) |
