import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../StateViews";
import { Button } from "../ui";
import {
  fetchMessages,
  sendMessage,
  subscribeToConversationMessages,
  type DirectMessage,
  type MessageCursor,
  type MessageRealtimeConnectionState,
} from "../../services/messagingClient";

type ThreadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; messages: DirectMessage[]; nextCursor: MessageCursor | null };

/** Dedupe-by-id union, used by both "load older" and "refresh" so no page merge can ever duplicate a message. */
function mergeMessages(existing: DirectMessage[], incoming: DirectMessage[]): DirectMessage[] {
  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()];
}

/** Server pages arrive newest-first (see messagingClient's fetchMessages); rendered chronologically oldest-first. */
function sortChronological(messages: DirectMessage[]): DirectMessage[] {
  return [...messages].sort((a, b) => {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * One conversation's thread: distinct loading/empty/error states, keyset
 * "load older" pagination, an explicit Refresh (no Realtime/polling per
 * scope), and a send composer whose draft survives failure and is cleared
 * only by the server-confirmed response. Callers must remount this with a
 * fresh `key={conversationId}` when the selected conversation changes —
 * that guarantees no in-flight request from a previous conversation can
 * ever resolve into this instance's state.
 */
export function ThreadView({ conversationId, authUserId }: { conversationId: string; authUserId: string }) {
  const [state, setState] = useState<ThreadState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageActionError, setPageActionError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const initialLoadGenerationRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mountedRef.current = true;
    headingRef.current?.focus();
    return () => {
      mountedRef.current = false;
      initialLoadGenerationRef.current += 1;
    };
  }, []);

  const loadInitial = useCallback(() => {
    const generation = ++initialLoadGenerationRef.current;
    setState({ status: "loading" });
    setPageActionError(null);
    fetchMessages(conversationId, null)
      .then((page) => {
        if (!mountedRef.current || initialLoadGenerationRef.current !== generation) return;
        setState({ status: "ready", messages: page.messages, nextCursor: page.nextCursor });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || initialLoadGenerationRef.current !== generation) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Messages could not be loaded." });
      });
  }, [conversationId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // ==========================================================================
  // Phase 4 Slice D: authenticated Realtime delivery.
  //
  // `liveState` is purely a UI signal (see subscribeToConversationMessages's
  // MessageRealtimeConnectionState) — it never gates sending, and a failure
  // to connect never touches `state`, so existing messages/pagination/draft
  // are preserved exactly as slice C already guaranteed. Realtime delivers
  // no payload this component ever trusts directly: every signal — a real
  // INSERT, or the post-SUBSCRIBED catch-up — funnels into
  // runConvergenceFetch, which always re-runs the same authenticated,
  // RLS-authoritative fetchMessages(conversationId, null) slice C already
  // uses for the initial load and manual Refresh, then merges by id via the
  // same mergeMessages used everywhere else in this file.
  // ==========================================================================
  const [liveState, setLiveState] = useState<MessageRealtimeConnectionState>("connecting");
  const fetchInFlightRef = useRef(false);
  const fetchQueuedRef = useRef(false);

  const runConvergenceFetch = useCallback(() => {
    if (fetchInFlightRef.current) {
      // Requirement: signals arriving during an in-flight fetch converge
      // afterward via exactly one further fetch — never unlimited parallel
      // requests, and never more than one queued on top of the current one.
      fetchQueuedRef.current = true;
      return;
    }
    fetchInFlightRef.current = true;
    const attempt = () => {
      fetchMessages(conversationId, null)
        .then((page) => {
          if (!mountedRef.current) return;
          setState((prev) =>
            prev.status === "ready"
              ? { status: "ready", messages: mergeMessages(prev.messages, page.messages), nextCursor: page.nextCursor }
              : prev
          );
        })
        .catch(() => {
          // Silent by design: a Realtime-triggered convergence fetch failing
          // must not surface a noisy banner during normal connecting/
          // reconnecting — `liveState` already reflects unavailability, and
          // manual Refresh (which does surface pageActionError) remains the
          // honest recovery path.
        })
        .finally(() => {
          if (!mountedRef.current) return;
          if (fetchQueuedRef.current) {
            fetchQueuedRef.current = false;
            attempt();
          } else {
            fetchInFlightRef.current = false;
          }
        });
    };
    attempt();
  }, [conversationId]);

  useEffect(() => {
    const controller = new AbortController();
    let cleanupFn: (() => void) | null = null;
    let cancelled = false;

    subscribeToConversationMessages(
      conversationId,
      {
        onSignal: () => {
          if (!cancelled) runConvergenceFetch();
        },
        onConnectionStateChange: (nextState) => {
          if (!cancelled) setLiveState(nextState);
        },
      },
      { signal: controller.signal }
    )
      .then((cleanup) => {
        // If this effect was already cleaned up (React StrictMode's
        // synchronous mount -> cleanup -> mount, or a fast conversation
        // switch) by the time the authenticated-session check resolved, the
        // channel this call just created is removed immediately rather than
        // stored — never left running for a generation nothing references
        // anymore.
        if (cancelled) {
          cleanup();
          return;
        }
        cleanupFn = cleanup;
      })
      .catch(() => {
        if (!cancelled) setLiveState("unavailable");
      });

    return () => {
      cancelled = true;
      controller.abort();
      cleanupFn?.();
    };
  }, [conversationId, runConvergenceFetch]);

  const anyPending = sending || loadingOlder || refreshing || state.status === "loading";

  async function handleRefresh() {
    if (state.status !== "ready" || anyPending) return;
    setRefreshing(true);
    setPageActionError(null);
    try {
      const page = await fetchMessages(conversationId, null);
      if (!mountedRef.current) return;
      setState((prev) => (prev.status === "ready" ? { status: "ready", messages: mergeMessages(prev.messages, page.messages), nextCursor: page.nextCursor } : prev));
    } catch (error) {
      if (!mountedRef.current) return;
      setPageActionError(error instanceof Error ? error.message : "Refresh failed. Please try again.");
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }

  async function handleLoadOlder() {
    if (state.status !== "ready" || !state.nextCursor || anyPending) return;
    const cursor = state.nextCursor;
    setLoadingOlder(true);
    setPageActionError(null);
    try {
      const page = await fetchMessages(conversationId, cursor);
      if (!mountedRef.current) return;
      setState((prev) => (prev.status === "ready" ? { status: "ready", messages: mergeMessages(prev.messages, page.messages), nextCursor: page.nextCursor } : prev));
    } catch (error) {
      if (!mountedRef.current) return;
      setPageActionError(error instanceof Error ? error.message : "Older messages could not be loaded.");
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const confirmed = await sendMessage(conversationId, draft);
      if (!mountedRef.current) return;
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", messages: mergeMessages(prev.messages, [confirmed]), nextCursor: prev.nextCursor }
          : { status: "ready", messages: [confirmed], nextCursor: null }
      );
      setDraft("");
    } catch (error) {
      // Draft is deliberately left untouched on failure — see requirement.
      if (!mountedRef.current) return;
      setSendError(error instanceof Error ? error.message : "This message could not be sent. Please try again.");
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  const canCompose = state.status === "ready";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            to="/messages"
            aria-label="Back to conversations"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--smc-charcoal)]" aria-hidden="true" />
          </Link>
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--smc-charcoal)] outline-none">
              Conversation
            </h1>
            {/* Honest, non-alarming connection state — never raw Realtime/Postgres status text — and never a claim about delivery/read status. */}
            <p role="status" className="text-xs text-[var(--smc-charcoal-faint)]">
              {liveState === "connected"
                ? "Live updates on"
                : liveState === "unavailable"
                  ? "Live updates unavailable — use Refresh"
                  : "Connecting…"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={anyPending || state.status !== "ready"}
          className="min-h-[44px] shrink-0 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-xs font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {state.status === "loading" && <LoadingState label="Loading messages" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={loadInitial} />}
      {state.status === "ready" && state.messages.length === 0 && (
        <EmptyState title="No messages yet" description="Send the first message below." />
      )}

      {state.status === "ready" && state.messages.length > 0 && (
        <div aria-live="polite" aria-relevant="additions" className="flex flex-col gap-2 overflow-x-hidden">
          {state.nextCursor && (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={() => void handleLoadOlder()}
                disabled={anyPending}
                className="min-h-[44px] rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-xs font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingOlder ? "Loading…" : "Load older messages"}
              </button>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {sortChronological(state.messages).map((message) => {
              const own = message.sender_id === authUserId;
              return (
                <li key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] break-words rounded-[var(--smc-radius-card)] px-3 py-2 text-sm ${
                      own ? "bg-[var(--smc-charcoal)] text-[var(--smc-ivory)]" : "bg-[var(--smc-limestone)] text-[var(--smc-charcoal)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <p className={`mt-1 text-[10px] ${own ? "text-[var(--smc-ivory)]/70" : "text-[var(--smc-charcoal-faint)]"}`}>
                      {own ? "You" : "Them"} · {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pageActionError && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {pageActionError}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        className="flex items-end gap-2 border-t border-[var(--smc-border)] pt-3"
      >
        <label htmlFor="message-draft" className="sr-only">
          Write a message
        </label>
        <textarea
          id="message-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={2}
          maxLength={2000}
          disabled={sending || !canCompose}
          placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
          className="min-h-[44px] flex-1 resize-none rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-surface)] px-3 py-2 text-sm text-[var(--smc-charcoal)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button type="submit" disabled={sending || !draft.trim() || !canCompose} aria-label={sending ? "Sending message" : "Send message"}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {sending ? "Sending…" : "Send"}
        </Button>
      </form>
      {sendError && (
        <p role="alert" className="text-xs font-medium text-[var(--smc-mineral-clay)]">
          {sendError}
        </p>
      )}
    </div>
  );
}
