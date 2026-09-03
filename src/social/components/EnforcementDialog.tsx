import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "./ui";
import { moderateReportedMessage, REVIEW_NOTE_MAX_LENGTH, type EnforcementResult, type ModerationAction } from "../services/moderationClient";

/**
 * Phase 4 Slice K: the Hide/Restore confirmation dialog for the exact
 * message a resolved report references. Structurally mirrors
 * ReviewDialog.tsx's own focus-trap/Escape/focus-restore/confirmed-success-
 * only contract exactly (the same discipline that dialog already
 * established, itself mirroring ReportDialog.tsx before it) rather than
 * reinventing a fourth variant — including the deferred-onActed-until-Close
 * pattern that fixes the exact premature-unmount bug ReviewDialog.tsx's own
 * comment documents for its own onReviewed callback.
 *
 * One instance is mounted per available action per report detail view (the
 * detail view renders either a Hide trigger or a Restore trigger, never
 * both at once — see ModerationRoute.tsx), so the `action` this instance
 * acts on is fixed for its whole lifetime, the same shape ReviewDialog.tsx
 * already establishes for `decision`.
 *
 * The success copy below ("now hidden/visible from both people...") is a
 * true, present-tense statement about confirmed server/RLS state — never a
 * claim about any other browser tab's own screen. Exactly like Slice D's
 * own Realtime design (ThreadView subscribes to INSERT only, never UPDATE),
 * an already-open participant ThreadView with this message already loaded
 * into its local React state is not retroactively updated by this action —
 * the moderator's own moderation_status change is an UPDATE, which that
 * subscription was never wired to receive. The participant only converges
 * on the new state the next time their own thread performs an authoritative
 * fetch — a remount (conversation switch), a manual Refresh, or a Realtime
 * catch-up triggered by some other, unrelated INSERT in the same
 * conversation. This is a deliberate, existing limitation of this
 * codebase's "no live/polling update" design (see Slice F's own read-state
 * notes for the identical boundary), not something this slice needs to, or
 * does, change.
 */
