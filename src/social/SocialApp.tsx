import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthRoute from "./routes/AuthRoute";
import ConnectionsRoute from "./routes/ConnectionsRoute";
import CreateRoute from "./routes/CreateRoute";
import NetworkRoute from "./routes/NetworkRoute";
import HomeRoute from "./routes/HomeRoute";
import ConversationRoute from "./routes/ConversationRoute";
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
          <Route path="network" element={<NetworkRoute />} />
          {/* Back-compat alias: "Discover" was renamed to "Network" in the
              2026-08-19 professional-network pivot (see DESIGN.md). Old
              /discover links/bookmarks keep working via redirect rather
              than breaking. */}
          <Route path="discover" element={<Navigate to="/network" replace />} />
          <Route path="create" element={<CreateRoute />} />
          <Route path="messages" element={<MessagesRoute />} />
          <Route path="messages/:conversationId" element={<ConversationRoute />} />
          <Route path="profile" element={<ProfileRoute />} />
          <Route path="profile/:userId" element={<PublicProfileRoute />} />
          {/* Contextual only — reached from ProfileRoute's "Connections" link,
              not a primary nav tab (see AGENTS.md's approved nav direction). */}
          <Route path="connections" element={<ConnectionsRoute />} />
          <Route path="auth" element={<AuthRoute />} />
          <Route path="auth/reset-password" element={<ResetPasswordRoute />} />
          {import.meta.env.DEV && <Route path="dev/otp-preview" element={<OtpPreviewRoute />} />}
          {import.meta.env.DEV && <Route path="dev/interaction-preview" element={<InteractionPreviewRoute />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
