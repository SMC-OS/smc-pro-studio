import { useRef, useState } from "react";
import { Heart } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { reactToPost, unreactToPost } from "../services/socialClient";

/**
 * One restrained primary reaction ("like") — deliberately not an emoji
 * picker. Optimistic toggle with rollback on failure, the same pattern the
 * existing save toggle in PostCard already uses: the count only ever
 * reflects a real insert/delete, and a failed request reverts silently
 * rather than leaving a state that didn't actually persist. No streaks, no
 * animated "+1" bursts, no count-up tickers — a small, brief scale pop on
 * the icon itself is the only motion, and it collapses under
 * prefers-reduced-motion.
 */
export function ReactionButton({
  postId,
  count,
  reacted,
  canReact,
  onSignInRequired,
}: {
  postId: string;
  count: number;
  reacted: boolean;
  /** Reacting requires a signed-in user — guests still see the real count. */
  canReact: boolean;
  onSignInRequired?: () => void;
}) {
  const [isReacted, setIsReacted] = useState(reacted);
  const [displayCount, setDisplayCount] = useState(count);
  const [busy, setBusy] = useState(false);
  // A ref (not the `busy` state) guards re-entrancy: state updates are async, so two clicks
  // fired before the first re-render commits could both read `busy === false` from a stale
  // closure and race each other. The ref is read/written synchronously within the same tick.
  const inFlight = useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const popTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" };

  async function toggle() {
    if (!canReact) {
      onSignInRequired?.();
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const next = !isReacted;
    setIsReacted(next);
    setDisplayCount((current) => current + (next ? 1 : -1));
    try {
      if (next) await reactToPost(postId);
      else await unreactToPost(postId);
    } catch {
      // Revert — the request didn't actually succeed, so the UI shouldn't claim it did.
      setIsReacted(!next);
      setDisplayCount((current) => current + (next ? -1 : 1));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy && canReact}
      aria-pressed={canReact ? isReacted : undefined}
      aria-label={isReacted ? "Remove like" : "Like this post"}
      className="flex items-center gap-1.5 rounded-[var(--smc-radius-pill)] px-2 py-1.5 text-sm text-[var(--smc-charcoal-soft)] transition-colors hover:bg-[var(--smc-limestone)] disabled:cursor-not-allowed"
    >
      <motion.span
        animate={{ scale: isReacted && !prefersReducedMotion ? [1, 1.22, 1] : 1 }}
        transition={popTransition}
        className="flex"
      >
        <Heart
          className="h-[18px] w-[18px]"
          fill={isReacted ? "var(--smc-mineral-clay)" : "none"}
          style={{ color: isReacted ? "var(--smc-mineral-clay)" : undefined }}
        />
      </motion.span>
      <span className="tabular-nums">{displayCount}</span>
    </button>
  );
}
