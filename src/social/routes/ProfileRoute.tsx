import { useCallback, useEffect, useState } from "react";
import { BookOpen, Globe, LogOut, MapPin, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Avatar, Button, Card, EditorialHeading } from "../components/ui";
import { signOut } from "../../services/authClient";
import {
  fetchOwnProfessionalProfile,
  fetchOwnProfile,
  type OwnProfessionalProfile,
  type OwnProfile,
} from "../services/socialClient";
import { checkModeratorAccess } from "../services/moderationClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: OwnProfile | null; professional: OwnProfessionalProfile | null };

const VERIFICATION_LABELS: Record<OwnProfessionalProfile["verification_status"], string> = {
  not_verified: "Not verified yet",
  pending: "Verification in progress",
  verified: "Verified",
  rejected: "Verification unsuccessful",
};

export default function ProfileRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  // Phase 4 Slice J: the "Report review" discovery link. Deliberately
  // three-state (not a plain boolean) so "still checking"/"a genuine check
  // failure" never render the link either — only a confirmed `true` does.
  // The link is purely a discovery convenience: ModerationRoute itself
  // re-verifies access independently regardless of how it was reached, so
  // a stale/failed check here only ever hides a link, never grants access.
  const [moderatorAccess, setModeratorAccess] = useState<"loading" | "unavailable" | "denied" | "granted">("loading");

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    let cancelled = false;
    setModeratorAccess("loading");
    checkModeratorAccess()
      .then((granted) => {
        if (!cancelled) setModeratorAccess(granted ? "granted" : "denied");
      })
      .catch(() => {
        if (!cancelled) setModeratorAccess("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, auth.status === "authenticated" ? auth.session.subject : null]);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    Promise.all([fetchOwnProfile(), fetchOwnProfessionalProfile().catch(() => null)])
      .then(([profile, professional]) => setState({ status: "ready", profile, professional }))
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

  const { profile, professional } = state;
  const isProfessional = profile.account_type === "professional";

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

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/connections"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Connections
          </Link>
          {/* Always visible, unlike "Report review" below — Community
              Guidelines applies to every user, not just moderators, so it is
              never gated on any access check. */}
          <Link
            to="/community-guidelines"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Community Guidelines
          </Link>
          {/* Only ever rendered after a confirmed `true` from
              checkModeratorAccess() — never while loading, never on a
              failed check, and never for a confirmed non-moderator. */}
          {moderatorAccess === "granted" && (
            <Link
              to="/moderation/reports"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Report review
            </Link>
          )}
        </div>
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

      <EmptyState title="No posts, saved items, or projects yet" description="These sections build out across the remaining Phase 3 slices." />

      <Button variant="secondary" onClick={() => void signOut()} className="self-start">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>
    </div>
  );
}
