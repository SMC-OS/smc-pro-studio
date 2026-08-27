import { LoadingState, EmptyState } from "../components/StateViews";
import { GuestMessagesNotice, MessagingLayout } from "../components/messaging/MessagingLayout";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Phase 4 Slice C: the conversation-list screen at `/messages`. No
 * conversation is selected here — on `lg:` and up the list shows beside a
 * "pick a conversation" placeholder; below `lg:` the list is the whole
 * screen (see MessagingLayout). `/messages/:conversationId`
 * (ConversationRoute) is the thread view.
 */
export default function MessagesRoute() {
  const auth = useAuthSession();

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestMessagesNotice />;

  return (
    <MessagingLayout
      mode="list"
      activeConversationId={null}
      rightPane={<EmptyState title="Select a conversation" description="Choose a conversation from the list to view it." />}
    />
  );
}
