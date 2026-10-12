import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../StateViews";
import { Button } from "../ui";
import { ReportDialog } from "../ReportDialog";
import {
  fetchConversationCounterpart,
  fetchMessages,
  fetchMyBlockState,
  markConversationRead,
  sendMessage,
  subscribeToConversationMessages,
  type DirectMessage,
  type MessageCursor,
  type MessageReadCursor,
  type MessageRealtimeConnectionState,
} from "../../services/messagingClient";
import { emitConversationRead } from "../../services/readStateEvents";
import { describeError } from "../../services/networkErrors";

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

/** The single newest message by the same (created_at, id) ordering used everywhere else in this file — never a raw array-order assumption. */
function latestMessage(messages: DirectMessage[]): DirectMessage | null {
  let latest: DirectMessage | null = null;
  for (const message of messages) {
    if (!latest || message.created_at > latest.created_at || (message.created_at === latest.created_at && message.id > latest.id)) {
      latest = message;
    }
  }
  return latest;
}

/** True when `candidate` is strictly newer than `confirmed` by the same tuple ordering — used to refuse to regress a cursor that's already ahead. */
function isNewerThan(candidate: DirectMessage, confirmed: { id: string; createdAt: string }): boolean {
  if (candidate.created_at !== confirmed.createdAt) return candidate.created_at > confirmed.createdAt;
  return candidate.id > confirmed.id;
}

