import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "./ui";
import type { AuthSessionState } from "../services/useAuthSession";

/**
 * Presentational Stories tray. The Stories feature itself (expiry, views,
 * contextual actions, reporting) has no schema or service layer yet — see
 * tasks/todo.md — so this deliberately shows only what's real: an
 * "add your story" affordance for signed-in users (routes to Create, the
 * only real publishing surface today) and an honest note for guests.
 * No other users' story rings are rendered because none exist — adding
 * placeholder rings would read as fake activity.
 */
export function StoriesTray({ auth, displayName }: { auth: AuthSessionState; displayName?: string }) {
  if (auth.status === "loading") return null;

  return (
    <section aria-label="Stories" className="flex items-center gap-4 overflow-x-auto pb-1">
      {auth.status === "authenticated" ? (
        <Link to="/create" className="group flex flex-col items-center gap-1.5 text-center outline-none">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[var(--smc-border-strong)] bg-[var(--smc-surface-sunken)] transition-colors group-hover:bg-[var(--smc-limestone)]">
            <Avatar name={displayName ?? "You"} size={56} />
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--smc-surface)] text-[var(--smc-ivory)]"
              style={{ background: "var(--smc-mineral-bronze)" }}
              aria-hidden="true"
            >
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </span>
          <span className="text-[11px] font-medium text-[var(--smc-charcoal-soft)]">Your story</span>
        </Link>
      ) : (
        <Link to="/auth" className="flex flex-col items-center gap-1.5 text-center outline-none">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[var(--smc-border-strong)] bg-[var(--smc-surface-sunken)]">
            <Plus className="h-5 w-5 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-medium text-[var(--smc-charcoal-faint)]">Sign in to share</span>
        </Link>
      )}

      <p className="flex-1 text-xs text-[var(--smc-charcoal-faint)]">
        No stories from the community yet — this tray fills in as people start sharing.
      </p>
    </section>
  );
}
