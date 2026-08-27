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
 * Navigation only happens after createOrGetDirectConversation's RPC call
 * resolves successfully (no optimistic navigation); a block/RLS/RPC error
 * is shown inline and stays retryable since `busy` always resets in
 * `finally`.
 */
export function MessageButton({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
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
      <Button type="button" variant="secondary" onClick={() => void handleClick()} disabled={busy}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {busy ? "Starting…" : "Message"}
      </Button>
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {error}
        </p>
      )}
    </div>
  );
}
