import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { PostCard, type EngagementView } from "../components/PostCard";
import { EditorialHeading } from "../components/ui";
import { fetchHomeFeed, fetchMySavedPostIds, fetchPostEngagement, type FeedPost, type HomeFeedCursor, type PostEngagement } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; posts: FeedPost[]; cursor: HomeFeedCursor | null; loadingMore: boolean; loadMoreError: string | null };

export default function HomeRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Confirmed engagement, accumulated across fetches — an entry here is a
  // real, server-confirmed result (including genuine zero) and is never
  // removed once set.
  const [engagement, setEngagement] = useState<Map<string, PostEngagement>>(new Map());
  // Post ids whose most recent engagement fetch failed — distinct from "not
  // yet requested"/"in flight" (neither of which appears in this set), so
  // Home can render "unavailable" instead of guessing zero.
  const [failedEngagementIds, setFailedEngagementIds] = useState<Set<string>>(new Set());
  // Every id ever requested (whether it ended up confirmed or failed) —
  // once an id is here the automatic fetch effect leaves it alone, even
  // after a failure. Otherwise a failed id would look "missing" again on
  // the next unrelated state change (e.g. clicking "load more") and get
  // silently re-fetched, making the explicit Retry control below
  // meaningless; it also dedupes an id across effect re-runs so it's never
  // requested twice concurrently.
  const attemptedEngagementIdsRef = useRef<Set<string>>(new Set());
  // Per-post sequence number, bumped every time a fetch is issued for that
  // id (initial batch, Retry, or a post-mutation refresh — see
  // notifyEngagementMutated). A response is only ever applied if its
  // captured sequence still matches the current one for that id, so an
  // older, slower-resolving request (e.g. the initial fetch, still in
  // flight when a comment/reaction mutation fires its own refresh) can
  // never overwrite a result from a request issued after it — only the
  // most-recently-issued request for a given id can ever win.
  const engagementSeqRef = useRef<Map<string, number>>(new Map());

  // Every load() bumps this so an in-flight request whose auth context has
  // since changed (or been superseded by a newer load()) can recognise
  // itself as stale and discard its result instead of overwriting state
  // with the wrong user's rows.
  const requestIdRef = useRef(0);
  // Bumped alongside a full reload so a late-resolving engagement fetch from
  // the previous auth/feed context can recognise itself as superseded and
  // discard its result rather than overwrite state for the new context.
  const engagementGenerationRef = useRef(0);

  // Same generation/sequence guard as engagement, applied to saved-ids: a
  // fetch batch resolving here is only ever a plain "is X saved" read, not
  // itself authoritative-on-arrival the way a mutation is. Bumped alongside
  // a full reload so a saved-ids fetch from the previous auth/feed context
  // can't land on the new one.
  const savedIdsGenerationRef = useRef(0);
  // Per-post counter bumped by notifySaveMutated every time this post's own
  // save/unsave succeeds. A saved-ids fetch snapshots each requested id's
  // counter before it starts; if that counter has moved by the time the
  // fetch resolves, a mutation for that id landed *during* the fetch, so the
  // fetch's answer predates it and must be dropped for that id — this is
  // what lets a successful mutation update savedIds immediately without a
  // slower, pre-mutation fetch silently reverting it once it finally
  // resolves. Never reset by a mutation; only a full reload clears it.
  const savedMutationSeqRef = useRef<Map<string, number>>(new Map());
  // Guards every async saved-ids/engagement setState below against firing
  // after this component has unmounted (e.g. the user navigated away while
  // a fetch was still in flight). Must set `.current = true` in the effect
  // body itself, not just rely on the `useRef(true)` initializer: under
  // React StrictMode's dev-only mount -> cleanup -> remount cycle, the
  // cleanup below runs once (setting it false) before the remount's effect
  // re-runs — if the effect body didn't also flip it back to true, it would
  // stay permanently false for the rest of the component's real lifetime,
  // silently discarding every guarded fetch result forever.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    engagementGenerationRef.current += 1;
    attemptedEngagementIdsRef.current = new Set();
    engagementSeqRef.current = new Map();
    setEngagement(new Map());
    setFailedEngagementIds(new Set());
    savedIdsGenerationRef.current += 1;
    savedMutationSeqRef.current = new Map();
    setSavedIds(new Set());
    setState({ status: "loading" });
    fetchHomeFeed(null)
      .then((page) => {
        if (requestIdRef.current !== requestId) return;
        setState({ status: "ready", posts: page.posts, cursor: page.nextCursor, loadingMore: false, loadMoreError: null });
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "The feed could not be loaded." });
      });
  }, []);

  // Fetches engagement for exactly the given ids and merges/records the
  // result, guarded against both duplicate concurrent requests for the same
  // id and results from a superseded (pre-reload) generation. Per-id
  // sequence numbers additionally guard against a *same-generation* but
  // now-stale request (an earlier fetch for an id that a later request —
  // Retry, or a post-mutation refresh — has since superseded): each id's
  // result is only applied if no newer request for that specific id has
  // been issued since this one started.
  const fetchEngagementFor = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const generation = engagementGenerationRef.current;
    const seqs = new Map<string, number>();
    for (const id of ids) {
      attemptedEngagementIdsRef.current.add(id);
      const seq = (engagementSeqRef.current.get(id) ?? 0) + 1;
      engagementSeqRef.current.set(id, seq);
      seqs.set(id, seq);
    }
    const isCurrent = (id: string) => engagementSeqRef.current.get(id) === seqs.get(id);
    fetchPostEngagement(ids)
      .then((map) => {
        if (engagementGenerationRef.current !== generation) return;
        setEngagement((prev) => {
          const merged = new Map(prev);
          for (const [id, value] of map) {
            if (isCurrent(id)) merged.set(id, value);
          }
          return merged;
        });
        setFailedEngagementIds((prev) => {
          if (prev.size === 0) return prev;
          const next = new Set(prev);
          for (const id of ids) {
            if (isCurrent(id)) next.delete(id);
          }
          return next;
        });
      })
      .catch(() => {
        if (engagementGenerationRef.current !== generation) return;
        setFailedEngagementIds((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (isCurrent(id)) next.add(id);
          }
          return next;
        });
      });
  }, []);

  // Fetches "is X saved" for exactly the given ids and merges the result
  // into savedIds, guarded against both a superseded (pre-reload) generation
  // and a same-generation mutation that landed for a specific id after this
  // fetch started (see savedMutationSeqRef above) — that id's answer is
  // dropped rather than applied, since it predates a since-confirmed change.
  const fetchSavedIdsFor = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const generation = savedIdsGenerationRef.current;
    const seqSnapshot = new Map(ids.map((id) => [id, savedMutationSeqRef.current.get(id) ?? 0]));
    fetchMySavedPostIds(ids).then((fetchedSet) => {
      if (!mountedRef.current || savedIdsGenerationRef.current !== generation) return;
      setSavedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if ((savedMutationSeqRef.current.get(id) ?? 0) !== seqSnapshot.get(id)) continue;
          if (fetchedSet.has(id)) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    });
  }, []);

  // Called after a save/unsave mutation for a post actually succeeds
  // server-side. Updates savedIds immediately — HomeRoute is the
  // authoritative owner of saved state, so a confirmed mutation is applied
  // the instant it's known, not deferred to the next fetch — and bumps that
  // post's mutation sequence so any saved-ids fetch already in flight for it
  // is recognised as stale by fetchSavedIdsFor above once it resolves.
  const notifySaveMutated = useCallback((postId: string, nowSaved: boolean) => {
    savedMutationSeqRef.current.set(postId, (savedMutationSeqRef.current.get(postId) ?? 0) + 1);
    setSavedIds((prev) => {
      if (prev.has(postId) === nowSaved) return prev;
      const next = new Set(prev);
      if (nowSaved) next.add(postId);
      else next.delete(postId);
      return next;
    });
  }, []);

  const retryEngagement = useCallback(() => {
    const ids = Array.from(failedEngagementIds);
    if (ids.length === 0) return;
    setFailedEngagementIds(new Set());
    fetchEngagementFor(ids);
  }, [failedEngagementIds, fetchEngagementFor]);

  // Called after a reaction/comment mutation for a post actually succeeds
  // server-side. Issues a fresh, authoritative engagement fetch for just
  // that post — superseding (via the per-id sequence check above) any
  // older fetch still in flight for it, so a slower request that started
  // before the mutation can never land afterward and either double-count
  // it (already-included in that older read, plus the local optimistic
  // delta on top) or silently revert it (older read predates the
  // mutation). Only the freshest request for a given id is ever applied.
  const notifyEngagementMutated = useCallback(
    (postId: string) => {
      fetchEngagementFor([postId]);
    },
    [fetchEngagementFor]
  );

  // Same identity while merely re-authenticating as the same signed-in user
  // (e.g. a token refresh event) — a real key change means the definitive,
  // RLS-relevant identity actually changed: unresolved -> guest,
  // unresolved -> a user, signed out, or (rare) straight to a different user.
  const authKey = auth.status === "authenticated" ? auth.session.subject : auth.status;

  useEffect(() => {
    // Session restoration isn't resolved yet — issuing a query now would run
    // against whatever the Supabase client's auth state happens to be at
    // that instant, not the real guest/authenticated outcome. Wait for it.
    if (auth.status === "loading") return;
    load();
    // `load` itself is stable (no deps); `authKey` is the real trigger and
    // deliberately excludes the full `auth`/`auth.session` object, which
    // gets a new identity on every token-refresh event even for the same user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, load]);

  function loadMore() {
    if (state.status !== "ready" || !state.cursor || state.loadingMore) return;
    const cursor = state.cursor;
    setState({ ...state, loadingMore: true, loadMoreError: null });
    fetchHomeFeed(cursor)
      .then((page) =>
        setState((prev) =>
          prev.status === "ready"
            ? { status: "ready", posts: [...prev.posts, ...page.posts], cursor: page.nextCursor, loadingMore: false, loadMoreError: null }
            : prev
        )
      )
      // A failed "load more" leaves the already-loaded posts in place and
      // the cursor untouched — only the in-flight flag resets and a real
      // error is recorded, so retrying re-issues the exact same page request.
      .catch((error: unknown) =>
        setState((prev) =>
          prev.status === "ready"
            ? { ...prev, loadingMore: false, loadMoreError: error instanceof Error ? error.message : "More activity could not be loaded." }
            : prev
        )
      );
  }

  useEffect(() => {
    if (auth.status !== "authenticated" || state.status !== "ready" || state.posts.length === 0) return;
    // Re-fetches the full currently-loaded id list (not just newly-added
    // ones) on every `state` change, including a "load more" — this is also
    // how a second session's authoritative save/unsave converges here for a
    // post that was already on screen, since it re-reads every visible id
    // rather than only ones never seen before.
    fetchSavedIdsFor(state.posts.map((post) => post.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, state, fetchSavedIdsFor]);

  useEffect(() => {
    if (state.status !== "ready" || state.posts.length === 0) return;
    // Only auto-fetch ids that have never been requested — avoids
    // re-fetching (and flashing) already-known posts every time `state`
    // changes for an unrelated reason (e.g. a "load more" in flight), and
    // avoids silently re-attempting a failed id outside the explicit Retry
    // control.
    const missing = state.posts.map((post) => post.id).filter((id) => !attemptedEngagementIdsRef.current.has(id));
    fetchEngagementFor(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function engagementViewFor(postId: string): EngagementView {
    const confirmed = engagement.get(postId);
    if (confirmed) return { status: "confirmed", value: confirmed };
    if (failedEngagementIds.has(postId)) return { status: "failed" };
    return { status: "loading" };
  }

  return (
    <div className="flex flex-col gap-5">
      {/* V1 scope: Stories is not part of V1, so its placeholder tray is not
          rendered (components/StoriesTray.tsx is kept for a later release). */}
      <div>
        <EditorialHeading as="h2" className="text-lg">
          Professional activity
        </EditorialHeading>

        <div className="mt-3">
          {state.status === "loading" && <LoadingState label="Loading professional activity" />}
          {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
          {state.status === "ready" && state.posts.length === 0 && (
            <EmptyState
              title="No professional activity yet"
              description="Your own posts, activity from people you follow or connect with, and public posts from the SMC community will appear here."
              action={
                auth.status === "authenticated" ? (
                  <Link to="/create" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                    Create the first post
                  </Link>
                ) : (
                  <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                    Sign in to post
                  </Link>
                )
              }
            />
          )}
          {state.status === "ready" && state.posts.length > 0 && (
            <ul className="flex flex-col gap-3">
              {state.posts.map((post) => (
                <li key={post.id}>
                  <PostCard
                    post={post}
                    auth={auth}
                    canSave={auth.status === "authenticated"}
                    initiallySaved={savedIds.has(post.id)}
                    engagement={engagementViewFor(post.id)}
                    onEngagementMutated={notifyEngagementMutated}
                    onSaveMutated={notifySaveMutated}
                  />
                </li>
              ))}
            </ul>
          )}
          {state.status === "ready" && failedEngagementIds.size > 0 && (
            <div
              role="alert"
              className="mx-auto mt-3 flex max-w-sm flex-col items-center gap-2 rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 bg-[var(--smc-surface-raised)] px-4 py-3 text-center"
            >
              <p className="text-sm font-medium text-[var(--smc-charcoal)]">
                Some reaction and comment counts couldn't be loaded.
              </p>
              <button
                type="button"
                onClick={retryEngagement}
                className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
              >
                Retry
              </button>
            </div>
          )}
          {state.status === "ready" && state.cursor && !state.loadMoreError && (
            <button
              type="button"
              onClick={loadMore}
              disabled={state.loadingMore}
              className="mx-auto mt-3 block rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)] disabled:opacity-60"
            >
              {state.loadingMore ? "Loading more…" : "Load more"}
            </button>
          )}
          {state.status === "ready" && state.loadMoreError && (
            <div
              role="alert"
              className="mx-auto mt-3 flex max-w-sm flex-col items-center gap-2 rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 bg-[var(--smc-surface-raised)] px-4 py-3 text-center"
            >
              <p className="text-sm font-medium text-[var(--smc-charcoal)]">{state.loadMoreError}</p>
              <button
                type="button"
                onClick={loadMore}
                disabled={state.loadingMore}
                className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)] disabled:opacity-60"
              >
                {state.loadingMore ? "Loading more…" : "Try again"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
