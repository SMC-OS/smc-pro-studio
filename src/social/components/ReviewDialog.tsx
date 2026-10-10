import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "./ui";
import { reviewReport, REVIEW_NOTE_MAX_LENGTH, type ReviewDecision, type ReviewResult } from "../services/moderationClient";
import { describeError } from "../services/networkErrors";

/**
 * Phase 4 Slice J: the Resolve/Dismiss confirmation dialog for one pending
 * report. Structurally mirrors ReportDialog.tsx's own focus-trap/Escape/
 * focus-restore/confirmed-success-only contract exactly (the same
 * discipline that dialog already established, itself mirroring
 * BlockButton.tsx before it) rather than reinventing a third variant —
 * including ReportDialog's own corrected-in-review focus-to-Close-on-
 * confirmed-success behavior (a dedicated `closeRef`, moved to only on the
 * transition into `succeeded`, never before, never disturbing initial
 * Cancel focus).
 *
 * Deliberately not reusable across "resolve" and "dismiss" via a single
 * shared instance per queue item — like ReportDialog, one instance is
 * mounted per pending queue row (self-contained trigger + dialog), so the
 * `decision` this instance acts on is fixed for its whole lifetime; the
 * queue only ever renders both a Resolve and a Dismiss trigger for the same
 * report, each its own ReviewDialog instance.
 */
export function ReviewDialog({
  reportId,
  decision,
  triggerLabel,
  onReviewed,
}: {
  reportId: string;
  decision: ReviewDecision;
  triggerLabel: string;
  /** Called only after a real, server-confirmed review result — never optimistically. */
  onReviewed: (result: ReviewResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  // The confirmed result is held here, not handed to the parent (via
  // `onReviewed`) until Close is actually clicked. This dialog is rendered
  // conditionally by its own parent (ReportDetail shows a ReviewDialog only
  // while `item.status === "pending"`); calling `onReviewed` the instant
  // the RPC confirms would let the parent update that same item's status
  // immediately, which would unmount this very dialog before its own
  // "Report resolved" success view — and its Close button — ever had a
  // chance to render. Deferring the parent notification to the Close click
  // is what makes "close or transition to a clear success acknowledgement
  // only after a confirmed receipt" actually observable to the user,
  // rather than a state transition that exists for one render and is
  // immediately swept away.
  const [confirmedResult, setConfirmedResult] = useState<ReviewResult | null>(null);

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

  // Focus-trap/Escape/focus-restore — identical contract to ReportDialog.tsx's own dialog.
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
  // into confirmed success — see ReportDialog.tsx's identical effect for
  // the full rationale (a Copilot-flagged fix in that dialog, applied here
  // from the start rather than repeating the same bug).
  useEffect(() => {
    if (!open || !succeeded || !mountedRef.current) return;
    closeRef.current?.focus();
  }, [succeeded, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setValidationError(null);
    setSubmitError(null);

    // Mirrors moderationClient.ts's own prepareReviewNote rules exactly.
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
      const result = await reviewReport(reportId, decision, trimmedNote || undefined);
      if (!mountedRef.current) return;
      // Shows this dialog's own success view immediately — but the parent
      // is deliberately not told yet (see confirmedResult's own comment
      // above); that happens only when the user clicks Close below.
      setSucceeded(true);
      setConfirmedResult(result);
    } catch (err) {
      if (!mountedRef.current) return;
      // Note is deliberately left untouched on failure — this covers both a
      // genuine backend failure and the concurrent-already-reviewed case
      // (review_report()'s own atomic transition rejects a second call
      // identically) — the queue's own Refresh is the recovery path either way.
      setSubmitError(describeError(err, "This report could not be reviewed. Please try again.").message);
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  const actionLabel = decision === "resolved" ? "Resolve" : "Dismiss";

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
                  Report {decision === "resolved" ? "resolved" : "dismissed"}
                </h2>
                {/* Never claims a warning, removal, suspension, block, or
                    notification was issued — this only records a review
                    decision. */}
                <p id={descriptionId} role="status" className="text-sm text-[var(--smc-charcoal-soft)]">
                  Report {decision === "resolved" ? "resolved" : "dismissed"}. No automatic action was taken.
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
                      if (confirmedResult) onReviewed(confirmedResult);
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
                  {actionLabel} this report?
                </h2>
                <p id={descriptionId} className="text-sm text-[var(--smc-charcoal-soft)]">
                  This records your review decision. No automatic action is taken against any user, profile, message, or conversation.
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
                    {submitting ? `${actionLabel === "Resolve" ? "Resolving" : "Dismissing"}…` : actionLabel}
                  </Button>
                </div>
                {submitting && (
                  <p role="status" className="sr-only">
                    Submitting your decision, please wait.
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
