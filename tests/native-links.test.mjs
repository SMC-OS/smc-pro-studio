import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { routeFromNativeUrl } from "../src/services/nativeLinks.ts";

test("canonical native package remains app.smcprostudio", async () => {
  const config = await readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8");
  assert.match(config, /appId:\s*['"]app\.smcprostudio['"]/);
  assert.doesNotMatch(config, /com\.smcprostudio\.app/);
});

test("verified HTTPS App Links map only approved SMC Pro Studio hosts and routes", () => {
  assert.equal(
    routeFromNativeUrl("https://staging.smcprostudio.app/payments/return?payment_id=abc&session_id=cs_test"),
    "/payments/return?payment_id=abc&session_id=cs_test",
  );
  assert.equal(
    routeFromNativeUrl("https://smcprostudio.app/projects/123"),
    "/projects/123",
  );
  assert.equal(routeFromNativeUrl("https://example.com/payments/return?payment_id=abc"), null);
  assert.equal(routeFromNativeUrl("https://staging.smcprostudio.app/admin"), null);
});

test("custom auth callback compatibility stays narrow", () => {
  assert.equal(
    routeFromNativeUrl("smcprostudio://auth/callback?code=abc"),
    "/auth/callback?code=abc",
  );
  assert.equal(
    routeFromNativeUrl("smcprostudio://auth-callback?code=abc"),
    "/auth/callback?code=abc",
  );
  assert.equal(
    routeFromNativeUrl("smcprostudio://auth/reset-password?code=recovery-code"),
    "/auth/reset-password?code=recovery-code",
  );
  assert.equal(routeFromNativeUrl("smcprostudio://projects/123"), null);
});

test("Android generation script includes payment return on both verified domains", async () => {
  const source = await readFile(new URL("../scripts/configure-android-staging.mjs", import.meta.url), "utf8");
  assert.match(source, /android:host="smcprostudio\.app" android:pathPrefix="\/payments\/return"/);
  assert.match(source, /android:host="staging\.smcprostudio\.app" android:pathPrefix="\/payments\/return"/);
  assert.match(source, /android:launchMode="singleTask"/);
  assert.match(source, /android:scheme="smcprostudio" android:host="auth" android:pathPrefix="\/reset-password"/);
  assert.match(source, /android:host="smcprostudio\.app" android:pathPrefix="\/auth\/reset-password"/);
  assert.match(source, /android:host="staging\.smcprostudio\.app" android:pathPrefix="\/auth\/reset-password"/);
});
