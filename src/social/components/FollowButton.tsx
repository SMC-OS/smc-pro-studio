import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "./ui";
import { followUser, unfollowUser } from "../services/socialClient";

/**
 * Follow/unfollow — unilateral, no acceptance step. Deliberately separate
 * from ConnectButton (Connect is a mutual request/accept relationship; see
 * DESIGN.md and the connections table). No follower/following counts are
 * shown anywhere yet — `follows_party_read` RLS only lets the two parties
 * see a given follow row, so a public count can't be computed honestly
 * without a dedicated aggregate, which this slice doesn't add.
 */
export function FollowButton({
  userId,
  initiallyFollowing,
  disabled,
}: {
  userId: string;
  initiallyFollowing: boolean;
  /** Set when the viewer isn't signed in or is viewing their own profile — self-follow is also blocked at the database level. */
  disabled?: boolean;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    const next = !following;
    try {
      if (next) await followUser(userId);
      else await unfollowUser(userId);
      setFollowing(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This could not be updated right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        onClick={() => void toggle()}
        disabled={disabled || busy}
        aria-pressed={following}
      >
        {following ? <UserCheck className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
        {following ? "Following" : "Follow"}
      </Button>
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {error}
        </p>
      )}
    </div>
  );
}
