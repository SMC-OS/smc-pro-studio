import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { Avatar } from "./ui";
import { LoadingState, ErrorState } from "./StateViews";
import { addComment, deleteComment, fetchComments, type PostComment } from "../services/socialClient";
import type { AuthSessionState } from "../services/useAuthSession";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; comments: PostComment[] };

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
 * Comments drawer/sheet, suitable for mobile and desktop alike. Reading is
 * guest-safe (comments_read is granted to anon wherever the post itself is
 * visible); composing and deleting require a signed-in user, enforced both
 * here and — regardless of any bug here — by RLS server-side.
 *
 * No fake optimistic success: a submitted comment is only added to the list
 * once the server confirms it was written; on failure the typed text stays
 * in the box (not cleared) and an inline error explains what happened, with
 * a way to just try again.
 */
export function CommentsDrawer({
  postId,
  open,
  onClose,
  auth,
  onCommentCountChange,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  auth: AuthSessionState;
  onCommentCountChange?: (delta: number) => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const sheetTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] };

  const currentUserId = auth.status === "authenticated" ? auth.session.subject : null;

  const load = () => {
    setState({ status: "loading" });
    fetchComments(postId)
      .then((comments) => setState({ status: "ready", comments }))
      .catch((error: unknown) => setState({ status: "error", message: error instanceof Error ? error.message : "Comments could not be loaded." }));
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const created = await addComment(postId, draft);
      setState((current) => (current.status === "ready" ? { status: "ready", comments: [...current.comments, created] } : current));
      setDraft("");
      onCommentCountChange?.(1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Your comment could not be posted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      await deleteComment(commentId);
      setState((current) =>
        current.status === "ready" ? { status: "ready", comments: current.comments.filter((c) => c.id !== commentId) } : current
      );
      onCommentCountChange?.(-1);
    } catch {
      // Leave the comment in place — it wasn't actually deleted.
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2 } }}
            exit={{ opacity: 0, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.15 } }}
            className="absolute inset-0 bg-[var(--smc-charcoal)]/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Comments"
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: sheetTransition }}
            exit={{ y: "100%", transition: sheetTransition }}
            className="relative flex max-h-[80vh] w-full flex-col rounded-t-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface)] sm:max-w-md sm:rounded-[var(--smc-radius-card)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--smc-border)] px-5 py-4">
              <h2 className="text-sm font-semibold text-[var(--smc-charcoal)]">Comments</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close comments"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-limestone)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {state.status === "loading" && <LoadingState label="Loading comments" />}
              {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
              {state.status === "ready" && state.comments.length === 0 && (
                <p className="py-10 text-center text-sm text-[var(--smc-charcoal-faint)]">
                  No comments yet. Be the first to say something.
                </p>
              )}
              {state.status === "ready" && state.comments.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {state.comments.map((comment) => {
                    const name = comment.author?.display_name ?? "SMC member";
                    const isMine = comment.author_id === currentUserId;
                    return (
                      <li key={comment.id} className="flex items-start gap-3">
                        <Avatar name={name} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{name}</p>
                            <p className="text-xs text-[var(--smc-charcoal-faint)]">{timeAgo(comment.created_at)}</p>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--smc-charcoal-soft)]">{comment.body}</p>
                        </div>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(comment.id)}
                            disabled={deletingId === comment.id}
                            aria-label="Delete your comment"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--smc-charcoal-faint)] hover:bg-[var(--smc-limestone)] hover:text-[var(--smc-mineral-clay)] disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-[var(--smc-border)] px-5 py-4" style={{ paddingBottom: "max(1rem, var(--smc-safe-bottom, 1rem))" }}>
              {auth.status === "authenticated" ? (
                <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-2">
                  {submitError && (
                    <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
                      {submitError}
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <label htmlFor="comment-draft" className="sr-only">
                      Write a comment
                    </label>
                    <textarea
                      id="comment-draft"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a comment…"
                      rows={1}
                      maxLength={1000}
                      disabled={submitting}
                      className="max-h-24 flex-1 resize-none rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-2.5 text-sm text-[var(--smc-charcoal)] outline-none focus:border-[var(--smc-mineral-bronze)] disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !draft.trim()}
                      aria-label={submitting ? "Posting comment" : "Post comment"}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--smc-charcoal)] text-[var(--smc-ivory)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-[var(--smc-charcoal-faint)]">
                  <Link to="/auth" className="font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                    Sign in
                  </Link>{" "}
                  to leave a comment.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