export function EnforcementDialog({
  reportId,
  action,
  triggerLabel,
  onActed,
}: {
  reportId: string;
  action: ModerationAction;
  triggerLabel: string;
  /** Called only after a real, server-confirmed enforcement result — never optimistically. */
  onActed: (result: EnforcementResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  // Held here, not handed to the parent (via `onActed`) until Close is
  // actually clicked — identical rationale to ReviewDialog.tsx's own
  // confirmedResult: this dialog is rendered conditionally by its own
  // parent based on the report's current message-moderation state, and
  // calling `onActed` the instant the RPC confirms would let the parent
  // update that same state immediately, which would unmount this very
  // dialog before its own success view — and its Close button — ever had a
  // chance to render.
  const [confirmedResult, setConfirmedResult] = useState<EnforcementResult | null>(null);

  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const titleId = useId();
  const descriptionId = useId();
  const noteCountId = useId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  function resetForm() {
    setNote("");
    setValidationError(null);
    setSubmitError(null);
    setSucceeded(false);
    setConfirmedResult(null);
  }

  function requestClose() {
    if (submittingRef.current) return;
    setOpen(false);
  }

  // Focus-trap/Escape/focus-restore — identical contract to ReviewDialog.tsx's own dialog.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      const panel = dialogRef.current;
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled]), textarea:not([disabled])")).filter(
        (el) => el.offsetParent !== null
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!submittingRef.current) setOpen(false);
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
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  // Moves focus to the success view's own Close control on the transition
  // into confirmed success — see ReviewDialog.tsx's identical effect.
  useEffect(() => {
    if (!open || !succeeded || !mountedRef.current) return;
    closeRef.current?.focus();
  }, [succeeded, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setValidationError(null);
    setSubmitError(null);

    // Mirrors moderationClient.ts's own prepareReviewNote rules exactly —
    // the same 1..1000 trimmed-character contract review_report()'s own
    // note already uses.
    const trimmedNote = note.trim();
    if (note !== "" && trimmedNote === "") {
      setValidationError("Note can't be just spaces.");
      return;
    }
    if (trimmedNote.length > REVIEW_NOTE_MAX_LENGTH) {
      setValidationError(`Note must be ${REVIEW_NOTE_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await moderateReportedMessage(reportId, action, trimmedNote || undefined);
      if (!mountedRef.current) return;
      // Shows this dialog's own success view immediately — but the parent
      // is deliberately not told yet (see confirmedResult's own comment
      // above); that happens only when the user clicks Close below.
      setSucceeded(true);
      setConfirmedResult(result);
    } catch (err) {
      if (!mountedRef.current) return;
      // Note is deliberately left untouched on failure — this covers both a
      // genuine backend failure and the concurrent-already-acted case
      // (moderate_reported_message()'s own atomic compare-and-swap rejects
      // a second identical action identically) — reloading the report is
      // the recovery path either way.
      setSubmitError(err instanceof Error ? err.message : "This action could not be completed. Please try again.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  const actionLabel = action === "hide_message" ? "Hide" : "Restore";
  const actionVerb = action === "hide_message" ? "hidden" : "restored";

  return (
    <>
      <Button type="button" variant="secondary" ref={triggerRef} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="presentation">
          <div className="absolute inset-0 bg-[var(--smc-charcoal)]/40" onClick={requestClose} aria-hidden="true" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative flex w-full max-w-sm flex-col gap-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface)] p-5"
          >
            {succeeded ? (
              <>
                <h2 id={titleId} className="text-base font-semibold text-[var(--smc-charcoal)]">
                  Message {actionVerb}
                </h2>
                {/* Never claims a warning, block, suspension, or notification
                    was issued — this only changes whether the message's
                    content is visible in the conversation. */}
                <p id={descriptionId} role="status" className="text-sm text-[var(--smc-charcoal-soft)]">
                  {action === "hide_message"
                    ? "The message is now hidden from both people in this conversation. This can be reversed at any time."
                    : "The message is now visible to both people in this conversation again."}{" "}
                  Anyone with this conversation already open will see this after they refresh or reconnect.
                </p>
                <div className="mt-1 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    ref={closeRef}
                    onClick={() => {
                      // Tell the parent only now — after the user has
                      // actually seen and acknowledged the confirmed
                      // result — never earlier. `confirmedResult` is only
                      // ever set after a genuine server confirmation
                      // above, so this can never be optimistic.
                      if (confirmedResult) onActed(confirmedResult);
                      resetForm();
                      setOpen(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
                <h2 id={titleId} className="text-base font-semibold text-[var(--smc-charcoal)]">
                  {actionLabel} this message?
                </h2>
                <p id={descriptionId} className="text-sm text-[var(--smc-charcoal-soft)]">
                  {action === "hide_message"
                    ? "This removes the message's content from both people in this conversation, including its sender. It can be reversed at any time — no other action is taken."
                    : "This makes the message's content visible to both people in this conversation again. No other action is taken."}
                </p>

                <div className="flex flex-col gap-1">
                  <label htmlFor={`${titleId}-note`} className="text-xs font-semibold text-[var(--smc-charcoal)]">
                    Note (optional)
                  </label>
                  <textarea
                    id={`${titleId}-note`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    disabled={submitting}
                    rows={3}
                    aria-describedby={noteCountId}
                    className="min-h-[44px] resize-none rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-surface)] px-3 py-2 text-sm text-[var(--smc-charcoal)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p id={noteCountId} className="text-[11px] text-[var(--smc-charcoal-faint)]">
                    {note.trim().length} / {REVIEW_NOTE_MAX_LENGTH}
                  </p>
                </div>

                {validationError && (
                  <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
                    {validationError}
                  </p>
                )}
                {submitError && (
                  <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
                    {submitError}
                  </p>
                )}

                <div className="mt-1 flex justify-end gap-2">
                  <Button type="button" variant="ghost" ref={cancelRef} onClick={requestClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" disabled={submitting}>
                    {submitting ? `${actionLabel === "Hide" ? "Hiding" : "Restoring"}…` : actionLabel}
                  </Button>
                </div>
                {submitting && (
                  <p role="status" className="sr-only">
                    Submitting, please wait.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
