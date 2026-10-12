import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Globe, MapPin } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Avatar, Card, EditorialHeading } from "../components/ui";
import { BlockButton } from "../components/BlockButton";
import { ConnectButton } from "../components/ConnectButton";
import { FollowButton } from "../components/FollowButton";
import { MessageButton } from "../components/MessageButton";
import { ReportDialog } from "../components/ReportDialog";
import {
  fetchConnectionState,
  fetchFollowState,
  fetchPublicProfileById,
  fetchPublicPostsByAuthor,
  type ConnectionSummary,
  type FeedPost,
  type PublicProfileFull,
} from "../services/socialClient";
import { fetchMyBlockState } from "../services/messagingClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PublicProfileFull | null; following: boolean; connection: ConnectionSummary };

// Real activity is loaded independently of the profile card itself, so a
// failure here never hides the profile — it only affects this one section.
type ActivityState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; posts: FeedPost[] };

/**
 * Phase 4 Slice G: the caller's own block state for this profile — loaded
 * independently of the rest of the profile card (same "one section's
 * failure never hides another" discipline as `ActivityState` above) since
 * this is the one piece of state that must never show an incorrect
 * Block/Unblock label even momentarily. `ready.blocked` is the only value
 * MessageButton is ever allowed to treat as "safe to message" — loading and
 * error both gate messaging exactly like a confirmed block would (see
 * MessageButton.tsx).
 */
type BlockState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; blocked: boolean };

const VERIFICATION_LABELS: Record<string, string> = {
  not_verified: "Not verified yet",
  pending: "Verification in progress",
  verified: "Verified",
  rejected: "Verification unsuccessful",
};

// Mirrors the public.professional_category enum exactly (same source of
// truth as NetworkRoute.tsx's CATEGORY_LABELS) — no invented categories.
const CATEGORY_LABELS: Record<string, string> = {
  architect: "Architect",
  interior_designer: "Interior Designer",
  stone_fabricator: "Stone Fabricator",
  stone_supplier: "Stone Supplier",
  installer: "Installer",
  contractor: "Contractor",
  developer: "Developer",
  construction_professional: "Construction Professional",
  smc_team: "SMC Team",
  other: "Professional",
};

/**
 * Viewing someone else's profile — the professional/network profile
 * experience (see DESIGN.md's 2026-08-19 amendment). `/profile`
 * (ProfileRoute) stays the signed-in user's own management view; this
 * route is the public-facing counterpart reached from post authors and
 * Network — reading only what `profiles_public_read`/
 * `professional_profiles_public_read` expose, plus Follow/Connect actions
 * where the viewer is signed in and it isn't their own profile
 * (self-follow/self-connect are also blocked at the database level, so
 * this is defense in depth, not the only guard).
 */
