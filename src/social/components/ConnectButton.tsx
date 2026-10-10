import { useState } from "react";
import { Check, Clock, UserRoundPlus } from "lucide-react";
import { Button } from "./ui";
import { requestConnection, respondToConnection, revokeConnectionRequest, type ConnectionState } from "../services/socialClient";
import { describeError } from "../services/networkErrors";

/**
 * Connect — a mutual request/accept relationship, kept conceptually and
 * visually separate from Follow (unilateral, no acceptance step). States:
 * none → Connect, pending_outgoing → Requested (tap to withdraw),
 * pending_incoming → Accept / Decline, connected → a static badge.
 *
 * There's deliberately no "disconnect" action once accepted: the
 * `connections` RLS policies only allow a transition out of `pending`
 * (`connections_addressee_respond`, `connections_requester_revoke`) — there
 * is no policy that lets either party change an `accepted` row, so an
 * "unconnect" control here would either silently fail or need a new
 * migration. Out of scope for this slice; noted as an open question in the
 * phase report rather than half-built.
 */
export function ConnectButton({
  userId,
  initialState,
  initialConnectionId,
  disabled,
}: {
  userId: string;
  initialState: ConnectionState;
  initialConnectionId: string | null;
  /** Set when the viewer isn't signed in or is viewing their own profile — self-connect is also blocked at the database level. */
  disabled?: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const id = await requestConnection(userId);
      setConnectionId(id);
      setState("pending_outgoing");
    } catch (err) {
      setError(describeError(err, "This request could not be sent right now.").message);
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (busy || !connectionId) return;
    setBusy(true);
    setError(null);
    try {
      await revokeConnectionRequest(connectionId);
      setState("none");
    } catch (err) {
      setError(describeError(err, "This request could not be withdrawn right now.").message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(accept: boolean) {
    if (busy || !connectionId) return;
    setBusy(true);
    setError(null);
    try {
      await respondToConnection(connectionId, accept);
      setState(accept ? "connected" : "none");
    } catch (err) {
      setError(describeError(err, "This request could not be updated right now.").message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {state === "none" && (
        <Button type="button" variant="secondary" onClick={() => void handleConnect()} disabled={disabled || busy}>
          <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
          Connect
        </Button>
      )}
      {state === "pending_outgoing" && (
        <Button type="button" variant="ghost" onClick={() => void handleWithdraw()} disabled={disabled || busy} aria-label="Withdraw connection request">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Requested
        </Button>
      )}
      {state === "pending_incoming" && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleRespond(true)} disabled={disabled || busy}>
            Accept
          </Button>
          <Button type="button" variant="ghost" onClick={() => void handleRespond(false)} disabled={disabled || busy}>
            Decline
          </Button>
        </div>
      )}
      {state === "connected" && (
        <span className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal-soft)]">
          <Check className="h-4 w-4" aria-hidden="true" style={{ color: "var(--smc-mineral-bronze)" }} />
          Connected
        </span>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {error}
        </p>
      )}
    </div>
  );
}
