/**
 * Phase 4 Slice F: a tiny same-process pub/sub so ThreadView (which calls
 * markConversationRead) and ConversationList (which renders the unread
 * badge) can agree that one conversation was just confirmed read, without
 * either component needing a reference to the other.
 *
 * This exists only because of how these two components are actually wired:
 * ConversationList is rendered by MessagingLayout, which both MessagesRoute
 * and ConversationRoute mount; ThreadView is instantiated by ConversationRoute
 * and handed to MessagingLayout as an already-built `rightPane` node, so
 * MessagingLayout itself never sees a ThreadView instance to attach a
 * callback prop to, and ConversationList has no route-level reference to
 * ThreadView either. A module-scoped event target is the smallest way to
 * bridge that gap without restructuring MessagingLayout's `rightPane` API.
 *
 * No network/Supabase call happens here — this only ever fires *after*
 * messagingClient.ts's markConversationRead has already resolved with a
 * server-confirmed row (see ThreadView), so an event here always represents
 * a genuinely confirmed state, never an optimistic guess.
 *
 * `userId` is deliberately part of the event's identity, not just
 * `conversationId`: a direct conversation has exactly two members, so the
 * same `conversationId` can legitimately appear in two different users'
 * own conversation lists. Because `ConversationList` is not remounted on
 * every authentication change (only a transient guest state remounts it),
 * one signed-in user's in-flight mark-read confirmation resolving *after*
 * a different user has taken over the same mounted component must never be
 * applied to that second user's own (unrelated) unread state — see
 * ConversationList's subscription, which re-derives its listener (and
 * resets its own "already confirmed" memory) every time the authenticated
 * user id changes, and ignores any event whose `userId` does not match the
 * user currently being rendered for.
 */

export interface ConversationReadEvent {
  conversationId: string;
  /** The real, server-confirmed acting user id (mark_conversation_read's own returned row's user_id) — never caller-supplied. */
  userId: string;
  lastReadMessageId: string;
  lastReadMessageCreatedAt: string;
}

type Listener = (event: ConversationReadEvent) => void;

const listeners = new Set<Listener>();

/** Called only after a real, server-confirmed mark_conversation_read() success. */
export function emitConversationRead(event: ConversationReadEvent): void {
  for (const listener of listeners) listener(event);
}

/** Returns an unsubscribe function; safe to call multiple times. */
export function onConversationRead(listener: Listener): () => void {
  listeners.add(listener);
  let unsubscribed = false;
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    listeners.delete(listener);
  };
}
