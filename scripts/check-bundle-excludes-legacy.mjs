#!/usr/bin/env node
// Pre-native hardening: the production bundle must not contain the legacy
// App's module graph. main.tsx loads the legacy App only through a dynamic
// import inside an `import.meta.env.PROD`-guarded branch, which production
// builds remove. If a static import of legacy code is reintroduced anywhere,
// these legacy-only markers reappear in dist/ and this check fails.
//
//   node scripts/check-bundle-excludes-legacy.mjs [distDir]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST_DIR = process.argv[2] ?? fileURLToPath(new URL("../dist", import.meta.url));

// Strings that exist only in legacy code or legacy-only libraries
// (verified absent from src/social).
const LEGACY_MARKERS = [
  "AI Drawing Scanner", // legacy App screens
  "Approved Trade Partner",
  "Analytics Dashboard Temporary Error",
  "jsPDF", // legacy PDF export (jspdf)
  "html2canvas",
  "DOMPurify", // pulled in by jspdf
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const bundle = files(DIST_DIR).filter((f) => /\.(js|mjs|html)$/.test(f));
if (bundle.length === 0) {
  console.error(`No bundle files found in ${DIST_DIR}. Run the production build first.`);
  process.exit(1);
}

const hits = [];
for (const file of bundle) {
  const text = readFileSync(file, "utf8");
  for (const marker of LEGACY_MARKERS) if (text.includes(marker)) hits.push(`${file}: ${marker}`);
}

if (hits.length) {
  console.error("Legacy code found in the production bundle:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`Checked ${bundle.length} bundle file(s) for ${LEGACY_MARKERS.length} legacy marker(s): none found.`);