export default function PublicProfileRoute() {
  const { userId } = useParams<{ userId: string }>();
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [activity, setActivity] = useState<ActivityState>({ status: "loading" });

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
      .catch((error: unknown) => setState({ status: "error", message: describeError(error, "This profile could not be loaded.").message }));
  }, [userId, auth.status, isOwnProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const loadActivity = useCallback(() => {
    if (!userId || isOwnProfile) return;
    setActivity({ status: "loading" });
    fetchPublicPostsByAuthor(userId)
      .then((posts) => setActivity({ status: "ready", posts }))
      .catch((error: unknown) =>
        setActivity({ status: "error", message: describeError(error, "This person's activity could not be loaded.").message })
      );
    // Independent of the profile-card load: a real activity fetch failure
    // must not hide the profile itself, and vice versa — each is its own
    // honest loading/error/empty state.
  }, [userId, isOwnProfile]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Phase 4 Slice G: the caller's own block state, loaded independently
  // (see BlockState's own comment for why) and generation-guarded exactly
  // like ConversationList's own list load — a slower-resolving response for
  // a *previous* userId/auth combination must never overwrite a newer one
  // for the profile actually being viewed now.
  const [blockState, setBlockState] = useState<BlockState>({ status: "loading" });
  const blockGenerationRef = useRef(0);

  const loadBlockState = useCallback(() => {
    if (!userId || isOwnProfile) return;
    const generation = ++blockGenerationRef.current;
    if (auth.status !== "authenticated") {
      // Guests never query block state at all — BlockButton/MessageButton
      // are never rendered in the guest branch below regardless, so this is
      // an inert terminal value, not a real fetch.
      setBlockState({ status: "ready", blocked: false });
      return;
    }
    setBlockState({ status: "loading" });
    fetchMyBlockState(userId)
      .then((blocked) => {
        if (blockGenerationRef.current !== generation) return;
        setBlockState({ status: "ready", blocked });
      })
      .catch((error: unknown) => {
        if (blockGenerationRef.current !== generation) return;
        setBlockState({ status: "error", message: describeError(error, "Your block status could not be checked.").message });
      });
  }, [userId, isOwnProfile, auth.status]);

  useEffect(() => {
    loadBlockState();
    return () => {
      blockGenerationRef.current += 1;
    };
  }, [loadBlockState]);

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
  // Phase 4 Slice I: forces a full remount of ReportDialog (clearing any
  // category/details/success/error state it's holding) whenever the profile
  // being viewed or the authenticated identity viewing it changes — the same
  // "give it a fresh key" idiom ConversationRoute.tsx already documents for
  // ThreadView, needed here because this route component itself is not
  // remounted on a userId param change (see blockGenerationRef above, which
  // exists for the identical reason).
  const reportResetKey = `${userId}:${auth.status === "authenticated" ? auth.session.subject : "guest"}`;

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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isProfessional && professional?.category && (
                <span className="inline-block rounded-[var(--smc-radius-pill)] border border-[var(--smc-mineral-bronze)]/40 bg-[var(--smc-limestone)] px-2.5 py-1 text-xs font-semibold text-[var(--smc-mineral-bronze)]">
                  {CATEGORY_LABELS[professional.category] ?? "Professional"}
                </span>
              )}
              <span className="inline-block rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--smc-charcoal-soft)]">
                {profile.account_type}
              </span>
            </div>
          </div>
        </div>
        {profile.bio ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--smc-charcoal-soft)]">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-[var(--smc-charcoal-faint)]">No bio yet.</p>
        )}

        {canActOnRelationship ? (
          <div className="mt-4 flex flex-wrap items-start gap-2">
            <FollowButton userId={userId} initiallyFollowing={state.following} />
            <ConnectButton userId={userId} initialState={state.connection.state} initialConnectionId={state.connection.connectionId} />
            <MessageButton userId={userId} blocked={blockState.status === "ready" ? blockState.blocked : null} />
            {/* Report is deliberately never gated on blockState (loading/error/
                ready/blocked/not-blocked) — reporting must remain available
                regardless of the caller's own block relationship with this
                profile (submit_profile_report is block-blind server-side too;
                see reportingClient.ts) and must never be described in terms of
                block state. `key` forces a fresh instance (clearing any
                in-progress category/details/result) whenever the profile or
                the viewing identity changes — see reportResetKey above. */}
            <ReportDialog
              key={reportResetKey}
              target={{ kind: "profile", reportedUserId: userId, profileLabel: profile.display_name }}
              triggerLabel="Report profile"
            />
            {blockState.status === "ready" && (
              <BlockButton
                userId={userId}
                displayName={profile.display_name}
                blocked={blockState.blocked}
                onChange={(blocked) => setBlockState({ status: "ready", blocked })}
              />
            )}
            {blockState.status === "loading" && (
              <span role="status" className="inline-flex min-h-[44px] items-center px-2 text-xs text-[var(--smc-charcoal-faint)]">
                Checking block status…
              </span>
            )}
            {blockState.status === "error" && (
              <div className="flex items-center gap-2">
                <span role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
                  {blockState.message}
                </span>
                <button
                  type="button"
                  onClick={loadBlockState}
                  className="min-h-[44px] rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-xs font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--smc-charcoal-faint)]">
            <Link to="/auth" className="font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
              Sign in
            </Link>{" "}
            to follow, connect, or message.
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

      {isProfessional && (
        <Card className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">Recent activity</p>
          <div className="mt-3">
            {activity.status === "loading" && <LoadingState label="Loading activity" />}
            {activity.status === "error" && <ErrorState message={activity.message} onRetry={loadActivity} />}
            {activity.status === "ready" && activity.posts.length === 0 && (
              <p className="text-sm text-[var(--smc-charcoal-faint)]">No public activity yet.</p>
            )}
            {activity.status === "ready" && activity.posts.length > 0 && (
              <ul className="flex flex-col gap-3">
                {activity.posts.map((post) => (
                  <li key={post.id} className="border-t border-[var(--smc-border)] pt-3 first:border-0 first:pt-0">
                    <p className="text-sm text-[var(--smc-charcoal-soft)]">{post.body ?? "(no text)"}</p>
                    <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">
                      {new Date(post.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
