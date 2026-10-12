import { useNavigate, useSearchParams } from "react-router-dom";
import AuthForm from "../components/AuthForm";

export default function AuthRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const initialMode = requestedMode === "register" ? "register" : "login";
  const verification = searchParams.get("verification");
  const initialNotice = verification === "success" ? "Your email is verified. You can now use authenticated features." : null;
  const initialError = verification === "failed"
    ? "That authentication link is invalid, expired, or has already been used. Request a new message and use only the newest one."
    : null;

  return (
    <div className="flex justify-center py-6">
      <AuthForm initialMode={initialMode} initialNotice={initialNotice} initialError={initialError} onSuccess={() => navigate("/profile")} />
    </div>
  );
}
