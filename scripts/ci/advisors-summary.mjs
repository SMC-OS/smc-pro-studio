// Summarise `supabase db advisors -o json` output: one line per finding, then
// counts by level. Accepts the bare array or the { results: [...] } envelope.
// Usage: node scripts/ci/advisors-summary.mjs advisors.json
import { readFileSync } from "node:fs";

const raw = readFileSync(process.argv[2], "utf8");
const start = raw.search(/[[{]/);
if (start < 0) {
  console.log("NO_JSON_OUTPUT");
  process.exit(0);
}
const parsed = JSON.parse(raw.slice(start));
const findings = Array.isArray(parsed) ? parsed : (parsed.results ?? []);
const counts = {};
for (const f of findings) {
  counts[f.level] = (counts[f.level] ?? 0) + 1;
  console.log([f.level, (f.categories ?? []).join(","), f.name, String(f.detail ?? "").replace(/\s+/g, " ")].join(" | "));
}
console.log(`TOTAL ${findings.length} ${JSON.stringify(counts)}`);
