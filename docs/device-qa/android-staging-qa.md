# Android physical-device QA: STAGING build (Phase M2)

Record every case as **PASS**, **FAIL** (and what happened) or **BLOCKED**
(and why). The gate can only pass on results from a real phone. Emulator or
browser results don't count.

**Build under test:** CI workflow *Native Android (STAGING debug)*, artifact
`smc-pro-studio-STAGING-debug-apk` (`app-debug.apk`). Note the APK's SHA-256
from the run's notice. It talks to the **staging** Supabase project only.

## 0. Before you start

1. **Prepare the phone.** Android 7 (API 24) or newer. Under **Settings →
   Apps → Special access → Install unknown apps**, allow the app you'll open
   the APK from (Files or Chrome).
2. **Download the APK.** On GitHub, open the run, then *Artifacts*, then
   `smc-pro-studio-STAGING-debug-apk`. Unzip it to get `app-debug.apk`.
3. **Install the APK.** Copy it to the phone and tap it. Or, from a computer
   with USB debugging on, run `adb install -r app-debug.apk`.
4. **Prepare test accounts.** Use two email addresses you can open on the
   phone. Staging uses Supabase's built-in email sender, which only delivers
   to members of the Supabase organisation and only a few emails per hour.
   Use the organisation owner's address first. If an email doesn't arrive
   within 5 minutes, mark that case **BLOCKED (email)**, not FAIL.
5. **Logs (optional, best evidence).** Run `adb logcat -c` and reproduce the
   problem. Then run `adb logcat -d > smc-log.txt` and send the file. Never
   share screenshots or logs that show passwords or one-time codes.

## 1. Install and startup

| # | Steps | Expected | Result |
|---|---|---|---|
| 1.1 | Install the APK | Installs. The launcher shows the SMC Pro Studio icon (no white square, no default robot) | |
| 1.2 | Long-press the icon. On Android 13+, turn on themed icons | Adaptive icon masks cleanly. The themed icon shows the mark | |
| 1.3 | Cold launch in light mode | Ivory splash with the tile, then the app. No black or white flash | |
| 1.4 | Cold launch with the system in dark mode | Same light splash and app. Never black | |
| 1.5 | Rotate the device on Home | Layout reflows, nothing is cut off, no horizontal scrolling | |

## 2. Authentication (staging)

| # | Steps | Expected | Result |
|---|---|---|---|
| 2.1 | Profile → Sign in → create a Customer account (password of 8+ characters) | Shows "check your email". No fake success | |
| 2.2 | Open the verification email **on the phone** and tap the link | The SMC Pro Studio app opens (not Chrome) and finishes sign-in | |
| 2.3 | Tap the same link again | "This link is invalid or has expired" screen. The app keeps working | |
| 2.4 | Sign out, then sign in with email and password | Signed in. Profile shows your name | |
| 2.5 | Swipe the app away, then reopen it | Still signed in | |
| 2.6 | Restart the phone, unlock it, open the app | Still signed in | |
| 2.7 | Sign out → "Forgot password" → open the email on the phone → tap the link | The app opens the reset-password screen. The new password works | |
| 2.8 | Enter a wrong password 3 times | A clear error each time. No crash | |
| 2.9 | Create a Professional account (second email) | Professional profile fields appear. No admin or staff abilities | |

## 3. Navigation and Android back

