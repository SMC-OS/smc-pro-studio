import { useNavigate } from "react-router-dom";
import SecureAuthPortal from "../../components/SecureAuthPortal";

/**
 * Reuses the existing, already-correct Supabase auth logic in
 * SecureAuthPortal (real sign-up/sign-in/reset, fail-closed OAuth, account
 * type + professional category with no role escalation). Its dark visual
 * styling has not been reworked to the bright Phase 3 identity yet — that
 * is explicitly deferred to a follow-up design-consolidation slice rather
 * than done as a rushed part of this one.
 */
export default function AuthRoute() {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center py-6">
      <SecureAuthPortal onLoginSuccess={() => navigate("/profile")} onNavigateLanding={() => navigate("/")} />
    </div>
  );
}
