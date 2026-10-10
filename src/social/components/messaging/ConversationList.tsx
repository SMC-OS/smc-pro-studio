import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../StateViews";
import { Avatar } from "../ui";
import {
  fetchMyConversations,
  fetchUnreadMessageCounts,
  type ConversationSummary,
  type UnreadCountsByConversation,
} from "../../services/messagingClient";
import { fetchPublicProfileById } from "../../services/socialClient";
import { onConversationRead } from "../../services/readStateEvents";
import { useAuthSession } from "../../services/useAuthSession";
import { describeError } from "../../services/networkErrors";

/** Shown instead of a raw UUID whenever the other member's profile can't be honestly resolved (private profile, deleted account, or a lookup failure). */
const NEUTRAL_LABEL = "Conversation";

/** Above this, the visible badge caps at "99+" — the accessible label always states the exact count regardless. */
const UNREAD_BADGE_DISPLAY_CAP = 99;

interface EnrichedConversation {
  id: string;
  createdAt: string;
  label: string;
  unreadCount: number;
}

type ListState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; conversations: EnrichedConversation[] };

const CONTRACT_ERROR_MESSAGE = "Your conversations could not be loaded. Please try again.";

/**
 * public.get_unread_message_counts() and the conversations query are two
 * independent round trips — fetchUnreadMessageCounts() already rejects a
 * duplicate conversation id within its own result, but it cannot know the
 * caller's full conversation list. This is the other half of that
 * contract: every conversation the caller belongs to must have exactly one
 * unread-count row, and the unread-count result must not contain an id for
 * a conversation the caller doesn't (or no longer) belong to. Either
 * mismatch is treated as a genuine contract violation — surfaced as the
 * same safe retry state as any other list-load failure — never silently
 * patched over with an assumed zero.
 */
function requireMatchingUnreadContract(conversations: ConversationSummary[], unreadCounts: UnreadCountsByConversation): void {
  const unmatched = new Set(unreadCounts.keys());
  for (const conversation of conversations) {
    if (!unmatched.delete(conversation.id)) {
      throw new Error(CONTRACT_ERROR_MESSAGE);
    }
  }
  if (unmatched.size > 0) {
    throw new Error(CONTRACT_ERROR_MESSAGE);
  }
}

/**
 * Resolves each conversation's counterpart display name through the same
 * public-profile read every profile link already uses
 * (`fetchPublicProfileById` -> `profiles_public_read`). A private,
 * deleted, or otherwise unreadable counterpart profile — and any
 * individual lookup failure — falls back to NEUTRAL_LABEL rather than
 * ever surfacing the raw member UUID or letting one bad lookup fail the
 * whole list. `unreadCounts` must already have been validated by
 * requireMatchingUnreadContract before this runs, so `.get(row.id)!` below
 * is never actually reaching for a missing entry.
 */
async function enrichConversations(
  rows: ConversationSummary[],
  myUserId: string,
  unreadCounts: UnreadCountsByConversation
): Promise<EnrichedConversation[]> {
  const otherIds = new Set<string>();
  for (const row of rows) {
    const other = row.members.find((member) => member.user_id !== myUserId);
    if (other) otherIds.add(other.user_id);
  }
  const profileEntries = await Promise.all(
    [...otherIds].map(async (id) => {
      try {
        const result = await fetchPublicProfileById(id);
        return [id, result?.profile.display_name ?? null] as const;
      } catch {
        return [id, null] as const;
      }
    })
  );
  const labelById = new Map(profileEntries);
  return rows.map((row) => {
    const other = row.members.find((member) => member.user_id !== myUserId);
    const label = (other && labelById.get(other.user_id)) || NEUTRAL_LABEL;
    return { id: row.id, createdAt: row.created_at, label, unreadCount: unreadCounts.get(row.id)! };
  });
}

