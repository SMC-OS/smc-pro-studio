import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Card } from "./ui";
import { CommentsDrawer } from "./CommentsDrawer";
import { ReactionButton } from "./ReactionButton";
import { savePost, unsavePost, type FeedPost, type PostEngagement } from "../services/socialClient";
import type { AuthSessionState } from "../services/useAuthSession";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Tri-state so Home can distinguish "not yet confirmed" from "confirmed
 * genuine zero" from "the fetch failed" — a fabricated zero for the first
 * or third case would misrepresent real engagement data.
 */
export type EngagementView =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "confirmed"; value: PostEngagement };

// Mirrors the public.professional_category enum exactly (same source of
// truth as NetworkRoute.tsx's/PublicProfileRoute.tsx's CATEGORY_LABELS) —
// no invented categories.
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

export function PostCard({
  post,
  auth,
  canSave,
  initiallySaved = false,
  engagement,
  onEngagementMutated,
  onSaveMutated,
}: {
  post: FeedPost;
  auth: AuthSessionState;
  /** Save requires a signed-in user — guests still see the post, just not the affordance. */
  canSave: boolean;
  initiallySaved?: boolean;
  /** Loading/failed/confirmed — never collapsed into a fabricated zero. */
  engagement: EngagementView;
  /**
   * Notifies the parent that a reaction/comment mutation for this post just
   * succeeded server-side, so it can issue a fresh, authoritative engagement
   * refresh — see the matching comment on HomeRoute's notifyEngagementMutated.
   */
  onEngagementMutated?: (postId: string) => void;
  /**
   * Notifies the parent that this post's save/unsave mutation just succeeded
   * server-side, so HomeRoute's `savedIds` — the single source of truth —
   * can update immediately. See HomeRoute's notifySaveMutated: it also bumps
   * a per-post mutation sequence there so a slower saved-ids fetch that
   * started before this mutation can recognise itself as stale and not
   * overwrite it once it resolves. PostCard itself keeps no separate
   * "pending/ignore-stale" flag — `initiallySaved` is always applied as soon
   * as no toggle is in flight, because HomeRoute is the one guarding
   * staleness now.
   */
  onSaveMutated?: (postId: string, saved: boolean) => void;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  // Ref (not the `busy` state) guards re-entrancy for the same reason
  // ReactionButton's `inFlight` ref does: state updates are async, so two
  // clicks fired before the first re-render commits could both read
  // `busy === false` from a stale closure and race each other. It also
  // marks the window during which a resync from `initiallySaved` must be
  // skipped (see below) — this card's own toggle is the freshest possible
  // truth for that window, and the mutation's own result (applied on
  // success, below) is what HomeRoute will echo back next.
  const inFlight = useRef(false);

  // Resyncs `saved` to HomeRoute's authoritative `savedIds` state: applies
  // the late-resolving initial fetch once it lands after mount, and any
  // later authoritative change (e.g. a second signed-in session
  // saving/unsaving the same post) for as long as this card stays mounted.
  // Skipped only while our own toggle is in flight, so a slower fetch that
  // was already running before this card's mutation can't flash the
  // pre-toggle state back in before the mutation's own success path (and
  // its onSaveMutated notification) applies — with no flag left set
  // afterward, unlike a permanent ignore-stale mode.
  useEffect(() => {
    if (inFlight.current) return;
    setSaved(initiallySaved);
  }, [initiallySaved]);
  // Comments are added/removed through this card's own CommentsDrawer as
  // server-confirmed deltas (see onCommentCountChange below) — tracked
  // separately from the fetched `engagement` so a comment posted before the
  // initial engagement fetch resolves isn't lost, and so a later confirmed
  // resync (e.g. after a retry) doesn't have to guess whether it already
  // includes this card's own local changes.
  const [commentDelta, setCommentDelta] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const navigate = useNavigate();

  const authorName = post.author?.display_name ?? "SMC member";
  const canInteract = auth.status === "authenticated";

  const confirmedCommentCount = engagement.status === "confirmed" ? engagement.value.commentCount : null;
  // A freshly-arrived confirmed count is always the result of the
  // most-recently-issued fetch for this post (per HomeRoute's per-id
  // sequencing), so once it changes it is guaranteed to already reflect
  // every local mutation made through this card up to that point — the
  // local delta must then be dropped, not added on top (which would
  // double-count), and future mutations start accumulating fresh from
  // this new baseline. Depends on the primitive count, not the
  // `engagement` object identity, which changes on every unrelated
  // HomeRoute re-render.
  const lastConfirmedCommentCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmedCommentCount === null) return;
    if (lastConfirmedCommentCountRef.current === confirmedCommentCount) return;
    lastConfirmedCommentCountRef.current = confirmedCommentCount;
    setCommentDelta(0);
  }, [confirmedCommentCount]);
  const commentCount =
    confirmedCommentCount === null
      ? commentDelta !== 0
        ? Math.max(0, commentDelta)
        : null
      : Math.max(0, confirmedCommentCount + commentDelta);
  const commentCountLabel = commentCount === null ? (engagement.status === "failed" ? "–" : "…") : String(commentCount);

  const reactionCount = engagement.status === "confirmed" ? engagement.value.reactionCount : null;
  const reactedByMe = engagement.status === "confirmed" ? engagement.value.reactedByMe : false;

  // Only real, public-readable data — a customer or a professional who
  // hasn't filled in a category/company simply shows nothing extra here,
  // never a placeholder.
  const professional = post.author?.account_type === "professional" ? post.author.professional : null;
  const categoryLabel = professional?.category ? CATEGORY_LABELS[professional.category] ?? professional.category : null;
  const professionalLine = [categoryLabel, professional?.company_name].filter(Boolean).join(" · ");

  async function toggleSave() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const next = !saved;
    try {
      if (next) await savePost(post.id);
      else await unsavePost(post.id);
      setSaved(next);
      onSaveMutated?.(post.id, next);
    } catch {
      // Leave the toggle as-is on failure rather than showing a state that didn't actually persist.
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Card as="article" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/profile/${post.author_id}`} className="flex items-center gap-3 outline-none">
          <Avatar name={authorName} size={38} />
          <div>
            <p className="text-sm font-semibold text-[var(--smc-charcoal)] hover:underline">{authorName}</p>
            {professionalLine && <p className="text-xs font-medium text-[var(--smc-mineral-bronze)]">{professionalLine}</p>}
            <p className="text-xs text-[var(--smc-charcoal-faint)]">
              {timeAgo(post.created_at)}
              {/* Sourced directly from post_type — a general post shows no badge, and an
                  unrecognised future value (e.g. a type this client predates) also shows
                  none rather than being coerced into "Portfolio". */}
              {post.post_type === "portfolio" && (
                <>
                  {" · "}
                  <span className="font-semibold text-[var(--smc-charcoal-soft)]">Portfolio</span>
                </>
              )}
            </p>
          </div>
        </Link>
        {canSave && (
          <button
            type="button"
            onClick={() => void toggleSave()}
            disabled={busy}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save post"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--smc-charcoal-soft)] transition-colors hover:bg-[var(--smc-limestone)] disabled:opacity-50"
          >
            {saved ? (
              <BookmarkCheck className="h-[18px] w-[18px]" style={{ color: "var(--smc-mineral-bronze)" }} />
            ) : (
              <Bookmark className="h-[18px] w-[18px]" />
            )}
          </button>
        )}
      </div>

      {post.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--smc-charcoal-soft)]">{post.body}</p>}

      <div className="mt-3 flex items-center gap-1 border-t border-[var(--smc-border)] pt-2">
        <ReactionButton
          postId={post.id}
          count={reactionCount}
          reacted={reactedByMe}
          unavailable={engagement.status === "failed"}
          canReact={canInteract}
          onSignInRequired={() => navigate("/auth")}
          onMutated={() => onEngagementMutated?.(post.id)}
        />
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          aria-label={commentCount === null ? "View comments (count unavailable)" : `View comments (${commentCount})`}
          className="flex items-center gap-1.5 rounded-[var(--smc-radius-pill)] px-2 py-1.5 text-sm text-[var(--smc-charcoal-soft)] transition-colors hover:bg-[var(--smc-limestone)]"
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="tabular-nums">{commentCountLabel}</span>
        </button>
      </div>

      {!canSave && (
        <p className="mt-2 text-xs text-[var(--smc-charcoal-faint)]">
          <Link to="/auth" className="font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
            Sign in
          </Link>{" "}
          to save, like, or comment.
        </p>
      )}

      <CommentsDrawer
        postId={post.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        auth={auth}
        onCommentCountChange={(delta) => setCommentDelta((current) => current + delta)}
        onMutated={() => onEngagementMutated?.(post.id)}
      />
    </Card>
  );
}
