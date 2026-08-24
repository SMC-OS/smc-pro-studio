import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";

/**
 * Destination of the Supabase password-recovery email link
 * (`requestPasswordReset` in authClient.ts redirects to
 * `/auth/reset-password`). Locked to the "reset" mode — no tab-switching
 * away from it — mirroring the legacy portal's `portalView === "reset"`
 * handling in App.tsx.
 */
export default function ResetPasswordRoute() {
  const navigate = useNavigate();
  return (
    <div className="flex justify-center py-6">
      <AuthForm initialMode="reset" lockMode onSuccess={() => navigate("/profile")} />
    </div>
  );
}
