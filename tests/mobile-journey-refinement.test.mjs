import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile navigation restores the raised indicator without layout measurement", async () => {
  const source = await read("src/social/components/BottomNav.tsx");
  assert.match(source, /data-testid="raised-active-indicator"/);
  assert.match(source, /motion-reduce:transition-none/);
  assert.match(source, /grid-cols-5/);
  assert.match(source, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(source, /var\(--smc-safe-bottom\)/);
  assert.doesNotMatch(source, /ResizeObserver|useMotionValue|useLayoutEffect/);
});

test("quote workflow supports four steps and never sends an unassigned request", async () => {
  const source = await read("src/social/routes/QuoteRequestRoute.tsx");
  for (const step of ["Your project", "Property", "Professional", "Review"]) {
    assert.ok(source.includes(step), `missing quote step: ${step}`);
  }
  assert.match(source, /const canSubmit = Boolean\(propertyId && title\.trim\(\) && professionalId && selectedProfessional\)/);
  assert.match(source, /if \(!canSubmit\)/);
  assert.match(source, /disabled=\{state === "saving" \|\| !canSubmit\}/);
  assert.match(source, /No verified professionals available yet/);
  assert.match(source, /submitQuoteRequest\(/);
  assert.match(source, /Review your request/);
  assert.doesNotMatch(source, /professionalId:\s*null/);
});

test("materials search only filters real, published catalogue results", async () => {
  const source = await read("src/social/routes/StudioRoute.tsx");
  assert.match(source, /fetchPublishedMaterials\(\)/);
  assert.match(source, /setMaterials\(materialRows\)/);
  assert.match(source, /material\.applications/);
  assert.match(source, /type="search"/);
  assert.match(source, /materials\.length === 0/);
  assert.match(source, /No materials have been published yet/);
  assert.doesNotMatch(source, /demoMaterials|placeholderProducts|fakeInventory/);
});

test("professional cards retain verified search, genuine filtering, and direct quote routing", async () => {
  const source = await read("src/social/routes/NetworkRoute.tsx");
  assert.match(source, /searchPublicProfessionals\(/);
  assert.match(source, /setProfession\(key\)/);
  assert.match(source, /setServiceArea\(event\.target\.value\)/);
  assert.match(source, /\/quotes\/new\?professional=/);
  assert.match(source, /No verified professionals published yet/);
  assert.match(source, /No professionals match these filters/);
  assert.doesNotMatch(source, /mockProfessional|fakeProfessional|syntheticProfiles/);
});

test("authenticated Home is action-first and hides empty appointment furniture", async () => {
  const source = await read("src/social/routes/HomeRoute.tsx");
  assert.match(source, /fetchLaunchDashboard\(/);
  assert.match(source, /Welcome back, /);
  assert.match(source, /to="\/quotes\/new"/);
  assert.match(source, /to="\/studio"/);
  assert.match(source, /to="\/network"/);
  assert.match(source, /\{nextAppointment && \(/);
  assert.doesNotMatch(source, /Nothing scheduled yet\./);
});
