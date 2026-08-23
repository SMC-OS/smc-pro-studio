import { useState } from "react";
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

const EMPTY_ENGAGEMENT: PostEngagement = { reactionCount: 0, commentCount: 0, reactedByMe: false };

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
}: {
  post: FeedPost;
  auth: AuthSessionState;
  /** Save requires a signed-in user — guests still see the post, just not the affordance. */
  canSave: boolean;
  initiallySaved?: boolean;
  /** Undefined means the count couldn't be confirmed yet — rendered as "unknown", never guessed as zero. */
  engagement?: PostEngagement;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(engagement?.commentCount ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const navigate = useNavigate();

  const authorName = post.author?.display_name ?? "SMC member";
  const canInteract = auth.status === "authenticated";
  const knownEngagement = engagement ?? EMPTY_ENGAGEMENT;

  // Only real, public-readable data — a customer or a professional who
  // hasn't filled in a category/company simply shows nothing extra here,
  // never a placeholder.
  const professional = post.author?.account_type === "professional" ? post.author.professional : null;
  const categoryLabel = professional?.category ? CATEGORY_LABELS[professional.category] ?? professional.category : null;
  const professionalLine = [categoryLabel, professional?.company_name].filter(Boolean).join(" · ");

  async function toggleSave() {
    if (busy) return;
    setBusy(true);
    const next = !saved;
    try {
      if (next) await savePost(post.id);
      else await unsavePost(post.id);
      setSaved(next);
    } catch {
      // Leave the toggle as-is on failure rather than showing a state that didn't actually persist.
    } finally {
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
          count={knownEngagement.reactionCount}
          reacted={knownEngagement.reactedByMe}
          canReact={canInteract}
          onSignInRequired={() => navigate("/auth")}
        />
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          aria-label={`View comments (${commentCount})`}
          className="flex items-center gap-1.5 rounded-[var(--smc-radius-pill)] px-2 py-1.5 text-sm text-[var(--smc-charcoal-soft)] transition-colors hover:bg-[var(--smc-limestone)]"
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="tabular-nums">{commentCount}</span>
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
        onCommentCountChange={(delta) => setCommentCount((current) => Math.max(0, current + delta))}
      />
    </Card>
  );
}
