import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../StateViews";
import { Avatar } from "../ui";
import { fetchMyConversations, type ConversationSummary } from "../../services/messagingClient";
import { fetchPublicProfileById } from "../../services/socialClient";
import { useAuthSession } from "../../services/useAuthSession";

/** Shown instead of a raw UUID whenever the other member's profile can't be honestly resolved (private profile, deleted account, or a lookup failure). */
const NEUTRAL_LABEL = "Conversation";

interface EnrichedConversation {
  id: string;
  createdAt: string;
  label: string;
}

type ListState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; conversations: EnrichedConversation[] };

/**
 * Resolves each conversation's counterpart display name through the same
 * public-profile read every profile link already uses
 * (`fetchPublicProfileById` -> `profiles_public_read`). A private,
 * deleted, or otherwise unreadable counterpart profile — and any
 * individual lookup failure — falls back to NEUTRAL_LABEL rather than
 * ever surfacing the raw member UUID or letting one bad lookup fail the
 * whole list.
 */
async function enrichConversations(rows: ConversationSummary[], myUserId: string): Promise<EnrichedConversation[]> {
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
    return { id: row.id, createdAt: row.created_at, label };
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

  const load = useCallback(() => {
    if (!authUserId) return;
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    fetchMyConversations()
      .then(async (rows) => {
        const conversations = await enrichConversations(rows, authUserId);
        if (generationRef.current !== generation) return;
        setState({ status: "ready", conversations });
      })
      .catch((error: unknown) => {
        if (generationRef.current !== generation) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Your conversations could not be loaded." });
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
