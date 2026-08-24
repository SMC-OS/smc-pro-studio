import { Home, MessageCircle, Plus, User, Users } from "lucide-react";
import { Link, matchPath, NavLink, useLocation } from "react-router-dom";
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

/**
 * Mirrors BottomNav's findActiveIndex: /connections is reached only from
 * ProfileRoute's own "Connections" link and isn't a primary route of its
 * own (see SocialApp.tsx's route comment / AGENTS.md), so it should still
 * highlight Profile here too - keeping desktop and mobile nav consistent
 * about which tab owns it, both visually and via `aria-current`.
 */
function isNavItemActive(item: (typeof NAV_ITEMS)[number], pathname: string): boolean {
  if (matchPath({ path: item.to, end: item.end }, pathname)) return true;
  return item.to === "/profile" && Boolean(matchPath({ path: "/connections", end: false }, pathname));
}

export default function NavRail() {
  const auth = useAuthSession();
  const location = useLocation();

  return (
    <aside
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-[var(--smc-border)] lg:bg-[var(--smc-surface-raised)] lg:px-4 lg:py-6"
      style={{ paddingTop: "calc(var(--smc-safe-top) + 1.5rem)" }}
      aria-label="Primary"
    >
      <span className="smc-editorial px-2 text-lg font-medium text-[var(--smc-charcoal)]">SMC Pro Studio</span>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          // A plain `Link`, not `NavLink`: `NavLink` always overwrites a
          // caller-supplied `aria-current` with its own native-isActive
          // computation, which disagrees with `isNavItemActive` for Profile
          // while on /connections (see isNavItemActive above and
          // BottomNav's matching fix).
          const isActive = isNavItemActive(item, location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className="flex min-h-[44px] items-center gap-3 rounded-[var(--smc-radius-card)] px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
            >
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
            </Link>
          );
        })}
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
