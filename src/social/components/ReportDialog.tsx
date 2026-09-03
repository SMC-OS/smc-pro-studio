import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Flag } from "lucide-react";
import { Button } from "./ui";
import {
  submitMessageReport,
  submitProfileReport,
  REPORT_CATEGORIES,
  REPORT_DETAILS_MAX_LENGTH,
  type ReportCategory,
  type ReportReceipt,
} from "../services/reportingClient";

/**
 * Phase 4 Slice I: one reusable, accessible reporting dialog for both
 * profile and message reporting, following the exact focus-trap/Escape/
 * focus-restore contract BlockButton.tsx already establishes (the only
 * existing modal convention in this codebase) — reused here rather than
 * reinvented, with one deliberate difference: Escape (and the backdrop) are
 * inert while a submission is in flight, per this slice's own requirement.
 *
 * Self-contained (trigger button + dialog together), the same shape as
 * BlockButton/MessageButton, rather than a lifted-open-state variant: a
 * "Report message" action is rendered once per message in ThreadView, so
 * each mounted instance owning its own trigger avoids coordinating a single
 * shared dialog across an unbounded, paginated, Realtime-growing list.
 *
 * Never exposes a raw UUID anywhere in its rendered text — `target` carries
 * only what is needed to label the dialog (a profile's already-public
 * display name, or nothing at all for a message, since the message itself
 * is already visible in the thread the trigger sits next to).
 */
export type ReportTarget = { kind: "profile"; reportedUserId: string; profileLabel: string } | { kind: "message"; messageId: string };

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_or_abuse: "Hate or abuse",
  threat_or_violence: "Threat or violence",
  sexual_content: "Sexual content",
  impersonation: "Impersonation",
  scam_or_fraud: "Scam or fraud",
  other: "Something else",
};

