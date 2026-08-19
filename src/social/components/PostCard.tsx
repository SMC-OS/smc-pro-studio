import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, Card } from "./ui";
import { savePost, unsavePost, type FeedPost } from "../services/socialClient";

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

export function PostCard({
  post,
  canSave,
  initiallySaved = false,
}: {
  post: FeedPost;
  /** Save requires a signed-in user — guests still see the post, just not the affordance. */
  canSave: boolean;
  initiallySaved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  const authorName = post.author?.display_name ?? "SMC member";

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
        <div className="flex items-center gap-3">
          <Avatar name={authorName} size={38} />
          <div>
            <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{authorName}</p>
            <p className="text-xs text-[var(--smc-charcoal-faint)]">{timeAgo(post.created_at)}</p>
          </div>
        </div>
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

      {!canSave && (
        <p className="mt-3 text-xs text-[var(--smc-charcoal-faint)]">
          <Link to="/auth" className="font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
            Sign in
          </Link>{" "}
          to save this post.
        </p>
      )}
    </Card>
  );
}
