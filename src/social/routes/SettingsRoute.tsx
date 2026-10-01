import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, LogOut, Mail, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Button, Card, SectionHeading } from "../components/ui";
import { signOut } from "../../services/authClient";
import {
  cancelAccountDeletion,
  fetchActiveDeletionRequest,
  requestAccountDeletion,
  type DeletionRequest,
} from "../services/accountClient";
import { useAuthSession } from "../services/useAuthSession";

/**
 * V1-6 / V1-2: `/settings` — account, support, sign out and account deletion.
 * Deletion is a request: the screen states plainly that the SMC Pro Studio
 * team completes it, and never claims the account is already deleted or gives
 * a completion date (the retention period is an owner/legal decision).
 */

// The owner-approved contact address already published in the Community Guidelines.
export const SUPPORT_EMAIL = "smcprostudio@outlook.com";

type DeletionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; request: DeletionRequest | null };

const rowLink =
  "flex min-h-[48px] items-center gap-3 rounded-[var(--smc-radius-card)] px-1 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:text-[var(--smc-mineral-bronze)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export default function SettingsRoute() {
  const auth = useAuthSession();
  const [deletion, setDeletion] = useState<DeletionState>({ status: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setDeletion({ status: "loading" });
    fetchActiveDeletionRequest()
      .then((request) => setDeletion({ status: "ready", request }))
      .catch((error: unknown) =>
        setDeletion({ status: "error", message: error instanceof Error ? error.message : "Your account status could not be loaded." }),
      );
  }, [auth.status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to manage your account"
        description="Settings are available once you're signed in."
        action={
          <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] underline">
            Sign in
          </Link>
        }
      />
    );
  }

  async function run(action: () => Promise<DeletionRequest>) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const request = await action();
      setDeletion({ status: "ready", request });
      setConfirming(false);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading eyebrow="Account" title="Settings" />

      <Card className="flex flex-col gap-1 p-4">
        {auth.session.email && (
          <p className="px-1 pb-2 text-sm text-[var(--smc-charcoal-soft)]">
            Signed in as <span className="font-semibold text-[var(--smc-charcoal)]">{auth.session.email}</span>
          </p>
        )}
        <Link to="/profile/edit" className={rowLink}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile and visibility
        </Link>
        <Link to="/community-guidelines" className={rowLink}>
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Community Guidelines
        </Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={rowLink}>
          <Mail className="h-4 w-4" aria-hidden="true" /> Contact support ({SUPPORT_EMAIL})
        </a>
        <button type="button" onClick={() => void signOut()} className={`${rowLink} text-left`}>
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">Delete account</h2>
        {actionError && (
          <p role="alert" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
            {actionError}
          </p>
        )}
        {deletion.status === "loading" && <LoadingState label="Checking account status" />}
        {deletion.status === "error" && <ErrorState message={deletion.message} onRetry={load} />}
        {deletion.status === "ready" && deletion.request && (
          <div role="status" className="flex flex-col gap-3 text-sm text-[var(--smc-charcoal-soft)]">
            <p>
              <span className="font-semibold text-[var(--smc-charcoal)]">Deletion requested on {formatDate(deletion.request.requested_at)}.</span>{" "}
              The SMC Pro Studio team will delete your account and the personal data linked to it, and will contact you at your account email if anything is needed first.
            </p>
            {deletion.request.cancellation_requested_at ? (
              <p>
                You asked to cancel this request on {formatDate(deletion.request.cancellation_requested_at)}. If you still want to keep your account, you can also email{" "}
                <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            ) : deletion.request.status === "requested" ? (
              <Button type="button" variant="secondary" className="self-start" disabled={busy} onClick={() => void run(() => cancelAccountDeletion(deletion.request!.id))}>
                {busy ? "Cancelling…" : "Cancel deletion request"}
              </Button>
            ) : (
              <p>
                This request is already being processed. To stop it, email{" "}
                <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            )}
          </div>
        )}
        {deletion.status === "ready" && !deletion.request && !confirming && (
          <>
            <p className="text-sm text-[var(--smc-charcoal-soft)]">
              Ask the SMC Pro Studio team to permanently delete your account and the personal data linked to it.
            </p>
            <Button type="button" variant="secondary" className="self-start" onClick={() => setConfirming(true)}>
              Delete my account
            </Button>
          </>
        )}
        {deletion.status === "ready" && !deletion.request && confirming && (
          <div className="flex flex-col gap-3" aria-labelledby="delete-confirm-heading">
            <p id="delete-confirm-heading" className="text-sm font-semibold text-[var(--smc-charcoal)]">
              Are you sure you want to delete your account?
            </p>
            <p className="text-sm text-[var(--smc-charcoal-soft)]">
              Once the SMC Pro Studio team completes the deletion it can't be undone. You can cancel the request here until it's being processed.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button ref={confirmRef} type="button" disabled={busy} onClick={() => void run(requestAccountDeletion)}>
                {busy ? "Requesting…" : "Yes, request deletion"}
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
                Keep my account
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
