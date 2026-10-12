import { Bell, FolderKanban, Home, MessageCircle, Sparkles, User, Users } from "lucide-react";
import { Link, matchPath, NavLink, useLocation } from "react-router-dom";
import { useAuthSession } from "../services/useAuthSession";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/studio", label: "Studio", icon: Sparkles, end: false },
  { to: "/projects", label: "Projects", icon: FolderKanban, end: false },
  { to: "/network", label: "Network", icon: Users, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
] as const;

function isNavItemActive(item: (typeof NAV_ITEMS)[number], pathname: string): boolean {
  if (matchPath({ path: item.to, end: item.end }, pathname)) return true;
  if (item.to === "/profile" && Boolean(matchPath({ path: "/connections", end: false }, pathname))) return true;
  if (item.to === "/profile" && Boolean(matchPath({ path: "/settings", end: false }, pathname))) return true;
  return false;
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
      <div className="px-2">
        <span className="text-lg font-semibold tracking-[-0.03em] text-[var(--smc-charcoal)]">SMC Pro Studio</span>
        <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">Design. Build. Keep the record.</p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-[var(--smc-radius-card)] px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] ${isActive ? "bg-[var(--smc-limestone)] text-[var(--smc-charcoal)]" : "text-[var(--smc-charcoal-faint)] hover:bg-[var(--smc-surface-sunken)]"}`}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.1 : 1.7} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {auth.status === "authenticated" && (
        <div className="mb-2 grid gap-1">
          <Link
            to="/notifications"
            className="flex min-h-[48px] items-center gap-3 rounded-[var(--smc-radius-card)] px-3 text-sm font-medium text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-surface-sunken)]"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
            Notifications
          </Link>
          <Link
            to="/messages"
            className="flex min-h-[48px] items-center gap-3 rounded-[var(--smc-radius-card)] px-3 text-sm font-medium text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-surface-sunken)]"
          >
            <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            Messages
          </Link>
        </div>
      )}

      {auth.status === "guest" && (
        <NavLink to="/auth" className="mt-4 flex min-h-[48px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]">
          Sign in
        </NavLink>
      )}
    </aside>
  );
}