export function ConversationList({ activeConversationId }: { activeConversationId: string | null }) {
  const auth = useAuthSession();
  const authUserId = auth.status === "authenticated" ? auth.session.subject : null;
  const [state, setState] = useState<ListState>({ status: "loading" });
  // Bumped on every fetch this component starts; a resolving promise only
  // applies its result if it's still the most recent one requested — guards
  // against a stale response landing after a newer auth state or retry.
  const generationRef = useRef(0);
  // Conversation ids ThreadView has already confirmed read (via
  // markConversationRead) for the *currently authenticated user*, captured
  // even if the event arrives while a fetch is still in flight — applied
  // both immediately (when already "ready") and again the moment the
  // in-flight fetch's own result lands, so neither ordering ever leaves a
  // badge showing a count that has already been genuinely cleared.
  //
  // Reset whenever authUserId changes (see the effect below): this
  // component is not remounted on every auth transition (only a transient
  // guest state remounts it), so without this reset a conversation id
  // confirmed read under a previous signed-in user could otherwise survive
  // into a different user's session and wrongly zero *their* own, unrelated
  // unread count for that same conversation id — a real risk specifically
  // because a direct conversation's two members legitimately share the same
  // conversation_id, so the id alone is not enough to prove "this confirmation
  // belongs to the user currently being rendered for."
  const confirmedReadRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    confirmedReadRef.current = new Set();
  }, [authUserId]);

  const load = useCallback(() => {
    if (!authUserId) return;
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    Promise.all([fetchMyConversations(), fetchUnreadMessageCounts()])
      .then(async ([rows, unreadCounts]) => {
        requireMatchingUnreadContract(rows, unreadCounts);
        const conversations = await enrichConversations(rows, authUserId, unreadCounts);
        if (generationRef.current !== generation) return;
        const withConfirmedReads = conversations.map((conversation) =>
          confirmedReadRef.current.has(conversation.id) ? { ...conversation, unreadCount: 0 } : conversation
        );
        setState({ status: "ready", conversations: withConfirmedReads });
      })
      .catch((error: unknown) => {
        if (generationRef.current !== generation) return;
        setState({ status: "error", message: describeError(error, "Your conversations could not be loaded.").message });
      });
  }, [authUserId]);

  useEffect(() => {
    load();
    return () => {
      // Invalidates work from the previous effect lifetime, including
      // React StrictMode's development-only setup/cleanup/setup cycle.
      generationRef.current += 1;
    };
  }, [load]);

  // Phase 4 Slice F: ThreadView emits this only after markConversationRead
  // has already resolved with a server-confirmed row — never optimistically
  // — so applying it here only ever clears a badge that has genuinely
  // already been cleared server-side, and only for that one conversation id.
  // A failed mark-read call emits nothing, so the previously confirmed count
  // is left exactly as-is (see readStateEvents.ts).
  //
  // Depends on `authUserId` so this re-subscribes with a fresh closure every
  // time the authenticated user changes — combined with the `event.userId`
  // check below, an event confirmed under a *previous* signed-in user can
  // never be applied once a different user is the one currently being
  // rendered for, even though this component instance itself is not
  // remounted on an in-place auth change (see the confirmedReadRef reset
  // above for the equivalent guard against a *stale* prior confirmation
  // surviving into a later fetch for the new user).
  useEffect(() => {
    if (!authUserId) return;
    return onConversationRead(({ conversationId, userId }) => {
      if (userId !== authUserId) return;
      confirmedReadRef.current.add(conversationId);
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        let changed = false;
        const conversations = prev.conversations.map((conversation) => {
          if (conversation.id === conversationId && conversation.unreadCount !== 0) {
            changed = true;
            return { ...conversation, unreadCount: 0 };
          }
          return conversation;
        });
        return changed ? { status: "ready", conversations } : prev;
      });
    });
  }, [authUserId]);

  if (!authUserId) return null;

  if (state.status === "loading") return <LoadingState label="Loading conversations" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (state.conversations.length === 0) {
    return <EmptyState title="No conversations yet" description="Start a conversation from someone's profile." />;
  }

  return (
    <nav aria-label="Conversations">
      <ul className="flex flex-col gap-1">
        {state.conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;
          return (
            <li key={conversation.id}>
              <Link
                to={`/messages/${conversation.id}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-[var(--smc-radius-card)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1 ${
                  isActive ? "bg-[var(--smc-limestone)]" : "hover:bg-[var(--smc-limestone)]"
                }`}
              >
                <Avatar name={conversation.label} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--smc-charcoal)]">{conversation.label}</span>
                {conversation.unreadCount > 0 && (
                  <>
                    {/* Meaning is carried by the visible numeral itself, not colour alone. */}
                    <span
                      aria-hidden="true"
                      className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--smc-mineral-clay)] px-1.5 text-[11px] font-semibold leading-none text-[var(--smc-ivory)]"
                    >
                      {conversation.unreadCount > UNREAD_BADGE_DISPLAY_CAP ? `${UNREAD_BADGE_DISPLAY_CAP}+` : conversation.unreadCount}
                    </span>
                    <span className="sr-only">
                      {conversation.unreadCount} unread message{conversation.unreadCount === 1 ? "" : "s"}
                    </span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
