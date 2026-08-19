import { NavLink, Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useAuthSession } from "../services/useAuthSession";

export default function AppShell() {
  const auth = useAuthSession();

  return (
    <div className="smc-shell min-h-screen font-sans" style={{ paddingTop: "var(--smc-safe-top)" }}>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--smc-border)] bg-[var(--smc-surface)]/95 px-4 backdrop-blur">
        <span className="text-sm font-semibold tracking-wide text-[var(--smc-charcoal)]">SMC Pro Studio</span>
        {auth.status === "guest" && (
          <NavLink
            to="/auth"
            className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
          >
            Sign in
          </NavLink>
        )}
      </header>

      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <Outlet context={auth} />
      </main>

      <BottomNav />
    </div>
  );
}
