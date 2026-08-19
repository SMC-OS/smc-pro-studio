import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthRoute from "./routes/AuthRoute";
import CreateRoute from "./routes/CreateRoute";
import DiscoverRoute from "./routes/DiscoverRoute";
import HomeRoute from "./routes/HomeRoute";
import MessagesRoute from "./routes/MessagesRoute";
import ProfileRoute from "./routes/ProfileRoute";
import "./tokens.css";

/**
 * Phase 3 social shell. Mounted instead of the legacy `App` only when
 * VITE_SOCIAL_SHELL_ENABLED=true (see src/social/flags.ts and main.tsx) —
 * the existing production experience is unaffected until this is
 * deliberately turned on per environment.
 */
export default function SocialApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="discover" element={<DiscoverRoute />} />
          <Route path="create" element={<CreateRoute />} />
          <Route path="messages" element={<MessagesRoute />} />
          <Route path="profile" element={<ProfileRoute />} />
          <Route path="auth" element={<AuthRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
