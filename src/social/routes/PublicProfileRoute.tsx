import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Globe, MapPin } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Avatar, Card, EditorialHeading } from "../components/ui";
import { ConnectButton } from "../components/ConnectButton";
import { FollowButton } from "../components/FollowButton";
import {
  fetchConnectionState,
  fetchFollowState,
  fetchPublicProfileById,
  type ConnectionSummary,
  type PublicProfileFull,
} from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PublicProfileFull | null; following: boolean; connection: ConnectionSummary };

const VERIFICATION_LABELS: Record<string, string> = {
  not_verified: "Not verified yet",
  pending: "Verification in progress",
  verified: "Verified",
  rejected: "Verification unsuccessful",
};

/**
 * Viewing someone else's profile. `/profile` (ProfileRoute) stays the
 * signed-in user's own management view; this route is the public-facing
 * counterpart reached from post authors and Discover — reading only what
 * `profiles_public_read`/`professional_profiles_public_read` expose, plus
 * Follow/Connect actions where the viewer is signed in and it isn't their
 * own profile (self-follow/self-connect are also blocked at the database
 * level, so this is defense in depth, not the only guard).
 */
export default function PublicProfileRoute() {
  const { userId } = useParams<{ userId: string }>();
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const isOwnProfile = auth.status === "authenticated" && userId === auth.session.subject;

  const load = useCallback(() => {
    if (!userId || isOwnProfile) return;
    setState({ status: "loading" });
    Promise.all([
      fetchPublicProfileById(userId),
      auth.status === "authenticated" ? fetchFollowState(userId) : Promise.resolve(false),
      auth.status === "authenticated" ? fetchConnectionState(userId) : Promise.resolve({ state: "none" as const, connectionId: null }),
    ])
      .then(([data, following, connection]) => setState({ status: "ready", data, following, connection }))
      .catch((error: unknown) => setState({ status: "error", message: error instanceof Error ? error.message : "This profile could not be loaded." }));
  }, [userId, auth.status, isOwnProfile]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId) return <ErrorState message="No profile was specified." />;
  if (isOwnProfile) return <Navigate to="/profile" replace />;
  if (auth.status === "loading" || state.status === "loading") return <LoadingState label="Loading profile" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (!state.data) {
    return <EmptyState title="Profile not found" description="This profile doesn't exist, or its owner has kept it private." />;
  }

  const { profile, professional } = state.data;
  const isProfessional = profile.account_type === "professional";
  const canActOnRelationship = auth.status === "authenticated";

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Avatar name={profile.display_name} size={64} />
          <div className="min-w-0 flex-1">
            <EditorialHeading as="h1" className="text-xl">
              {profile.display_name}
            </EditorialHeading>
            {profile.username && <p className="text-sm text-[var(--smc-charcoal-faint)]">@{profile.username}</p>}
            <span className="mt-2 inline-block rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--smc-charcoal-soft)]">
              {profile.account_type}
            </span>
          </div>
        </div>
        {profile.bio ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--smc-charcoal-soft)]">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-[var(--smc-charcoal-faint)]">No bio yet.</p>
        )}

        {canActOnRelationship ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <FollowButton userId={userId} initiallyFollowing={state.following} />
            <ConnectButton userId={userId} initialState={state.connection.state} initialConnectionId={state.connection.connectionId} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--smc-charcoal-faint)]">
            <Link to="/auth" className="font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
              Sign in
            </Link>{" "}
            to follow or connect.
          </p>
        )}
      </Card>

      {isProfessional && (
        <Card className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">Professional details</p>
          {professional ? (
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--smc-charcoal-soft)]">{professional.company_name ?? "Company name not added yet"}</span>
                <span
                  className="rounded-[var(--smc-radius-pill)] px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    color: professional.verification_status === "verified" ? "var(--smc-mineral-bronze)" : "var(--smc-charcoal-faint)",
                    background: professional.verification_status === "verified" ? "var(--smc-limestone)" : "var(--smc-surface-sunken)",
                  }}
                >
                  {VERIFICATION_LABELS[professional.verification_status]}
                </span>
              </div>
              {professional.service_area && (
                <p className="flex items-center gap-1.5 text-[var(--smc-charcoal-faint)]">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {professional.service_area}
                </p>
              )}
              {professional.website_url && (
                <p className="flex items-center gap-1.5 text-[var(--smc-charcoal-faint)]">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" /> {professional.website_url}
                </p>
              )}
              {professional.services.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {professional.services.map((service) => (
                    <span key={service} className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] px-2.5 py-1 text-xs text-[var(--smc-charcoal-soft)]">
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--smc-charcoal-faint)]">Professional details have not been added yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
