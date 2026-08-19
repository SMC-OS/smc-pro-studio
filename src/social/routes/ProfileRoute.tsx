import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { signOut } from "../../services/authClient";
import { fetchOwnProfile, type OwnProfile } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; profile: OwnProfile | null };

export default function ProfileRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    fetchOwnProfile()
      .then((profile) => setState({ status: "ready", profile }))
      .catch((error: unknown) => setState({ status: "error", message: error instanceof Error ? error.message : "Your profile could not be loaded." }));
  }, [auth.status]);

  useEffect(() => {
    load();
  }, [load]);

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return <EmptyState title="Sign in to view your profile" description="Your posts, saved items, projects, and settings live here once you're signed in." />;
  }
  if (state.status === "loading") return <LoadingState label="Loading your profile" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (!state.profile) return <ErrorState message="Your profile record could not be found." onRetry={load} />;

  const { profile } = state;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-5">
        <p className="text-lg font-semibold text-[var(--smc-charcoal)]">{profile.display_name}</p>
        {profile.username && <p className="text-sm text-[var(--smc-charcoal-faint)]">@{profile.username}</p>}
        <p className="mt-2 inline-block rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--smc-charcoal-soft)]">
          {profile.account_type}
        </p>
        {profile.bio && <p className="mt-3 text-sm text-[var(--smc-charcoal-soft)]">{profile.bio}</p>}
      </div>

      <EmptyState title="No posts, saved items, or projects yet" description="These sections build out across the remaining Phase 3 slices." />

      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-[44px] self-start rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
      >
        Sign out
      </button>
    </div>
  );
}