/** Read-state UI never claims anything about another participant — only the caller's own confirmed cursor. */
type ReadMarkStatus =
  | { kind: "idle" }
  | { kind: "pending"; messageId: string }
  | { kind: "confirmed"; messageId: string }
  | { kind: "failed"; messageId: string; message: string };

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

  // ==========================================================================
  // Phase 4 Slice F: mark-read lifecycle.
  //
  // Every call site below (loadInitial, handleRefresh, runConvergenceFetch,
  // handleSend) only ever hands attemptMarkRead a message that just came
  // back from a real, successful, authoritative fetchMessages/sendMessage
  // call — never a raw Realtime INSERT payload, and never before that call
  // has actually resolved. attemptMarkRead itself is the single choke point
  // that then: dedupes an identical repeat target, refuses to regress
  // behind an already-confirmed cursor, serializes overlapping attempts
  // (queuing only the single latest target, mirroring runConvergenceFetch's
  // own in-flight/queued coalescing below), and never assumes success before
  // markConversationRead's promise actually resolves. The database RPC's own
  // monotonic ON CONFLICT ... WHERE remains the authoritative guarantee
  // against a genuine race (e.g. two tabs); everything here only reduces how
  // often a redundant call is even attempted.
  // ==========================================================================
  const [readMarkStatus, setReadMarkStatus] = useState<ReadMarkStatus>({ kind: "idle" });
  const markReadInFlightRef = useRef(false);
  const markReadQueuedTargetRef = useRef<DirectMessage | null>(null);
  const lastConfirmedReadRef = useRef<{ id: string; createdAt: string } | null>(null);
  const lastAttemptedReadIdRef = useRef<string | null>(null);

  const attemptMarkRead = useCallback(
    (target: DirectMessage, options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      if (!force) {
        if (lastAttemptedReadIdRef.current === target.id) return;
        if (lastConfirmedReadRef.current && !isNewerThan(target, lastConfirmedReadRef.current)) return;
      }
      if (markReadInFlightRef.current) {
        markReadQueuedTargetRef.current = target;
        return;
      }
      const run = (current: DirectMessage) => {
        markReadInFlightRef.current = true;
        lastAttemptedReadIdRef.current = current.id;
        if (mountedRef.current) setReadMarkStatus({ kind: "pending", messageId: current.id });
        markConversationRead(conversationId, current.id)
          .then((cursor: MessageReadCursor) => {
            lastConfirmedReadRef.current = { id: cursor.lastReadMessageId, createdAt: cursor.lastReadMessageCreatedAt };
            if (mountedRef.current) setReadMarkStatus({ kind: "confirmed", messageId: cursor.lastReadMessageId });
            // cursor.userId is the RPC's own validated acting-user id (markConversationRead
            // already proved it equals the session that made this call) — never the
            // component's own authUserId prop, which could theoretically be stale by the
            // time this async callback runs.
            emitConversationRead({
              conversationId,
              userId: cursor.userId,
              lastReadMessageId: cursor.lastReadMessageId,
              lastReadMessageCreatedAt: cursor.lastReadMessageCreatedAt,
            });
          })
          .catch((error: unknown) => {
            if (!mountedRef.current) return;
            setReadMarkStatus({
              kind: "failed",
              messageId: current.id,
              message: describeError(error, "Your read status could not be updated. Please try again.").message,
            });
          })
          .finally(() => {
            const queued = markReadQueuedTargetRef.current;
            markReadQueuedTargetRef.current = null;
            if (!mountedRef.current) {
              markReadInFlightRef.current = false;
              return;
            }
            if (queued) run(queued);
            else markReadInFlightRef.current = false;
          });
      };
      run(target);
    },
    [conversationId]
  );

  function handleRetryMarkRead() {
    if (state.status !== "ready") return;
    const latest = latestMessage(state.messages);
    if (latest) attemptMarkRead(latest, { force: true });
  }

  // ==========================================================================
  // Phase 4 Slice G: the caller's own block state for this conversation's
  // counterpart. `fetchConversationCounterpart` reads conversation_members —
  // a table this caller is already entitled to read as a genuine member of
  // this exact conversation (the same table ConversationList's own
  // enrichConversations() already reads via fetchMyConversations' embedded
  // `members`) — not a new database contract. `fetchMyBlockState` then
  // answers only "did I block them", never the reverse; there is no
  // thread-level Block control here (see BlockButton.tsx on the profile
  // route for the real action) — this is read-only, neutral, own-action
  // status only. A failure at either step is silent by design (same
  // discipline as runConvergenceFetch's own catch below): it leaves
  // `ownBlockState` at "unknown", which only ever affects whether the
  // banner below renders — it never turns into a thread-level error and
  // never disables sending on anything but a *confirmed* block.
  // ==========================================================================
  type OwnBlockState = { status: "unknown" } | { status: "blocked" } | { status: "not_blocked" };
  const [ownBlockState, setOwnBlockState] = useState<OwnBlockState>({ status: "unknown" });
  const blockGenerationRef = useRef(0);

  useEffect(() => {
    const generation = ++blockGenerationRef.current;
    fetchConversationCounterpart(conversationId)
      .then((counterpartId) => (counterpartId ? fetchMyBlockState(counterpartId) : null))
      .then((blocked) => {
        if (blockGenerationRef.current !== generation) return;
        if (blocked === null) return; // no counterpart resolved — stay "unknown", never fabricate a state
        setOwnBlockState(blocked ? { status: "blocked" } : { status: "not_blocked" });
      })
      .catch(() => {
        // Silent — see comment above.
      });
    return () => {
      blockGenerationRef.current += 1;
    };
  }, [conversationId]);

  const loadInitial = useCallback(() => {
    const generation = ++initialLoadGenerationRef.current;
    setState({ status: "loading" });
    setPageActionError(null);
    fetchMessages(conversationId, null)
      .then((page) => {
        if (!mountedRef.current || initialLoadGenerationRef.current !== generation) return;
        setState({ status: "ready", messages: page.messages, nextCursor: page.nextCursor });
        // Only a genuinely non-empty, successful fetch ever marks anything —
        // an empty conversation has no confirmed message to mark, and a
        // failed fetch (the .catch below) never reaches this line at all.
        const latest = latestMessage(page.messages);
        if (latest) attemptMarkRead(latest);
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || initialLoadGenerationRef.current !== generation) return;
        setState({ status: "error", message: describeError(error, "Messages could not be loaded.").message });
      });
  }, [conversationId, attemptMarkRead]);

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
          // Realtime never hands this component a payload to trust — this
          // marks whatever the authoritative fetch above just confirmed as
          // the newest page, exactly the same rule loadInitial/handleRefresh
          // follow, never the raw INSERT notification that triggered onSignal.
          const latest = latestMessage(page.messages);
          if (latest) attemptMarkRead(latest);
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
  }, [conversationId, attemptMarkRead]);

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
      const latest = latestMessage(page.messages);
      if (latest) attemptMarkRead(latest);
    } catch (error) {
      if (!mountedRef.current) return;
      setPageActionError(describeError(error, "Refresh failed. Please try again.").message);
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
      setPageActionError(describeError(error, "Older messages could not be loaded.").message);
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
      // Only the server-confirmed row from sendMessage's own response is
      // ever used here — never an optimistic local draft — so this can
      // never advance the cursor past a message that doesn't genuinely
      // exist yet.
      attemptMarkRead(confirmed);
    } catch (error) {
      // Draft is deliberately left untouched on failure — see requirement.
      if (!mountedRef.current) return;
      setSendError(describeError(error, "This message could not be sent. Please try again.").message);
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

  const canCompose = state.status === "ready" && ownBlockState.status !== "blocked";

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

      {/* Non-blocking: only ever informs the caller about their own read
          cursor, never another participant's — see the requirement that
          this must never claim anyone has "seen" or "read" anything. Never
          rendered before a real failure; a pending/confirmed mark-read stays
          silent (the ConversationList badge is the visible success signal). */}
      {readMarkStatus.kind === "failed" && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-3 py-2 text-xs text-[var(--smc-charcoal-soft)]"
        >
          <span>{readMarkStatus.message}</span>
          <button
            type="button"
            onClick={handleRetryMarkRead}
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-xs font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
          >
            Retry
          </button>
        </div>
      )}

      {/* Own-action framing only — never a claim about the other participant's
          own block state (that direction is structurally unreadable to this
          caller, see fetchMyBlockState). Existing conversation/messages are
          never deleted or hidden because of this; sending is simply disabled
          (canCompose above) until the caller unblocks them from their profile. */}
      {ownBlockState.status === "blocked" && (
        <div role="status" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-3 py-2 text-xs text-[var(--smc-charcoal-soft)]">
          You've blocked this person. Messages can't be sent until you unblock them from their profile.
        </div>
      )}

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
                <li key={message.id} className={`flex flex-col gap-1 ${own ? "items-end" : "items-start"}`}>
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
                  {/* Phase 4 Slice I: only ever rendered for the other
                      participant's own confirmed message — `message` here is
                      always a real row from fetchMessages/Realtime
                      convergence, never a draft or optimistic entry (see
                      ThreadView's own module comment: this component never
                      renders anything but a server-confirmed DirectMessage).
                      Bound only to message.id — no sender/conversation id is
                      ever passed to the reporting service (see
                      reportingClient.ts's submitMessageReport, which derives
                      both server-side). `key` includes authUserId so a stale
                      in-progress report never survives an authenticated-
                      identity change within the same mounted thread; a
                      conversation switch already forces a full ThreadView
                      remount via its own key={conversationId} at the call
                      site (see ConversationRoute.tsx), which discards this
                      too. Never gated on ownBlockState — reporting a message
                      from an already-blocked sender must remain available. */}
                  {!own && (
                    <ReportDialog
                      key={`${message.id}:${authUserId}`}
                      target={{ kind: "message", messageId: message.id }}
                      triggerLabel="Report message"
                      triggerClassName="px-2 text-[11px]"
                    />
                  )}
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
