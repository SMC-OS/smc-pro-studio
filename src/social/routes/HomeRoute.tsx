import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { fetchPublicFeed, type FeedPost } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; posts: FeedPost[] };

export default function HomeRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchPublicFeed()
      .then((posts) => setState({ status: "ready", posts }))
      .catch((error: unknown) => setState({ status: "error", message: error instanceof Error ? error.message : "The feed could not be loaded." }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Stories" className="flex gap-3 overflow-x-auto pb-1">
        <EmptyStoryTray />
      </section>

      {state.status === "loading" && <LoadingState label="Loading the feed" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
      {state.status === "ready" && state.posts.length === 0 && (
        <EmptyState
          title="No posts yet"
          description="Public posts from the SMC community will appear here once people start sharing."
          action={
            auth.status === "authenticated" ? (
              <Link to="/create" className="text-sm font-semibold text-[var(--smc-mineral-clay)] hover:underline">
                Create the first post
              </Link>
            ) : (
              <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-clay)] hover:underline">
                Sign in to post
              </Link>
            )
          }
        />
      )}
      {state.status === "ready" && state.posts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.posts.map((post) => (
            <li key={post.id} className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-4">
              <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{post.author?.display_name ?? "SMC member"}</p>
              {post.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--smc-charcoal-soft)]">{post.body}</p>}
              <p className="mt-2 text-xs text-[var(--smc-charcoal-faint)]">{new Date(post.created_at).toLocaleDateString("en-GB")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyStoryTray() {
  return (
    <p className="w-full rounded-[var(--smc-radius-card)] border border-dashed border-[var(--smc-border-strong)] px-4 py-3 text-xs text-[var(--smc-charcoal-faint)]">
      No stories yet — Stories are planned for the next Phase 3 slice.
    </p>
  );
}
