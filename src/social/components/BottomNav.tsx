import { FolderKanban, Home, Sparkles, User, Users } from "lucide-react";
import { Link, matchPath, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/studio", label: "Studio", icon: Sparkles, end: false },
  { to: "/projects", label: "Projects", icon: FolderKanban, end: false },
  { to: "/network", label: "Network", icon: Users, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
] as const;

function findActiveIndex(pathname: string): number {
  const index = NAV_ITEMS.findIndex((item) => matchPath({ path: item.to, end: item.end }, pathname));
  if (index >= 0) return index;
  if (matchPath({ path: "/connections", end: false }, pathname) ||
      matchPath({ path: "/settings", end: false }, pathname)) return 4;
  return -1;
}

/**
 * The indicator is positioned by a fixed five-column grid, not by measuring
 * anchors or the viewport. Its percentage transform is relative to its own
 * one-tab-wide box: no ResizeObserver, animation frame, or orientation state.
 * The reduced-motion variant does not move at all.
 */
export default function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = findActiveIndex(pathname);
  const ActiveIcon = activeIndex >= 0 ? NAV_ITEMS[activeIndex].icon : null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--smc-border)] bg-[var(--smc-surface-raised)]/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "var(--smc-safe-bottom)" }}
    >
      <div className="relative mx-auto max-w-2xl">
        {ActiveIcon && (
          <div
            aria-hidden="true"
            data-testid="raised-active-indicator"
            className="pointer-events-none absolute -top-[26px] left-0 z-10 flex w-1/5 justify-center transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
            style={{ transform: `translate3d(${activeIndex * 100}%,0,0)` }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--smc-border-strong)] bg-[var(--smc-travertine)] text-[var(--smc-charcoal)] shadow-[0_8px_22px_-9px_rgba(34,31,28,.42)] ring-[5px] ring-[var(--smc-surface-raised)]">
              <ActiveIcon className="h-6 w-6" strokeWidth={2} />
            </span>
          </div>
        )}

        <ul className="grid h-[70px] grid-cols-5 items-stretch px-1">
          {NAV_ITEMS.map((item, index) => {
            const active = activeIndex === index;
            return (
              <li key={item.to} className="min-w-0">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full min-h-[48px] w-full flex-col items-center justify-end gap-1 rounded-xl px-0.5 pb-2 pt-1 text-center text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] ${active ? "text-[var(--smc-charcoal)]" : "text-[var(--smc-charcoal-faint)] hover:bg-[var(--smc-limestone)]"}`}
                >
                  <item.icon
                    className={`h-5 w-5 transition-opacity duration-150 ${active ? "opacity-0" : "opacity-100"}`}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
