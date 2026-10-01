import { Link } from "react-router-dom";
import { EmptyState } from "../components/StateViews";

/** Catch-all for unknown paths, so a mistyped or retired link never renders a blank screen. */
export default function NotFoundRoute() {
  return (
    <>
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        title="Page not found"
        description="This page doesn't exist or is no longer available."
        action={
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
          >
            Go to Home
          </Link>
        }
      />
    </>
  );
}
