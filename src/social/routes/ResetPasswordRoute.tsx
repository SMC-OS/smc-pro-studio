import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { completeAuthRedirect, getAuthSession } from "../../services/authClient";

/**
 * Destination of the Supabase password-recovery email link
 * (`requestPasswordReset` in authClient.ts redirects to
 * `/auth/reset-password`). Locked to the "reset" mode — no tab-switching
 * away from it — mirroring the legacy portal's `portalView === "reset"`
 * handling in App.tsx.
 */
export default function ResetPasswordRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = new URL(window.location.href);
      const hasCallbackCredentials = current.searchParams.has("code") || current.searchParams.has("token_hash") || current.hash.includes("access_token=");
      if (hasCallbackCredentials) await completeAuthRedirect();
      const session = await getAuthSession({ includeServerRoles: false });
      if (active) setState(session?.emailVerified ? "ready" : "invalid");
    })().catch(() => {
      if (active) setState("invalid");
    });
    return () => { active = false; };
  }, []);

  if (state === "checking") return <p className="py-8 text-center text-sm" role="status">Checking your password-reset link…</p>;
  if (state === "invalid") {
    return (
      <div className="mx-auto max-w-md py-8 text-center" role="alert">
        <h1 className="smc-editorial text-2xl">Password-reset link unavailable</h1>
        <p className="mt-3 text-sm">This link is invalid, expired, or already used. Request a new reset message and use only the newest one.</p>
        <button type="button" onClick={() => navigate("/auth")} className="mt-5 min-h-[44px] font-semibold underline">Return to sign in</button>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-6">
      <AuthForm initialMode="reset" lockMode onSuccess={() => navigate("/profile")} />
    </div>
  );
}