| # | Steps | Expected | Result |
|---|---|---|---|
| 3.1 | Tap Home, Network, Create, Messages and Profile | Each opens. The active tab is highlighted | |
| 3.2 | Open a dialog (e.g. Block on a profile), then press system Back | The dialog closes. The page stays | |
| 3.3 | Go Home → Network → a profile, then press Back twice | Steps back through the screens | |
| 3.4 | On Home, press Back | The app minimises (it doesn't close or restart). Reopening resumes | |

## 4. Layout (notch, gesture bar, keyboard)

| # | Steps | Expected | Result |
|---|---|---|---|
| 4.1 | Scroll a long page | The header stays below the status bar. Nothing tappable sits under the clock or notch | |
| 4.2 | Look at the bottom nav with gesture navigation, then with 3-button navigation | The nav sits above the gesture bar or buttons | |
| 4.3 | Open a conversation and tap the message box | The keyboard doesn't cover the composer. The last message stays visible | |
| 4.4 | Settings → Display size / Font size at the largest setting | Text wraps. Nothing overlaps or is cut off | |

## 5. Network and offline

| # | Steps | Expected | Result |
|---|---|---|---|
| 5.1 | While signed in, turn on Airplane mode | An offline banner appears. Nothing claims success | |
| 5.2 | Try to send a message while offline | Clear failure / "you're offline". The message isn't shown as sent | |
| 5.3 | Turn Airplane mode off | A "back online" notice appears. Content loads again. You're still signed in | |
| 5.4 | Switch between Wi-Fi and mobile data while using the app | No sign-out, no crash, no duplicate actions | |
| 5.5 | Force-stop the app, turn on Airplane mode, launch | The app renders with the correct fonts and an offline state. No blank screen | |

## 6. Social, messaging and materials

| # | Steps | Expected | Result |
|---|---|---|---|
| 6.1 | Network: search for the other test account | It's found. Profile opens | |
| 6.2 | Message the other account. Reply from the second account (on another phone, or after signing out and in) | Messages arrive. The conversation shows as unread until opened | |
| 6.3 | Report a message and report a profile | Confirmation is shown. No duplicate report on a second tap | |
| 6.4 | Block the other account | Messaging between you is blocked. Unblock restores it | |
| 6.5 | Materials catalogue: browse and open a material | Only published staging materials appear (it may be empty). No price, stock, discount or availability is shown anywhere | |

## 7. Account

| # | Steps | Expected | Result |
|---|---|---|---|
| 7.1 | Edit your profile (name, bio) and save | Saved and shown after reopening | |
| 7.2 | Settings → legal pages (Privacy, Terms, Community Guidelines) | They open and are readable | |
| 7.3 | Settings → Delete account → request | Shows the scheduled date and a cancel option | |
| 7.4 | Cancel the deletion | Shows as cancelled. The account works normally | |
| 7.5 | Request deletion again and tell Claude | Claude processes it on **staging only** and confirms the anonymisation and the sign-in removal. Afterwards, signing in with that account fails | |

## 8. Accessibility

| # | Steps | Expected | Result |
|---|---|---|---|
| 8.1 | Turn on TalkBack and move through the bottom nav and Home | Every control has a meaningful label. Focus order makes sense | |
| 8.2 | With TalkBack on, open and close a dialog | Focus moves into the dialog and returns afterwards | |
| 8.3 | Tap targets | Comfortable to hit, about 48 dp | |

## 9. Performance sanity

| # | Steps | Expected | Result |
|---|---|---|---|
| 9.1 | Cold start time (tap the icon until Home is usable) | Under about 3 s on a mid-range phone. Note the phone model | |
| 9.2 | Scroll Home and Network quickly | Smooth. No long freezes | |
| 9.3 | Use the app for 10 minutes | No crash. The phone doesn't get noticeably hot | |

## 10. Deep links (custom scheme only)

| # | Steps | Expected | Result |
|---|---|---|---|
| 10.1 | `adb shell am start -a android.intent.action.VIEW -d "smcprostudio://auth/callback?error=access_denied&error_description=test"` | The app opens to the "link is invalid or has expired" screen | |
| 10.2 | `adb shell am start -a android.intent.action.VIEW -d "smcprostudio://evil/path"` | The app ignores it. Nothing happens beyond opening | |

Verified HTTPS App Links are **not** part of this build and are not claimed.
They need the release signing certificate (see `docs/native-foundation.md`).

**Phone model / Android version:** ______ **APK SHA-256:** ______ **Tester / date:** ______
