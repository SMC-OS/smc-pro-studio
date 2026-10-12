import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// These are static source-pattern regression guards, consistent with this
// repo's existing test style (tests/phase2-foundation.test.mjs) - there is
// no jsdom/React Testing Library/vitest in this project's toolchain, so
// behavioral proof of the underlying races lives in the PR's live browser
// QA, not here. These guard against the exact defect patterns regressing.

test("PostCard resyncs saved state from the parent's authoritative prop, with no permanent local ignore-stale flag", async () => {
  const source = await read("src/social/components/PostCard.tsx");
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*if \(inFlight\.current\) return;\s*setSaved\(initiallySaved\);\s*\}, \[initiallySaved\]\);/,
    "PostCard must resync `saved` from `initiallySaved` whenever no toggle is in flight - HomeRoute, not PostCard, now guards against a stale fetch clobbering a confirmed mutation"
  );
  assert.doesNotMatch(
    source,
    /pendingLocalRef/,
    "must not regress to a permanent local ignore-stale flag - HomeRoute owns saved-state staleness guarding via savedMutationSeqRef"
  );
  assert.match(
    source,
    /const inFlight = useRef\(false\);/,
    "toggleSave's re-entrancy guard must be a ref, not the async `busy` state (mirrors ReactionButton's inFlight ref)"
  );
  assert.match(
    source,
    /onSaveMutated\?\.\(post\.id, next\)/,
    "a successful save/unsave mutation must notify the parent so HomeRoute's authoritative savedIds updates immediately"
  );
  assert.doesNotMatch(
    source,
    /const \[saved, setSaved\] = useState\(initiallySaved\);\s*const \[busy, setBusy\] = useState\(false\);\s*async function toggleSave/,
    "must not regress to the original mount-only saved state with no resync effect at all"
  );
});

test("HomeRoute is project-first and no longer owns the legacy social-feed saved-state machinery", async () => {
  const source = await read("src/social/routes/HomeRoute.tsx");
  assert.match(
    source,
    /fetchLaunchDashboard/,
    "Home must be driven by the launch dashboard rather than the legacy social feed"
  );
  assert.match(
    source,
    /to="\/projects"/,
    "Home must provide a direct Projects path"
  );
  assert.match(
    source,
    /to="\/studio"/,
    "Home must provide a direct Studio path"
  );
  assert.doesNotMatch(
    source,
    /fetchHomeFeed|fetchMySavedPostIds|PostCard|Professional activity/,
    "the launch Home must not regress to the social-feed-first product"
  );
});

test("BottomNav never falls back to Home when no primary tab matches", async () => {
  const source = await read("src/social/components/BottomNav.tsx");
  assert.ok(source.includes("function findActiveIndex(pathname: string): number"));
  assert.ok(source.includes("return -1;"), "unknown routes must not incorrectly activate Home");
  assert.ok(source.includes('path: "/connections"'), "Connections must activate Profile");
  assert.ok(source.includes('path: "/settings"'), "Settings must activate Profile");
  assert.ok(source.includes("activeIndex >= 0 ? NAV_ITEMS[activeIndex].icon : null"), "no icon should be raised on unmatched routes");
  assert.doesNotMatch(source, /Math\.max\(\s*0,\s*NAV_ITEMS\.findIndex/);
});

test("BottomNav links and raised indicator agree about the active tab", async () => {
  const source = await read("src/social/components/BottomNav.tsx");
  assert.doesNotMatch(source, /<NavLink/);
  assert.ok(source.includes('aria-current={active ? "page" : undefined}'));
  assert.ok(source.includes('data-testid="raised-active-indicator"'));
  assert.ok(source.includes('grid-cols-5'), "all five destinations keep equal widths");
  assert.ok(source.includes("translate3d("), "the indicator should move between tab columns");
  assert.ok(source.includes("motion-reduce:transition-none"), "respect user motion preferences");
  assert.doesNotMatch(source, /ResizeObserver|useLayoutEffect|useMotionValue/, "indicator must not measure the screen or anchors");
});

test("NavRail (desktop) agrees with BottomNav (mobile) about which tab owns /connections, both visually and via aria-current", async () => {
  const source = await read("src/social/components/NavRail.tsx");
  assert.match(
    source,
    /item\.to === "\/profile" && Boolean\(matchPath\(\{ path: "\/connections", end: false \}, pathname\)\)/,
    "NavRail must treat /connections as Profile-owned, same as BottomNav's findActiveIndex"
  );
  assert.match(
    source,
    /aria-current=\{isActive \? "page" : undefined\}/,
    "NavRail's primary nav links must set aria-current from the shared isNavItemActive check, not a plain NavLink's native isActive"
  );
});

test("StoriesTray's own-story Link declares `group` so its group-hover child is not inert", async () => {
  const source = await read("src/social/components/StoriesTray.tsx");
  assert.match(
    source,
    /<Link to="\/create" className="group flex flex-col items-center gap-1\.5 text-center outline-none">/,
    "the Link wrapping the group-hover span must itself carry the `group` class, or group-hover:* never activates"
  );
});
