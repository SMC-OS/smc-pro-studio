import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { StoriesTray } from "../components/StoriesTray";
import { PostCard } from "../components/PostCard";
import { EditorialHeading } from "../components/ui";
import { fetchMySavedPostIds, fetchPostEngagement, fetchPublicFeed, type FeedPost, type PostEngagement } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; posts: FeedPost[] };

export default function HomeRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [engagement, setEngagement] = useState<Map<string, PostEngagement>>(new Map());

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchPublicFeed()
      .then((posts) => setState({ status: "ready", posts }))
      .catch((error: unknown) => setState({ status: "error", message: error instanceof Error ? error.message : "The feed could not be loaded." }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          For you
        </EditorialHeading>

        <div className="mt-3">
          {state.status === "loading" && <LoadingState label="Loading the feed" />}
          {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
          {state.status === "ready" && state.posts.length === 0 && (
            <EmptyState
              title="No posts yet"
              description="Public posts from the SMC community will appear here once people start sharing."
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
        </div>
      </div>
    </div>
  );
}
