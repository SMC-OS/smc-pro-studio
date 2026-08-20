import { Home, MessageCircle, Plus, User, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Desktop/tablet-landscape (lg: and up) navigation. Deliberately NOT the
 * mobile bottom bar stretched sideways — a vertical rail is the correct
 * pattern at this width, with its own simpler active-state treatment (a
 * soft rounded highlight) rather than the floating bead/notch mechanism,
 * which is a mobile-specific affordance. Hidden below `lg`; see
 * BottomNav.tsx's `lg:hidden` for the mobile counterpart.
 */
const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true, emphasized: false },
  { to: "/network", label: "Network", icon: Users, end: false, emphasized: false },
  { to: "/create", label: "Create", icon: Plus, end: false, emphasized: true },
  { to: "/messages", label: "Messages", icon: MessageCircle, end: false, emphasized: false },
  { to: "/profile", label: "Profile", icon: User, end: false, emphasized: false },
] as const;

export default function NavRail() {
  const auth = useAuthSession();

  return (
    <aside
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-[var(--smc-border)] lg:bg-[var(--smc-surface-raised)] lg:px-4 lg:py-6"
      style={{ paddingTop: "calc(var(--smc-safe-top) + 1.5rem)" }}
      aria-label="Primary"
    >
      <span className="smc-editorial px-2 text-lg font-medium text-[var(--smc-charcoal)]">SMC Pro Studio</span>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex min-h-[44px] items-center gap-3 rounded-[var(--smc-radius-card)] px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                  style={{
                    background: isActive ? (item.emphasized ? "var(--smc-mineral-bronze)" : "var(--smc-limestone)") : "transparent",
                  }}
                >
                  <item.icon
                    className="h-[18px] w-[18px]"
                    strokeWidth={isActive ? 2.2 : 1.7}
                    color={isActive ? (item.emphasized ? "#fdfbf7" : "var(--smc-charcoal)") : "var(--smc-charcoal-faint)"}
                    aria-hidden="true"
                  />
                </span>
                <span className={isActive ? "text-[var(--smc-charcoal)]" : "text-[var(--smc-charcoal-faint)]"}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {auth.status === "guest" && (
        <NavLink
          to="/auth"
          className="mt-4 flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
        >
          Sign in
        </NavLink>
      )}
    </aside>
  );
}
