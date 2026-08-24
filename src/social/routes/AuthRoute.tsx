import { useNavigate, useSearchParams } from "react-router-dom";
import AuthForm from "../components/AuthForm";

export default function AuthRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const initialMode = requestedMode === "register" ? "register" : "login";

  return (
    <div className="flex justify-center py-6">
      <AuthForm initialMode={initialMode} onSuccess={() => navigate("/profile")} />
    </div>
  );
}
