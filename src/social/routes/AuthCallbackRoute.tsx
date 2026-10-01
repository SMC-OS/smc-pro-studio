import { Link, Navigate } from "react-router-dom";
import { EmptyState, LoadingState } from "../components/StateViews";
import { useAuthRedirectStatus } from "../../services/authRedirect";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Landing screen for email-verification and OAuth sign-in links
 * (getAuthRedirectUrl's default path). Shared by the web, where SocialApp
 * completes the redirect on load, and native, where authDeepLinks.ts handles
 * smcprostudio://auth/callback. Never claims success before the server has
 * issued a session.
 */
const linkClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]";

export default function AuthCallbackRoute() {
  const redirect = useAuthRedirectStatus();
  const auth = useAuthSession();

  if (redirect.state === "error") {
    return (
      <>
        <h1 className="sr-only">Sign-in link</h1>
        <EmptyState
          title="This link can't be used"
          description={redirect.message}
          action={<Link to="/auth" className={linkClass}>Go to sign in</Link>}
        />
      </>
    );
  }

  if (redirect.state === "pending" || redirect.state === "idle" || auth.status === "loading") {
    return <LoadingState label="Confirming your account" />;
  }

  if (auth.status === "authenticated") return <Navigate to="/profile" replace />;

  return (
    <>
      <h1 className="sr-only">Sign-in link</h1>
      <EmptyState
        title="Sign in to continue"
        description="If you've just confirmed your email, sign in with your email and password to continue."
        action={<Link to="/auth" className={linkClass}>Sign in</Link>}
      />
    </>
  );
}
