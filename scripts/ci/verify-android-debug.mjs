#!/usr/bin/env node
// Verifies the built Android debug APK (CI, after `gradlew assembleDebug`).
// Inputs are produced from the APK by the Android SDK's aapt2 and unzip:
//   node scripts/ci/verify-android-debug.mjs badging.txt manifest.txt capacitor.config.json
// Fails (exit 1) unless every check passes; prints a summary either way.
import { readFileSync } from "node:fs";

const [badgingPath, manifestPath, configPath] = process.argv.slice(2);
const badging = readFileSync(badgingPath, "utf8");
const manifest = readFileSync(manifestPath, "utf8");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

// --- Identity ---------------------------------------------------------------
const pkg = /package: name='([^']+)'/.exec(badging)?.[1];
check("package / application ID is com.smcprostudio.app", pkg === "com.smcprostudio.app", pkg);
const label = /application-label:'([^']*)'/.exec(badging)?.[1];
check("app label is SMC Pro Studio", label === "SMC Pro Studio", label);
check("launcher icon present", /application-icon-\d+:'[^']+'/.test(badging) || /application: label='[^']*' icon='[^']+'/.test(badging));
check("launchable activity is MainActivity", /launchable-activity: name='com\.smcprostudio\.app\.MainActivity'/.test(badging));

// --- Permissions: least privilege -------------------------------------------
const permissions = [...badging.matchAll(/uses-permission: name='([^']+)'/g)].map((m) => m[1]).sort();
const allowed = new Set([
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  // Signature-level, app-internal: added by androidx.core for non-exported receivers.
  "com.smcprostudio.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION",
]);
const unexpected = permissions.filter((p) => !allowed.has(p));
check("only INTERNET + ACCESS_NETWORK_STATE (+ androidx internal signature permission)", unexpected.length === 0, `unexpected: ${unexpected.join(", ") || "none"}`);
const dangerous = /CAMERA|RECORD_AUDIO|CONTACTS|LOCATION|READ_MEDIA|EXTERNAL_STORAGE|READ_PHONE|SMS|CALENDAR|BODY_SENSORS|BLUETOOTH|POST_NOTIFICATIONS/;
check("no dangerous permissions", !permissions.some((p) => dangerous.test(p)));

// --- Manifest security --------------------------------------------------------
// aapt2 xmltree prints booleans as `=false` / `=true` or `(type 0x12)0x0` / `0xffffffff`.
const attr = (name) => new RegExp(`:${name}\\(0x[0-9a-f]+\\)=(\\S+)`).exec(manifest)?.[1];
const isFalse = (v) => v === "false" || /^\(type 0x12\)0x0$/.test(v ?? "");
check("allowBackup=false", isFalse(attr("allowBackup")), attr("allowBackup"));
check("usesCleartextTraffic=false", isFalse(attr("usesCleartextTraffic")), attr("usesCleartextTraffic"));
check("dataExtractionRules set (no cloud backup / device transfer)", attr("dataExtractionRules") !== undefined, attr("dataExtractionRules"));

// Deep link: scheme smcprostudio, host auth, the two allow-listed paths only.
check("deep-link scheme smcprostudio", /:scheme\(0x[0-9a-f]+\)="smcprostudio"/.test(manifest));
check("deep-link host auth", /:host\(0x[0-9a-f]+\)="auth"/.test(manifest));
const paths = [...manifest.matchAll(/:path\(0x[0-9a-f]+\)="([^"]+)"/g)].map((m) => m[1]).sort();
check("deep-link paths are exactly /callback and /reset-password", JSON.stringify(paths) === JSON.stringify(["/callback", "/reset-password"]), paths.join(", "));

// Exported components: only the launcher activity.
const exportedTrue = [...manifest.matchAll(/E: (activity|activity-alias|service|receiver|provider)[\s\S]*?(?=\n\s+E: (?:activity|activity-alias|service|receiver|provider|application)|\n?$)/g)]
  .map((m) => m[0])
  .filter((block) => /:exported\(0x[0-9a-f]+\)=(true|\(type 0x12\)0xffffffff)/.test(block))
  .map((block) => /:name\(0x[0-9a-f]+\)="([^"]+)"/.exec(block)?.[1]);
check("only MainActivity is exported", JSON.stringify(exportedTrue) === JSON.stringify(["com.smcprostudio.app.MainActivity"]), exportedTrue.join(", "));

// --- Packaged Capacitor config: production-safe ------------------------------
check("no server.url (never a dev/remote server)", !config.server?.url);
check("no cleartext", config.server?.cleartext !== true);
check("androidScheme https", config.server?.androidScheme === "https");
check("WebView debugging off", config.android?.webContentsDebuggingEnabled === false);
check("mixed content off", config.android?.allowMixedContent === false);
check("native logging off", config.loggingBehavior === "none");
check("splash/system surfaces use #FBF9F5", config.backgroundColor === "#FBF9F5" && config.plugins?.SplashScreen?.backgroundColor === "#FBF9F5");

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
console.log(`\npermissions: ${permissions.join(", ")}`);
console.log(`${results.length - failed.length}/${results.length} APK checks passed`);
process.exit(failed.length ? 1 : 0);
