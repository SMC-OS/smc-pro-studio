import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../StateViews";
import { ConversationList } from "./ConversationList";

/**
 * Same UUID shape messagingClient.ts's own `requireUuid` enforces
 * server-side — duplicated here deliberately so a malformed
 * `/messages/:conversationId` route param is rejected at the route
 * boundary, before ConversationRoute ever calls into messagingClient at
 * all (see the "malformed route ID does not query messages" requirement).
 */
export const CONVERSATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Honest sign-in-required state — no conversation/message query ever runs for a guest. */
export function GuestMessagesNotice() {
  return (
    <EmptyState
      title="Sign in to view your messages"
      description="Direct messages are private to signed-in members."
      action={
        <Link
          to="/auth"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
        >
          Sign in
        </Link>
      }
    />
  );
}

/**
 * Responsive list/thread shell shared by MessagesRoute (`/messages`,
 * `mode="list"`) and ConversationRoute (`/messages/:conversationId`,
 * `mode="thread"`). Below `lg:` exactly one pane is visible at a time —
 * driven by `mode` (which route matched), not by whether the id turned
 * out valid, so an invalid `/messages/:conversationId` still shows its
 * error pane on mobile rather than silently falling back to the list. At
 * `lg:` and up both panes show side by side, same two-pane idiom as
 * AppShell's rail + content split. `activeConversationId` only affects
 * which list row is highlighted as current.
 */
export function MessagingLayout({
  mode,
  activeConversationId,
  rightPane,
}: {
  mode: "list" | "thread";
  activeConversationId: string | null;
  rightPane: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className={mode === "thread" ? "hidden lg:block" : "block"}>
        <ConversationList activeConversationId={activeConversationId} />
      </div>
      <div className={mode === "thread" ? "block" : "hidden lg:block"}>{rightPane}</div>
    </div>
  );
}
