import { EmptyState, LoadingState } from "../components/StateViews";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Messaging is scoped to Phase 4 (member-secured conversations, moderation,
 * notifications) per tasks/plan.md. This route exists so the primary
 * navigation is complete now, but it is honest about not being built yet —
 * no fake inbox, no simulated conversations.
 */
export default function MessagesRoute() {
  const auth = useAuthSession();

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return <EmptyState title="Sign in to use Messages" description="Direct and project messaging require an account, and arrive in a later phase." />;
  }

  return <EmptyState title="Messages are coming soon" description="Member-secured direct and project conversations are planned for Phase 4 of the social rebuild." />;
}