export function ReportDialog({
  target,
  triggerLabel = "Report",
  triggerClassName = "",
  onReported,
}: {
  target: ReportTarget;
  triggerLabel?: string;
  /** Merged onto the trigger button's own classes — layout/density only, never removes the shared 44px minimum touch target. */
  triggerClassName?: string;
  /** Called only after a real, server-confirmed report receipt — never optimistically. */
  onReported?: (receipt: ReportReceipt) => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const titleId = useId();
  const descriptionId = useId();
  const detailsCountId = useId();

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
    setCategory("");
    setDetails("");
    setValidationError(null);
    setSubmitError(null);
    setSucceeded(false);
  }

  function requestClose() {
    if (submittingRef.current) return;
    setOpen(false);
  }

  // Focus-trap/Escape/focus-restore — same contract as BlockButton.tsx's own
  // confirmation dialog, deliberately re-run only on `open` (never on
  // `submitting`, read via a ref inside the closure instead) so a submit
  // in flight never yanks focus back to Cancel mid-attempt.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Focus the least-destructive control first — mirrors BlockButton — so a
    // stray Enter/Space while the dialog is opening can never submit early.
    cancelRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      const panel = dialogRef.current;
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled]), select:not([disabled]), textarea:not([disabled])")).filter(
        (el) => el.offsetParent !== null
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Slice I requirement: Escape closes only when not submitting —
        // unlike BlockButton's own Escape handler, which allows it
        // unconditionally, since a block/unblock is a single fast RPC with
        // no user-entered form state to protect against an accidental
        // abandon mid-flight.
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
  // into confirmed success, while the dialog is still open. Separate from
  // the open-effect above (its own `[succeeded, open]` dependency array
  // never re-runs on an `open` toggle alone, so it never disturbs that
  // effect's own initial Cancel focus when the dialog first opens) and
  // deliberately a no-op whenever `succeeded` is false — `handleSubmit`
  // below only ever sets `succeeded` true after a real, server-confirmed
  // receipt, so this can never fire before that boundary, and it never
  // fires for an unmounted/identity-changed instance because handleSubmit's
  // own `mountedRef` guard already prevents `succeeded` from ever becoming
  // true after unmount in the first place (checked again here defensively).
  // The Cancel button that may have had focus at submit time is removed
  // from the DOM in this same transition (the form is swapped for the
  // success view), which is exactly the "focus stranded on a removed
  // element" bug this effect corrects.
  useEffect(() => {
    if (!open || !succeeded || !mountedRef.current) return;
    closeRef.current?.focus();
  }, [succeeded, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setValidationError(null);
    setSubmitError(null);

    if (!category) {
      setValidationError("Choose a reason for this report.");
      return;
    }
    // Mirrors reportingClient.ts's own prepareDetails rules exactly, so an
    // invalid submission never even reaches submitProfileReport/
    // submitMessageReport — the service function re-validates regardless
    // (never trust a caller, even this dialog), but this gives the person
    // reporting instant, accessible feedback instead of a round trip.
    const trimmedDetails = details.trim();
    if (details !== "" && trimmedDetails === "") {
      setValidationError("Details can't be just spaces.");
      return;
    }
    if (trimmedDetails.length > REPORT_DETAILS_MAX_LENGTH) {
      setValidationError(`Details must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (category === "other" && trimmedDetails === "") {
      setValidationError('Details are required when reporting "Something else."');
      return;
    }

    setSubmitting(true);
    try {
      const receipt =
        target.kind === "profile"
          ? await submitProfileReport(target.reportedUserId, category, trimmedDetails || undefined)
          : await submitMessageReport(target.messageId, category, trimmedDetails || undefined);
      if (!mountedRef.current) return;
      // Never optimistic: this only ever runs after a real, server-confirmed
      // receipt — a duplicate-pending resubmission returns the identical
      // shape of receipt as a first-time report, so this same neutral
      // acknowledgement is shown either way, never revealing which case it
      // was and never exposing the receipt's own id.
      setSucceeded(true);
      onReported?.(receipt);
    } catch (err) {
      if (!mountedRef.current) return;
      // Category/details are deliberately left untouched on failure — see requirement.
      setSubmitError(err instanceof Error ? err.message : "We couldn't submit this report. Please try again.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className={`text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-mineral-clay)]/10 ${triggerClassName}`}
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
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
                  Report received
                </h2>
                {/* Neutral by design: never names the reported person/message, never
                    claims any action was taken against them, and never exposes the
                    receipt's own id — see the requirement that success copy must
                    state only that the report was received for review. The second
                    sentence sets an honest expectation (no notification system
                    exists) rather than leaving the reporter to assume one does. */}
                <p id={descriptionId} role="status" className="text-sm text-[var(--smc-charcoal-soft)]">
                  Thank you. This has been sent to our moderators for review. You may not receive an individual update on the
                  outcome.
                </p>
                <div className="mt-1 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    ref={closeRef}
                    onClick={() => {
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
                  {target.kind === "profile" ? `Report ${target.profileLabel}?` : "Report this message?"}
                </h2>
                <p id={descriptionId} className="text-sm text-[var(--smc-charcoal-soft)]">
                  Tell us what's wrong. Our moderators will review this report. Report details are restricted to authorised
                  moderators, except where disclosure is required for safety, legal, or regulatory reasons — we don't promise
                  anonymity. See our{" "}
                  <Link to="/community-guidelines" className="font-semibold text-[var(--smc-charcoal)] underline underline-offset-2">
                    Community Guidelines
                  </Link>
                  .
                </p>

                <div className="flex flex-col gap-1">
                  <label htmlFor={`${titleId}-category`} className="text-xs font-semibold text-[var(--smc-charcoal)]">
                    Reason
                  </label>
                  <select
                    id={`${titleId}-category`}
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ReportCategory)}
                    disabled={submitting}
                    className="min-h-[44px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-surface)] px-3 text-sm text-[var(--smc-charcoal)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Choose a reason…
                    </option>
                    {REPORT_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {CATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor={`${titleId}-details`} className="text-xs font-semibold text-[var(--smc-charcoal)]">
                    Details {category === "other" ? "(required)" : "(optional)"}
                  </label>
                  <textarea
                    id={`${titleId}-details`}
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    disabled={submitting}
                    rows={3}
                    // Deliberately no native `maxLength` — it counts raw
                    // characters, but the authoritative limit (here and in
                    // reportingClient.ts's own prepareDetails) is 1000
                    // *trimmed* characters. A native cap would silently
                    // block otherwise-valid input that merely has
                    // leading/trailing whitespace pushing its raw length
                    // over 1000 while its trimmed length stays within the
                    // limit. The trimmed-length check in handleSubmit below
                    // (and the identical one server-side) remains the real
                    // enforcement — never silently truncated, always
                    // rejected with a visible, correctable message instead.
                    aria-describedby={detailsCountId}
                    className="min-h-[44px] resize-none rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-surface)] px-3 py-2 text-sm text-[var(--smc-charcoal)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p id={detailsCountId} className="text-[11px] text-[var(--smc-charcoal-faint)]">
                    {details.trim().length} / {REPORT_DETAILS_MAX_LENGTH}
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
                  <Button type="submit" variant="secondary" disabled={submitting} className="text-[var(--smc-mineral-clay)]">
                    {submitting ? "Submitting…" : "Submit report"}
                  </Button>
                </div>
                {submitting && (
                  <p role="status" className="sr-only">
                    Submitting your report, please wait.
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
