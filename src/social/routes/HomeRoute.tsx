import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { StoriesTray } from "../components/StoriesTray";
import { PostCard } from "../components/PostCard";
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
  const [engagement, setEngagement] = useState<Map<string, PostEngagement>>(new Map());

  // Every load() bumps this so an in-flight request whose auth context has
  // since changed (or been superseded by a newer load()) can recognise
  // itself as stale and discard its result instead of overwriting state
  // with the wrong user's rows.
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
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
    let cancelled = false;
    fetchMySavedPostIds(state.posts.map((post) => post.id)).then((ids) => {
      if (!cancelled) setSavedIds(ids);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, state]);

  useEffect(() => {
    if (state.status !== "ready" || state.posts.length === 0) return;
    let cancelled = false;
    fetchPostEngagement(state.posts.map((post) => post.id)).then((map) => {
      if (!cancelled) setEngagement(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-5">
      <StoriesTray auth={auth} />

      <div className="border-t border-[var(--smc-border)] pt-5">
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
                    engagement={engagement.get(post.id)}
                  />
                </li>
              ))}
            </ul>
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
