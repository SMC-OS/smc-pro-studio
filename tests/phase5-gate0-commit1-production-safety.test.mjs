import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression coverage for Phase 5 Gate 0, Commit 1: the production-safety
// mechanism that makes the safe social shell the unconditional default and
// makes the legacy `App` (which carries the fabricated content Commit 2
// purges) reachable only via an explicit, development-only opt-in that
// production cannot be tricked into honouring.
//
// This file is intentionally narrow and stable — it tests the *mechanism*
// (main.tsx + social/flags.ts + .env.example), not the content of any
// individual purged file. Content-fabrication regression coverage lives in
// tests/phase5-gate0-commit2-content-purge.test.mjs so each commit's tests
// can be read and run independently of the other.

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("main.tsx renders the social shell by default, legacy App only behind LEGACY_APP_OPT_IN", async () => {
  const main = await read("src/main.tsx");
  assert.match(main, /import SocialApp from '\.\/social\/SocialApp\.tsx'/);
  assert.match(main, /import\s*\{\s*LEGACY_APP_OPT_IN\s*\}\s*from '\.\/social\/flags\.ts'/);
  assert.match(main, /\{LEGACY_APP_OPT_IN \? <App \/> : <SocialApp \/>\}/);
});

test("legacy app flag requires an explicit VITE_LEGACY_APP_OPT_IN=true opt-in", async () => {
  const flags = await read("src/social/flags.ts");
  assert.match(
    flags,
    /LEGACY_APP_OPT_IN: boolean =\s*\n\s*!import\.meta\.env\.PROD && \(import\.meta\.env\.VITE_LEGACY_APP_OPT_IN as string \| undefined\) === "true"/
  );
  // Must be a strict equality check against "true", not a truthy/generic cast.
  assert.doesNotMatch(flags, /Boolean\(import\.meta\.env\.VITE_LEGACY_APP_OPT_IN\)/);

  const env = await read(".env.example");
  assert.match(env, /VITE_LEGACY_APP_OPT_IN="false"/);
});

test("production build cannot be tricked into rendering the legacy app", async () => {
  const flags = await read("src/social/flags.ts");
  // The PROD gate must be the leading, unconditional term of the &&
  // expression so a misconfigured VITE_LEGACY_APP_OPT_IN cannot defeat it.
  assert.match(flags, /!import\.meta\.env\.PROD && \(import\.meta\.env\.VITE_LEGACY_APP_OPT_IN/);
});
