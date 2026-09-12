import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthRoute from "./routes/AuthRoute";
import CommunityGuidelinesRoute from "./routes/CommunityGuidelinesRoute";
import ConnectionsRoute from "./routes/ConnectionsRoute";
import CreateRoute from "./routes/CreateRoute";
import NetworkRoute from "./routes/NetworkRoute";
import MaterialDetailRoute from "./routes/MaterialDetailRoute";
import HomeRoute from "./routes/HomeRoute";
import ConversationRoute from "./routes/ConversationRoute";
import MessagesRoute from "./routes/MessagesRoute";
import ModerationRoute from "./routes/ModerationRoute";
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
 * Phase 3 social shell — now the default mounted app everywhere (Phase 5
 * Gate 0). The legacy `App` only renders through an explicit,
 * development-only opt-in that production cannot honour — see
 * src/social/flags.ts and main.tsx.
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
          {/* Public: guest-visible read-only materials catalogue foundation
              (Phase 5 Slice A). materialsClient.fetchMaterialBySlug returns
              null for a nonexistent, draft, or archived slug alike, so this
              route never needs an auth boundary of its own. */}
          <Route path="materials/:slug" element={<MaterialDetailRoute />} />
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
          {/* Contextual only — reached from ProfileRoute's "Report review" link,
              shown only after confirmed active-moderator access, not a
              primary nav tab. ModerationRoute independently re-verifies
              access itself regardless of how this route was reached. */}
          <Route path="moderation/reports" element={<ModerationRoute />} />
          {/* Deliberately public: CommunityGuidelinesRoute reads no auth state
              and renders unconditionally, so a guest reaching it directly (or
              via the signup checkbox, before they have a session) is never
              redirected to sign-in — AppShell above only branches its own nav
              rendering on auth.status, it never redirects the outlet itself. */}
          <Route path="community-guidelines" element={<CommunityGuidelinesRoute />} />
          <Route path="auth" element={<AuthRoute />} />
          <Route path="auth/reset-password" element={<ResetPasswordRoute />} />
          {import.meta.env.DEV && <Route path="dev/otp-preview" element={<OtpPreviewRoute />} />}
          {import.meta.env.DEV && <Route path="dev/interaction-preview" element={<InteractionPreviewRoute />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
