import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthRoute from "./routes/AuthRoute";
import CommunityGuidelinesRoute from "./routes/CommunityGuidelinesRoute";
import ConnectionsRoute from "./routes/ConnectionsRoute";
import CreateRoute from "./routes/CreateRoute";
import NetworkRoute from "./routes/NetworkRoute";
import MaterialDetailRoute from "./routes/MaterialDetailRoute";
import CatalogueManagementRoute from "./routes/CatalogueManagementRoute";
import HomeRoute from "./routes/HomeRoute";
import StudioRoute from "./routes/StudioRoute";
import ProjectsRoute from "./routes/ProjectsRoute";
import ProjectDetailRoute from "./routes/ProjectDetailRoute";
import QuoteRequestRoute from "./routes/QuoteRequestRoute";
import QuoteRequestDetailRoute from "./routes/QuoteRequestDetailRoute";
import QuoteRoute from "./routes/QuoteRoute";
import ConversationRoute from "./routes/ConversationRoute";
import MessagesRoute from "./routes/MessagesRoute";
import ModerationRoute from "./routes/ModerationRoute";
import ProfileRoute from "./routes/ProfileRoute";
import EditProfileRoute from "./routes/EditProfileRoute";
import SettingsRoute from "./routes/SettingsRoute";
import SupportRoute from "./routes/SupportRoute";
import DeleteAccountRoute from "./routes/DeleteAccountRoute";
import LegalDocumentRoute from "./routes/LegalDocumentRoute";
import NotFoundRoute from "./routes/NotFoundRoute";
import { PRIVACY_POLICY, TERMS_OF_USE } from "./legal/documents";
import PublicProfileRoute from "./routes/PublicProfileRoute";
import ResetPasswordRoute from "./routes/ResetPasswordRoute";
import { completeAuthRedirect } from "../services/authClient";
import "./tokens.css";

import OtpPreviewRoute from "./routes/OtpPreviewRoute";
import InteractionPreviewRoute from "./routes/InteractionPreviewRoute";

export default function SocialApp() {
  useEffect(() => {
    void completeAuthRedirect().catch(() => undefined);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="studio" element={<StudioRoute />} />
          <Route path="projects" element={<ProjectsRoute />} />
          <Route path="projects/:projectId" element={<ProjectDetailRoute />} />
          <Route path="quotes/new" element={<QuoteRequestRoute />} />
          <Route path="quote-requests/:requestId" element={<QuoteRequestDetailRoute />} />
          <Route path="quotes/:quoteId" element={<QuoteRoute />} />
          <Route path="network" element={<NetworkRoute />} />
          <Route path="discover" element={<Navigate to="/network" replace />} />

          <Route path="materials/:slug" element={<MaterialDetailRoute />} />
          <Route path="catalogue" element={<CatalogueManagementRoute />} />

          {/* Existing social creation and messaging remain available as
              contextual capabilities, but no longer define primary navigation. */}
          <Route path="create" element={<CreateRoute />} />
          <Route path="messages" element={<MessagesRoute />} />
          <Route path="messages/:conversationId" element={<ConversationRoute />} />

          <Route path="profile" element={<ProfileRoute />} />
          <Route path="profile/edit" element={<EditProfileRoute />} />
          <Route path="profile/:userId" element={<PublicProfileRoute />} />
          <Route path="connections" element={<ConnectionsRoute />} />
          <Route path="settings" element={<SettingsRoute />} />
          <Route path="moderation/reports" element={<ModerationRoute />} />

          <Route path="community-guidelines" element={<CommunityGuidelinesRoute />} />
          <Route path="privacy" element={<LegalDocumentRoute document={PRIVACY_POLICY} />} />
          <Route path="terms" element={<LegalDocumentRoute document={TERMS_OF_USE} />} />
          <Route path="support" element={<SupportRoute />} />
          <Route path="delete-account" element={<DeleteAccountRoute />} />
          <Route path="auth" element={<AuthRoute />} />
          <Route path="auth/reset-password" element={<ResetPasswordRoute />} />

          {import.meta.env.DEV && <Route path="dev/otp-preview" element={<OtpPreviewRoute />} />}
          {import.meta.env.DEV && <Route path="dev/interaction-preview" element={<InteractionPreviewRoute />} />}
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
