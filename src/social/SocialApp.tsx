import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthRoute from "./routes/AuthRoute";
import CreateRoute from "./routes/CreateRoute";
import DiscoverRoute from "./routes/DiscoverRoute";
import HomeRoute from "./routes/HomeRoute";
import MessagesRoute from "./routes/MessagesRoute";
import ProfileRoute from "./routes/ProfileRoute";
import PublicProfileRoute from "./routes/PublicProfileRoute";
import ResetPasswordRoute from "./routes/ResetPasswordRoute";
import { completeAuthRedirect } from "../services/authClient";
import "./tokens.css";

// Dev-only component-preview route (see OtpPreviewRoute.tsx) — statically
// imported but only ever registered when import.meta.env.DEV is true, so
// Vite's production `define` folds that check to `if (false)` and Rollup's
// dead-code elimination strips both the branch and this now-unreachable
// import from the production bundle. Verified after `npm run build` by
// grepping dist/ for "otp-preview" / "OtpPreviewRoute" — nothing matches.
import OtpPreviewRoute from "./routes/OtpPreviewRoute";
import InteractionPreviewRoute from "./routes/InteractionPreviewRoute";

/**
 * Phase 3 social shell. Mounted instead of the legacy `App` only when
 * VITE_SOCIAL_SHELL_ENABLED=true (see src/social/flags.ts and main.tsx) —
 * the existing production experience is unaffected until this is
 * deliberately turned on per environment.
 */
export default function SocialApp() {
  useEffect(() => {
    // Exchanges a PKCE `code` query param (email verification, OAuth
    // callback, or password-recovery link) for a session, same as the
    // legacy App.tsx does on mount. Errors are surfaced by the destination
    // screen itself (e.g. ResetPasswordRoute's own auth calls), not here.
    void completeAuthRedirect().catch(() => undefined);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="discover" element={<DiscoverRoute />} />
          <Route path="create" element={<CreateRoute />} />
          <Route path="messages" element={<MessagesRoute />} />
          <Route path="profile" element={<ProfileRoute />} />
          <Route path="profile/:userId" element={<PublicProfileRoute />} />
          <Route path="auth" element={<AuthRoute />} />
          <Route path="auth/reset-password" element={<ResetPasswordRoute />} />
          {import.meta.env.DEV && <Route path="dev/otp-preview" element={<OtpPreviewRoute />} />}
          {import.meta.env.DEV && <Route path="dev/interaction-preview" element={<InteractionPreviewRoute />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
