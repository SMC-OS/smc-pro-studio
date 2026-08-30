import { useEffect, useRef, useState } from "react";
import { ShieldAlert, ShieldOff } from "lucide-react";
import { Button } from "./ui";
import { blockUser, unblockUser } from "../services/messagingClient";

/**
 * Phase 4 Slice G: block/unblock action on another member's profile.
 * Deliberately reveals only the caller's own block state — button text and
 * status text must never imply whether the other person has blocked the
 * caller (see messagingClient.ts's fetchMyBlockState/blockUser/unblockUser,
 * which structurally cannot answer that question at all).
 *
 * `blocked` is owned by the parent (PublicProfileRoute) — the same "lifted
 * state over a global event bus" convention this slice's own instructions
 * prefer, and the same shape FollowButton/ConnectButton already use for
 * their own initial state — so MessageButton, a sibling, can react to the
 * same confirmed value without either component needing to know the other
 * exists. Only a real, server-confirmed success ever calls `onChange`; a
 * failed mutation leaves `blocked` (and therefore this button's own label)
 * exactly as it was.
 *
 * Unblock is a direct action (like FollowButton's toggle) — it only ever
 * restores capability, so it carries no confirmation step. Block is
 * destructive to the relationship (it will stop messaging in both
 * directions) and requires an explicit accessible confirmation first,
 * mirroring CommentsDrawer's own focus-trap/Escape/focus-restore dialog
 * convention (the only existing modal pattern in this codebase) rather than
 * inventing a different one.
 */
export function BlockButton({
  userId,
  displayName,
  blocked,
  onChange,
}: {
  userId: string;
  /** Used only in the confirmation dialog's own text — never persisted or sent anywhere. */
  displayName: string;
  blocked: boolean;
  /** Called only after a real, server-confirmed block/unblock success. */
  onChange: (blocked: boolean) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Same focus-trap/Escape/focus-restore contract as CommentsDrawer's own
  // dialog — the only existing modal convention in this codebase.
  useEffect(() => {
    if (!confirmOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Focus the least-destructive control first, so a stray Enter/Space
    // while the dialog is opening can never activate Block by accident.
    cancelRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      const panel = dialogRef.current;
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled])")).filter((el) => el.offsetParent !== null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const withinPanel = active instanceof Node && dialogRef.current?.contains(active);
      if (event.shiftKey) {
        if (!withinPanel || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!withinPanel || active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger on every close path (Escape, Cancel,
      // confirmed Block, or a failed attempt) — mirrors CommentsDrawer.
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        triggerRef.current?.focus();
      }
    };
  }, [confirmOpen]);

  async function handleConfirmBlock() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await blockUser(userId);
      if (!mountedRef.current) return;
      setConfirmOpen(false);
      onChange(true);
    } catch (err) {
      if (!mountedRef.current) return;
      setConfirmOpen(false);
      setError(err instanceof Error ? err.message : "This person could not be blocked right now. Please try again.");
    } finally {
      if (mountedRef.current) setPending(false);
    }
  }

  async function handleUnblock() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await unblockUser(userId);
      if (!mountedRef.current) return;
      onChange(false);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "This person could not be unblocked right now. Please try again.");
    } finally {
      if (mountedRef.current) setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {blocked ? (
        <Button type="button" variant="secondary" onClick={() => void handleUnblock()} disabled={pending} aria-pressed={true}>
          <ShieldOff className="h-4 w-4" aria-hidden="true" />
          {pending ? "Unblocking…" : "Unblock"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          ref={triggerRef}
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="text-[var(--smc-mineral-clay)] hover:bg-[var(--smc-mineral-clay)]/10"
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Block
        </Button>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {error}
        </p>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="presentation">
          <div className="absolute inset-0 bg-[var(--smc-charcoal)]/40" onClick={() => !pending && setConfirmOpen(false)} aria-hidden="true" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-confirm-title"
            aria-describedby="block-confirm-description"
            className="relative flex w-full max-w-sm flex-col gap-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface)] p-5"
          >
            <h2 id="block-confirm-title" className="text-base font-semibold text-[var(--smc-charcoal)]">
              Block {displayName}?
            </h2>
            <p id="block-confirm-description" className="text-sm text-[var(--smc-charcoal-soft)]">
              You won't be able to message each other until you unblock them. This doesn't remove your existing conversation or delete any messages.
            </p>
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="ghost" ref={cancelRef} onClick={() => setConfirmOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleConfirmBlock()}
                disabled={pending}
                className="text-[var(--smc-mineral-clay)]"
              >
                {pending ? "Blocking…" : "Block"}
              </Button>
            </div>
            {pending && (
              <p role="status" className="sr-only">
                Blocking, please wait.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
