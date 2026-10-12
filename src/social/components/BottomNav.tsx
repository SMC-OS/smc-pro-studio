import { FolderKanban, Home, Sparkles, User, Users } from "lucide-react";
import { Link, matchPath, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/studio", label: "Studio", icon: Sparkles, end: false },
  { to: "/projects", label: "Projects", icon: FolderKanban, end: false },
  { to: "/network", label: "Network", icon: Users, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
] as const;

function findActiveIndex(pathname: string): number | null {
  const matched = NAV_ITEMS.findIndex((item) => matchPath({ path: item.to, end: item.end }, pathname));
  if (matched !== -1) return matched;
  if (matchPath({ path: "/connections", end: false }, pathname) || matchPath({ path: "/settings", end: false }, pathname)) {
    return NAV_ITEMS.findIndex((item) => item.to === "/profile");
  }
  return null;
}

// The previous animated notch used a flat bar when cx === null. The static
// bar below keeps that same no-active-tab contract without measuring or
// animating layout on mobile.

export default function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = findActiveIndex(pathname);

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--smc-border)] bg-[var(--smc-surface-raised)]/95 backdrop-blur lg:hidden" style={{ paddingBottom: "var(--smc-safe-bottom)" }}>
      <ul className="mx-auto flex h-16 max-w-2xl items-stretch justify-between px-1">
        {NAV_ITEMS.map((item, index) => {
          const isBeadActive = activeIndex === index;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={isBeadActive ? "page" : undefined}
                className={`mx-0.5 flex min-h-[48px] h-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] ${isBeadActive ? "bg-[var(--smc-limestone)] text-[var(--smc-charcoal)]" : "text-[var(--smc-charcoal-faint)] hover:bg-[var(--smc-limestone)]"}`}
              >
                <item.icon className="h-5 w-5" strokeWidth={isBeadActive ? 2 : 1.7} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
