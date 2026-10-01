import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorState, LoadingState } from "./StateViews";
import { Button } from "./ui";
import {
  canCancel,
  cancelAccountDeletion,
  fetchActiveDeletionRequest,
  requestAccountDeletion,
  type DeletionRequest,
} from "../services/accountClient";
import { SUPPORT_EMAIL, supportMailto } from "../contact";

/**
 * Account deletion for a signed-in member, shared by /settings and
 * /delete-account. Request → typed confirmation → scheduled for the end of the
 * cancellation window → cancellable until then. The copy never says the
 * account has been deleted and never invents a retention period: the only
 * date shown is the server's own scheduled_for.
 */

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; request: DeletionRequest | null };

export const CONFIRM_WORD = "DELETE";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export function DeleteAccountPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchActiveDeletionRequest()
      .then((request) => setState({ status: "ready", request }))
      .catch((error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : "Your account status could not be loaded." }),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (confirming) inputRef.current?.focus();
  }, [confirming]);

  async function run(action: () => Promise<DeletionRequest>, onDone: (request: DeletionRequest) => void) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      onDone(await action());
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const request = state.status === "ready" ? state.request : null;

  return (
    <section aria-labelledby="delete-account-heading" className="flex flex-col gap-3">
      <h2 id="delete-account-heading" className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">
        Delete account
      </h2>
      {actionError && (
        <p role="alert" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
          {notice}
        </p>
      )}
      {state.status === "loading" && <LoadingState label="Checking account status" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}

      {state.status === "ready" && request && (
        <div className="flex flex-col gap-3 text-sm text-[var(--smc-charcoal-soft)]">
          <p>
            <span className="font-semibold text-[var(--smc-charcoal)]">You asked to delete your account on {formatDate(request.requested_at)}.</span>{" "}
            {request.scheduled_for && canCancel(request)
              ? `Unless you cancel, it will be deleted after ${formatDate(request.scheduled_for)}.`
              : "Deletion is being processed."}
          </p>
          {canCancel(request) ? (
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={busy}
              onClick={() =>
                void run(cancelAccountDeletion, () => {
                  setState({ status: "ready", request: null });
                  setNotice("Deletion cancelled. Your account will stay open.");
                })
              }
            >
              {busy ? "Cancelling…" : "Cancel deletion"}
            </Button>
          ) : (
            <p>
              It can no longer be cancelled in the app. If you need help, email{" "}
              <a className="font-semibold underline" href={supportMailto("Account deletion")}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          )}
        </div>
      )}

      {state.status === "ready" && !request && !confirming && (
        <>
          <p className="text-sm text-[var(--smc-charcoal-soft)]">
            Nothing changes until the cancellation period ends — you can keep using the app and cancel at any time. When the deletion is
            processed, your profile, professional details, posts, comments, connections and the text of your messages are removed, and
            your sign-in is closed. Safety records — reports, and messages that were reported — are kept, but no longer linked to your name or email.
          </p>
          <Button type="button" variant="secondary" className="self-start" onClick={() => { setConfirming(true); setNotice(null); }}>
            Delete my account
          </Button>
        </>
      )}

      {state.status === "ready" && !request && confirming && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (typed.trim() !== CONFIRM_WORD) {
              setActionError(`Type ${CONFIRM_WORD} to confirm.`);
              return;
            }
            void run(requestAccountDeletion, (created) => {
              setConfirming(false);
              setTyped("");
              setState({ status: "ready", request: created });
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Type {CONFIRM_WORD} to confirm you want to delete your account
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-[44px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-base text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Requesting…" : "Request deletion"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setTyped("");
                setActionError(null);
              }}
            >
              Keep my account
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
