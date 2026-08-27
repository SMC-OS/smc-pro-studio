import { Link, useParams } from "react-router-dom";
import { LoadingState, EmptyState } from "../components/StateViews";
import { CONVERSATION_ID_PATTERN, GuestMessagesNotice, MessagingLayout } from "../components/messaging/MessagingLayout";
import { ThreadView } from "../components/messaging/ThreadView";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Phase 4 Slice C: `/messages/:conversationId` — one conversation's
 * thread. The route id is validated as a UUID here, before ThreadView (and
 * therefore messagingClient.fetchMessages) is ever rendered/called — an
 * invalid id must never reach a query.
 */
export default function ConversationRoute() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const auth = useAuthSession();

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestMessagesNotice />;

  const isValidId = typeof conversationId === "string" && CONVERSATION_ID_PATTERN.test(conversationId);

  return (
    <MessagingLayout
      mode="thread"
      activeConversationId={isValidId ? conversationId! : null}
      rightPane={
        isValidId ? (
          <ThreadView key={conversationId} conversationId={conversationId!} authUserId={auth.session.subject} />
        ) : (
          <EmptyState
            title="This conversation link isn't valid"
            description="Choose a conversation from your Messages list instead."
            action={
              <Link
                to="/messages"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
              >
                Back to Messages
              </Link>
            }
          />
        )
      }
    />
  );
}
