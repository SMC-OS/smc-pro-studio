import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "./ui";
import { createOrGetDirectConversation } from "../services/messagingClient";

/**
 * "Message" entry point on another member's profile. Never rendered for a
 * guest or on the viewer's own profile — PublicProfileRoute only mounts
 * this inside its `canActOnRelationship` (authenticated, not-own-profile)
 * branch, same gating FollowButton/ConnectButton already use.
 *
 * `blocked` is the caller's own confirmed block state for this profile,
 * owned by PublicProfileRoute (see BlockButton.tsx for why this is lifted
 * rather than shared via a global event): `false` once genuinely confirmed
 * not-blocked, `true` once genuinely confirmed blocked, `null` while that
 * state is still loading or came back unavailable. `createOrGetDirectConversation`
 * is never called for anything but a confirmed `false` — never while
 * loading, never while unavailable, never while confirmed blocked — so
 * there is no window where a stale/optimistic guess could start a
 * conversation this profile's own block state should have prevented.
 *
 * Navigation only happens after createOrGetDirectConversation's RPC call
 * resolves successfully (no optimistic navigation); a block/RLS/RPC error
 * is shown inline and stays retryable since `busy` always resets in
 * `finally`. If the *target* has blocked the caller, that RPC already
 * collapses to the same generic "This conversation is unavailable..."
 * text as every other cause (Slice C.1) — this component does nothing
 * special for that case and must not translate it into anything more
 * specific, since doing so would reveal the reverse block direction.
 */
export function MessageButton({ userId, blocked }: { userId: string; blocked: boolean | null }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canMessage = blocked === false;

  async function handleClick() {
    if (busy || !canMessage) return;
    setBusy(true);
    setError(null);
    try {
      const conversationId = await createOrGetDirectConversation(userId);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This conversation could not be started right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" onClick={() => void handleClick()} disabled={busy || !canMessage}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {busy ? "Starting…" : "Message"}
      </Button>
      {/* Own-action framing only — never a claim about what the other person did. */}
      {blocked === true && <p className="text-xs text-[var(--smc-charcoal-faint)]">You've blocked this person. Unblock them to send a message.</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {error}
        </p>
      )}
    </div>
  );
}
