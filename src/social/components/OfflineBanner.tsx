import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../services/networkStatus";

/**
 * V1-7: application-level connectivity banner, rendered once by AppShell.
 * It sits in the page flow under the header (never over the navigation),
 * is announced politely to screen readers, takes no focus, and clears itself
 * when the connection returns — briefly confirming "You're back online".
 */
export const OFFLINE_BANNER_TEXT = "You're offline. Some actions may be unavailable until your connection returns.";
export const BACK_ONLINE_TEXT = "You're back online.";
const BACK_ONLINE_MS = 4000;

export function OfflineBanner({ backOnlineMs = BACK_ONLINE_MS }: { backOnlineMs?: number }) {
  const online = useOnlineStatus();
  const wasOffline = useRef(!online);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowBackOnline(true);
    const timer = setTimeout(() => setShowBackOnline(false), backOnlineMs);
    return () => clearTimeout(timer);
  }, [online, backOnlineMs]);

  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {!online && (
        <p className="mb-4 flex items-start gap-2.5 rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-4 py-3 text-sm text-[var(--smc-charcoal)]">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
          <span>{OFFLINE_BANNER_TEXT}</span>
        </p>
      )}
      {online && showBackOnline && (
        <p className="mb-4 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 text-sm text-[var(--smc-charcoal-soft)]">
          {BACK_ONLINE_TEXT}
        </p>
      )}
    </div>
  );
}
