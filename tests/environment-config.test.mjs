// Phase M2: environment separation, client-bundle safety and self-hosted fonts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");

function envFile(p) {
  const out = {};
  for (const line of read(p).split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = /^([A-Z0-9_]+)="([^"]*)"$/.exec(line.trim());
    assert.ok(m, `unparseable line in ${p}: ${line}`);
    out[m[1]] = m[2];
  }
  return out;
}

test(".env.staging holds only allow-listed public client keys", () => {
  const env = envFile(".env.staging");
  const allowed = [
    "VITE_APP_ENV",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_APP_URL",
    "VITE_API_BASE_URL",
    "VITE_STRIPE_PUBLISHABLE_KEY",
    "VITE_LEGACY_APP_OPT_IN",
    "VITE_SUPABASE_OAUTH_GOOGLE_ENABLED",
    "VITE_SUPABASE_OAUTH_APPLE_ENABLED",
    "VITE_SUPABASE_OAUTH_FACEBOOK_ENABLED",
  ];
  assert.deepEqual(Object.keys(env).sort(), [...allowed].sort());
  assert.equal(env.VITE_APP_ENV, "staging");
  assert.match(env.VITE_SUPABASE_URL, /^https:\/\/[a-z0-9]{20}\.supabase\.co$/);
  assert.match(env.VITE_SUPABASE_PUBLISHABLE_KEY, /^sb_publishable_[A-Za-z0-9_-]+$/);
  // Values a developer's .env.local could otherwise leak into the build are pinned empty / off.
  assert.equal(env.VITE_APP_URL, "");
  assert.equal(env.VITE_API_BASE_URL, "");
  assert.equal(env.VITE_STRIPE_PUBLISHABLE_KEY, "");
  assert.equal(env.VITE_LEGACY_APP_OPT_IN, "false");
  for (const p of ["GOOGLE", "APPLE", "FACEBOOK"]) assert.equal(env[`VITE_SUPABASE_OAUTH_${p}_ENABLED`], "false");
  const raw = read(".env.staging");
  for (const secret of [/sb_secret_/, /service_role/, /SUPABASE_SECRET_KEY\s*=/, /\b(sk|rk)_(live|test)_/, /PRIVATE KEY/, /postgres(ql)?:\/\//]) {
    assert.doesNotMatch(raw, secret);
  }
});

test("only .env.example and .env.staging are committable env files", () => {
  const gitignore = read(".gitignore");
  assert.match(gitignore, /^\.env\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(gitignore, /^!\.env\.staging$/m);
  assert.doesNotMatch(gitignore, /^!\.env\.(local|production)/m);
});

test("staging build scripts verify the bundle before syncing native projects", () => {
  const { scripts } = JSON.parse(read("package.json"));
  assert.equal(scripts["build:staging"], "vite build --mode staging && node scripts/check-client-bundle.mjs staging");
  assert.equal(scripts["build:android:staging"], "vite build --mode staging && node scripts/check-client-bundle.mjs staging && cap sync android");
});

test("fonts are self-hosted: no Google Fonts request in the shell's HTML or CSS", () => {
  for (const p of ["index.html", "src/index.css", "src/social/tokens.css", "src/fonts.css"]) {
    assert.doesNotMatch(read(p), /fonts\.(googleapis|gstatic)\.com/, p);
  }
  assert.match(read("src/index.css"), /^@import "\.\/fonts\.css";/);
  const fonts = read("src/fonts.css");
  const urls = [...fonts.matchAll(/url\("\.\/([^"]+)"\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 4);
  for (const u of urls) assert.ok(existsSync(join(root, "src", u)), `missing font file ${u}`);
  for (const family of ["inter", "fraunces"]) {
    assert.match(read(`src/assets/fonts/${family}/OFL.txt`), /SIL Open Font License, Version 1\.1/);
  }
  assert.match(fonts, /font-family: "Inter";[\s\S]*font-weight: 300 800;/);
  assert.match(fonts, /font-family: "Fraunces";[\s\S]*font-weight: 400 600;/);
});

test("the only remaining Google Fonts request lives in the dev-only legacy App module", () => {
  // App.tsx is reachable only through main.tsx's PROD-guarded dynamic import
  // (pinned by phase5-gate0-commit1 and scripts/check-bundle-excludes-legacy.mjs),
  // so its icon-font request can never reach a production or staging bundle.
  assert.doesNotMatch(read("src/main.tsx"), /fonts\.(googleapis|gstatic)\.com/);
  assert.match(read("src/App.tsx"), /legacy-material-symbols[\s\S]*fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined/);
});

// --- scripts/check-client-bundle.mjs against fixture bundles ------------------

const STAGING = envFile(".env.staging");

function bundle(files) {
  const dir = mkdtempSync(join(tmpdir(), "smc-bundle-"));
  mkdirSync(join(dir, "assets"));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

function runCheck(target, dir) {
  const r = spawnSync(process.execPath, [join(root, "scripts/check-client-bundle.mjs"), target, dir], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return { status: r.status, out: r.stdout + r.stderr };
}

const html = (env) => `<!doctype html><html><head><meta name="smc-app-env" content="${env}" /></head><body></body></html>`;
const stagingJs = `const u="${STAGING.VITE_SUPABASE_URL}",k="${STAGING.VITE_SUPABASE_PUBLISHABLE_KEY}";const base="http://localhost",gotrue="http://localhost:9999";`;

test("bundle check passes a clean staging bundle", () => {
  const r = runCheck("staging", bundle({ "index.html": html("staging"), "assets/a.js": stagingJs }));
  assert.equal(r.status, 0, r.out);
});

for (const [name, extra, expected] of [
  ["a Supabase secret key", `x="sb_secret_abcdef123456"`, /FAIL no Supabase secret keys/],
  ["a service_role JWT", `x="eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.sig"`, /FAIL no service_role JWTs/],
  ["a leaked local backend URL", `x="http://127.0.0.1:54321"`, /FAIL no plain-HTTP localhost/],
  ["a second (production) Supabase host", `x="https://abcdefghijklmnopqrst.supabase.co"`, /FAIL no other Supabase project host/],
  ["a second publishable key", `x="sb_publishable_someOtherProjectKey"`, /FAIL only the staging publishable key/],
  ["a Google Fonts request", `x="https://fonts.googleapis.com/css2?family=Inter"`, /FAIL no Google Fonts requests/],
]) {
  test(`bundle check rejects ${name}`, () => {
    const r = runCheck("staging", bundle({ "index.html": html("staging"), "assets/a.js": stagingJs + extra }));
    assert.equal(r.status, 1);
    assert.match(r.out, expected);
  });
}

test("bundle check rejects a staging check of a production-stamped bundle", () => {
  const r = runCheck("staging", bundle({ "index.html": html("production"), "assets/a.js": stagingJs }));
  assert.equal(r.status, 1);
  assert.match(r.out, /FAIL index\.html declares smc-app-env=staging/);
});

test("unconfigured target requires no backend at all", () => {
  assert.equal(runCheck("unconfigured", bundle({ "index.html": html("production"), "assets/a.js": "const a=1;" })).status, 0);
  const r = runCheck("unconfigured", bundle({ "index.html": html("production"), "assets/a.js": stagingJs }));
  assert.equal(r.status, 1);
  assert.match(r.out, /FAIL no Supabase project host/);
});
