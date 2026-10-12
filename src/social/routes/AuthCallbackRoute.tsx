import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeAuthRedirect } from "../../services/authClient";

export default function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    let active = true;
    void completeAuthRedirect()
      .then(() => {
        if (!active) return;
        setMessage("Your email is verified. Continuing securely…");
        navigate("/auth?verification=success", { replace: true });
      })
      .catch(() => {
        if (!active) return;
        navigate("/auth?verification=failed", { replace: true });
      });
    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-6 text-center" role="status" aria-live="polite">
      <h1 className="smc-editorial text-2xl text-[var(--smc-charcoal)]">Email verification</h1>
      <p className="mt-3 text-sm text-[var(--smc-charcoal-soft)]">{message}</p>
    </div>
  );
}
