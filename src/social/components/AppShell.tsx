import { MessageCircle } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import NavRail from "./NavRail";
import { OfflineBanner } from "./OfflineBanner";
import { useAuthSession } from "../services/useAuthSession";

export default function AppShell() {
  const auth = useAuthSession();

  return (
    <div className="smc-shell min-h-screen" style={{ paddingTop: "var(--smc-safe-top)" }}>
      <NavRail />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--smc-border)] bg-[var(--smc-surface)]/95 px-4 backdrop-blur lg:hidden">
          <Link to="/" className="text-sm font-semibold tracking-[-0.02em] text-[var(--smc-charcoal)]">
            SMC Pro Studio
          </Link>
          <div className="flex items-center gap-2">
            {auth.status === "authenticated" && (
              <Link
                to="/messages"
                aria-label="Messages"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-limestone)]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
            {auth.status === "guest" && (
              <NavLink to="/auth" className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-2 text-xs font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]">
                Sign in
              </NavLink>
            )}
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5 sm:px-6 lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">
          <OfflineBanner />
          <Outlet context={auth} />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
