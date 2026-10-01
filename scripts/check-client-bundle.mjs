#!/usr/bin/env node
// Phase M2: verifies a built client bundle (dist/, or the web assets extracted
// from an APK) is safe to put on a device and targets the intended backend.
//
//   node scripts/check-client-bundle.mjs <staging|production|unconfigured> [dir]
//
// Every target:
//   - no secret-shaped values: Supabase secret keys (sb_secret_), legacy JWTs
//     whose role is service_role, Stripe secret keys, private-key blocks, or
//     the server-only variable name SUPABASE_SECRET_KEY;
//   - no Google Fonts requests (fonts are self-hosted, src/fonts.css);
//   - no plain-HTTP localhost / 127.0.0.1 backend URLs;
//   - index.html declares the expected build environment (smc-app-env meta).
// staging additionally:
//   - contains the staging Supabase URL from .env.staging, and no other
//     *.supabase.co / *.supabase.in project host (so production is absent);
//   - uses the staging publishable key, never any other sb_publishable_ key.
// unconfigured (the fail-closed CI build): no Supabase project host at all.
//
// Prints a PASS/FAIL line per check; exits 1 if anything fails.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TARGETS = new Set(["staging", "production", "unconfigured"]);
const target = process.argv[2];
if (!TARGETS.has(target)) {
  console.error("usage: check-client-bundle.mjs <staging|production|unconfigured> [dir]");
  process.exit(2);
}
const root = fileURLToPath(new URL("..", import.meta.url));
const dir = process.argv[3] ?? join(root, "dist");

function files(d) {
  return readdirSync(d).flatMap((name) => {
    const p = join(d, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const textFiles = files(dir).filter((f) => /\.(js|mjs|cjs|html|css|json|map|txt|webmanifest)$/.test(f));
if (!textFiles.some((f) => f.endsWith("index.html"))) {
  console.error(`No index.html under ${dir}. Build the bundle first.`);
  process.exit(1);
}
const corpus = textFiles.map((f) => ({ f: f.slice(dir.length + 1), s: readFileSync(f, "utf8") }));
const grep = (re) => corpus.flatMap(({ f, s }) => [...s.matchAll(re)].map((m) => ({ f, m: m[0] })));

function readEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const where = (hits) => [...new Set(hits.map((h) => h.f))].slice(0, 5).join(", ");

// --- Secrets ----------------------------------------------------------------
const secretKeys = grep(/sb_secret_[A-Za-z0-9_-]+/g);
check("no Supabase secret keys (sb_secret_)", secretKeys.length === 0, where(secretKeys));
const serviceJwts = grep(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g).filter((h) => jwtRole(h.m) === "service_role");
check("no service_role JWTs", serviceJwts.length === 0, where(serviceJwts));
const secretName = grep(/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/g);
check("no server-only secret variable names", secretName.length === 0, where(secretName));
const stripe = grep(/\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}/g);
check("no Stripe secret / restricted keys", stripe.length === 0, where(stripe));
const pem = grep(/-----BEGIN [A-Z ]*PRIVATE KEY-----/g);
check("no private-key blocks", pem.length === 0, where(pem));

// --- Fonts and local hosts -----------------------------------------------------
const gfonts = grep(/fonts\.(googleapis|gstatic)\.com/g);
check("no Google Fonts requests (fonts self-hosted)", gfonts.length === 0, where(gfonts));
// Two library-internal constants are not backend configuration and are
// tolerated by exact value: react-router's URL-parsing base ("http://localhost",
// used only to resolve relative paths) and gotrue-js's default GOTRUE_URL
// ("http://localhost:9999", unused because supabase-js always passes the
// configured project URL). Any other localhost / 127.0.0.1 URL (for example a
// leaked .env.local VITE_SUPABASE_URL or VITE_APP_URL) fails.
const LIBRARY_LOCALHOST = new Set(["http://localhost", "http://localhost:9999"]);
const localhost = grep(/http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?![\w.:])/g).filter((h) => !LIBRARY_LOCALHOST.has(h.m));
check("no plain-HTTP localhost / 127.0.0.1 backend URLs", localhost.length === 0, localhost.map((h) => h.m).join(", "));

// --- Environment marker -------------------------------------------------------
// Stamped into index.html at build time by vite.config.ts (appEnvironmentMeta).
const expectedEnv = target === "staging" ? "staging" : "production";
const html = corpus.find(({ f }) => f === "index.html")?.s ?? "";
const appEnv = /<meta name="smc-app-env" content="([a-z]+)"/.exec(html)?.[1];
check(`index.html declares smc-app-env=${expectedEnv}`, appEnv === expectedEnv, appEnv ?? "missing");

// --- Backend host ------------------------------------------------------------------
const projectHosts = [...new Set(grep(/https:\/\/[a-z0-9]{20}\.supabase\.(co|in)/g).map((h) => h.m))];
const publishable = [...new Set(grep(/sb_publishable_[A-Za-z0-9_-]+/g).map((h) => h.m))];

if (target === "staging") {
  const env = readEnvFile(join(root, ".env.staging"));
  check(".env.staging declares VITE_APP_ENV=staging", env.VITE_APP_ENV === "staging", env.VITE_APP_ENV);
  check("staging Supabase URL present", projectHosts.includes(env.VITE_SUPABASE_URL), env.VITE_SUPABASE_URL);
  check("no other Supabase project host (production absent)", projectHosts.length === 1 && projectHosts[0] === env.VITE_SUPABASE_URL, projectHosts.join(", ") || "none");
  check("only the staging publishable key", publishable.length === 1 && publishable[0] === env.VITE_SUPABASE_PUBLISHABLE_KEY, `${publishable.length} key(s)`);
} else if (target === "unconfigured") {
  check("no Supabase project host (fails closed)", projectHosts.length === 0, projectHosts.join(", "));
  check("no publishable key", publishable.length === 0);
} else {
  check("exactly one Supabase project host", projectHosts.length === 1, projectHosts.join(", ") || "none");
  check("exactly one publishable key", publishable.length === 1, `${publishable.length} key(s)`);
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
console.log(`\n${target}: ${results.length - failed.length}/${results.length} client-bundle checks passed (${textFiles.length} files scanned in ${dir})`);
process.exit(failed.length ? 1 : 0);
