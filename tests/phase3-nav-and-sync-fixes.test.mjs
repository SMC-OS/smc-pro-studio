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

test("HomeRoute owns saved-id fetch sequencing so a pre-mutation stale fetch can't clobber a confirmed save/unsave", async () => {
  const source = await read("src/social/routes/HomeRoute.tsx");
  assert.match(
    source,
    /const savedMutationSeqRef = useRef<Map<string, number>>\(new Map\(\)\);/,
    "must track a per-post mutation sequence so a saved-ids fetch can detect it was superseded by a mutation for that id"
  );
  assert.match(
    source,
    /const notifySaveMutated = useCallback\(\(postId: string, nowSaved: boolean\) => \{/,
    "must expose a mutation-notification callback that updates savedIds immediately on a confirmed save/unsave"
  );
  assert.match(
    source,
    /onSaveMutated=\{notifySaveMutated\}/,
    "must wire the mutation-notification callback into PostCard"
  );
  assert.match(
    source,
    /savedIdsGenerationRef\.current \+= 1;/,
    "a full reload must invalidate in-flight saved-ids fetches from the previous context, mirroring engagementGenerationRef"
  );
});

test("BottomNav never falls back to Home when no primary tab matches the route", async () => {
  const source = await read("src/social/components/BottomNav.tsx");
  assert.doesNotMatch(
    source,
    /Math\.max\(\s*0,\s*NAV_ITEMS\.findIndex/,
    "must not coerce findIndex's -1 (\"no primary tab matches\") into 0 (\"Home\")"
  );
  assert.match(
    source,
    /function findActiveIndex\(pathname: string\): number \| null/,
    "active-tab resolution must be able to report \"no tab active\" (null), not just an index"
  );
  assert.match(
    source,
    /matchPath\(\{ path: "\/connections", end: false \}, pathname\)/,
    "/connections must still resolve to Profile's tab (it's a profile-owned contextual subroute, not its own primary tab - see SocialApp.tsx)"
  );
  assert.match(
    source,
    /cx === null/,
    "the bar path builder must have a safe flat-bar fallback for when no tab is active"
  );
});

test("BottomNav sets a real aria-current on the tab the bead visually claims, including Profile on /connections", async () => {
  const source = await read("src/social/components/BottomNav.tsx");
  assert.doesNotMatch(
    source,
    /<NavLink/,
    "must use plain `Link`, not `NavLink` - NavLink always overwrites a caller-supplied aria-current with its own native-isActive computation, which disagrees with isBeadActive for Profile on /connections"
  );
  assert.match(
    source,
    /aria-current=\{isBeadActive \? "page" : undefined\}/,
    "aria-current must be driven by the same isBeadActive used for icon/label suppression, not react-router's native per-link isActive"
  );
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
