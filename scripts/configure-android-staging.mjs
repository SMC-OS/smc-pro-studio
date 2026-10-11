import { readFile, writeFile } from "node:fs/promises";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");

const marker = "<!-- SMC_PRO_STUDIO_VERIFIED_LINKS -->";
if (!manifest.includes(marker)) {
  const filters = `
        ${marker}
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="smcprostudio" android:host="auth" android:pathPrefix="/callback" />
            <data android:scheme="smcprostudio" android:host="auth-callback" />
        </intent-filter>

        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/auth/callback" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/projects" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/quotes" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/property-record" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/studio" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/payments/return" />
            <data android:scheme="https" android:host="smcprostudio.app" android:pathPrefix="/profile" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/auth/callback" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/projects" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/quotes" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/property-record" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/studio" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/payments/return" />
            <data android:scheme="https" android:host="staging.smcprostudio.app" android:pathPrefix="/profile" />
        </intent-filter>
`;

  const activityClose = manifest.indexOf("</activity>");
  if (activityClose < 0) throw new Error("Android MainActivity closing tag not found.");
  manifest = manifest.slice(0, activityClose) + filters + manifest.slice(activityClose);
}

if (!manifest.includes('android:launchMode="singleTask"')) {
  manifest = manifest.replace(
    /(<activity\b[^>]*android:name="\.MainActivity"[^>]*)(>)/,
    '$1 android:launchMode="singleTask"$2',
  );
}

await writeFile(manifestPath, manifest);

const buildGradlePath = "android/app/build.gradle";
let gradle = await readFile(buildGradlePath, "utf8");
if (!gradle.includes("applicationId \"app.smcprostudio\"")) {
  throw new Error("Generated Android applicationId is not the canonical app.smcprostudio.");
}
if (!gradle.includes("versionCode 1")) {
  gradle = gradle.replace(/versionCode\s+\d+/, "versionCode 1");
}
if (!gradle.includes('versionName "1.0.0"')) {
  gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "1.0.0"');
}
await writeFile(buildGradlePath, gradle);

console.log("Android staging package, version and verified App Links configured.");
