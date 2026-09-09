import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Flag } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Button, Card, Chip } from "../components/ui";
import { ReviewDialog } from "../components/ReviewDialog";
import { EnforcementDialog } from "../components/EnforcementDialog";
import {
  checkModeratorAccess,
  fetchModerationReports,
  listModerationActions,
  type EnforcementResult,
  type ModerationActionCursor,
  type ModerationActionItem,
  type ModerationCursor,
  type ModerationQueueItem,
  type ModerationStatusFilter,
  type ReviewResult,
} from "../services/moderationClient";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Phase 4 Slice J: `/moderation/reports` — the moderator report review
 * queue and detail workspace. Every state below is honest, never
 * fabricated: a genuinely empty queue and a confirmed access denial are
 * two distinct, clearly-worded states (never conflated), and nothing here
 * is shown before the corresponding server call actually confirms it —
 * the same discipline every other screen in this codebase already
 * establishes (see PublicProfileRoute's own blockState, or ThreadView's
 * own loading/error/empty states).
 *
 * Resolve/Dismiss only ever record a review decision (see ReviewDialog's
 * own copy). Phase 4 Slice K adds exactly one further, narrowly-scoped
 * action on top of that: for a *resolved*, message-target report, a
 * moderator may additionally hide or restore the exact reported message
 * (see EnforcementDialog) — never any other content, never a profile/post/
 * comment action, and never automatically.
 */

const CATEGORY_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_or_abuse: "Hate or abuse",
  threat_or_violence: "Threat or violence",
  sexual_content: "Sexual content",
  impersonation: "Impersonation",
  scam_or_fraud: "Scam or fraud",
  other: "Something else",
};

const STATUS_FILTERS: { value: ModerationStatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const ACTION_LABELS: Record<string, string> = {
  hide_message: "Hid",
  restore_message: "Restored",
};

type AccessState = { status: "loading" } | { status: "error"; message: string } | { status: "denied" } | { status: "granted" };

type QueueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ModerationQueueItem[]; nextCursor: ModerationCursor | null };

// Phase 4 Slice L: a fourth tab alongside the three ModerationStatusFilter
// ones — deliberately not folded into ModerationStatusFilter itself, since
// "history" is not a report-status filter at all, it is a different data
// source entirely (the moderation_actions ledger, via list_moderation_
// actions(), never list_moderation_reports()).
type ActiveView = ModerationStatusFilter | "history";

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ModerationActionItem[]; nextCursor: ModerationActionCursor | null };

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ModerationRoute() {
  const auth = useAuthSession();
  // A stable identity string for the currently signed-in user (or null for
  // a guest) — used the same way PublicProfileRoute's own reportResetKey
  // is, as the dependency that forces every generation-guarded load below
  // to treat an authenticated-identity change as "start over", never
  // letting a previous user's in-flight response leak into a new session.
  const authIdentity = auth.status === "authenticated" ? auth.session.subject : null;

  const [accessState, setAccessState] = useState<AccessState>({ status: "loading" });
  const accessGenerationRef = useRef(0);

  const loadAccess = useCallback(() => {
    if (auth.status !== "authenticated") return;
    const generation = ++accessGenerationRef.current;
    setAccessState({ status: "loading" });
    checkModeratorAccess()
      .then((granted) => {
        if (accessGenerationRef.current !== generation) return;
        setAccessState(granted ? { status: "granted" } : { status: "denied" });
      })
      .catch((error: unknown) => {
        if (accessGenerationRef.current !== generation) return;
        setAccessState({ status: "error", message: error instanceof Error ? error.message : "We couldn't verify your access. Please try again." });
      });
  }, [auth.status, authIdentity]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  const [statusFilter, setStatusFilter] = useState<ModerationStatusFilter>("pending");
  const [activeView, setActiveView] = useState<ActiveView>("pending");
  const [queueState, setQueueState] = useState<QueueState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageActionError, setPageActionError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const queueGenerationRef = useRef(0);

  const [historyState, setHistoryState] = useState<HistoryState>({ status: "loading" });
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [historyActionError, setHistoryActionError] = useState<string | null>(null);
  const historyGenerationRef = useRef(0);

  const loadHistory = useCallback(() => {
    if (accessState.status !== "granted" || activeView !== "history") return;
    const generation = ++historyGenerationRef.current;
    setHistoryState({ status: "loading" });
    setHistoryActionError(null);
    listModerationActions(null)
      .then((page) => {
        if (historyGenerationRef.current !== generation) return;
        setHistoryState({ status: "ready", items: page.items, nextCursor: page.nextCursor });
      })
      .catch((error: unknown) => {
        if (historyGenerationRef.current !== generation) return;
        setHistoryState({ status: "error", message: error instanceof Error ? error.message : "The moderation history could not be loaded. Please try again." });
      });
  }, [accessState.status, activeView, authIdentity]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleLoadMoreHistory() {
    if (historyState.status !== "ready" || !historyState.nextCursor || loadingMoreHistory) return;
    const cursor = historyState.nextCursor;
    const generation = historyGenerationRef.current;
    setLoadingMoreHistory(true);
    setHistoryActionError(null);
    try {
      const page = await listModerationActions(cursor);
      if (historyGenerationRef.current !== generation) return;
      setHistoryState((prev) => (prev.status === "ready" ? { status: "ready", items: [...prev.items, ...page.items], nextCursor: page.nextCursor } : prev));
    } catch (error) {
      if (historyGenerationRef.current !== generation) return;
      setHistoryActionError(error instanceof Error ? error.message : "More history could not be loaded. Please try again.");
    } finally {
      if (historyGenerationRef.current === generation) setLoadingMoreHistory(false);
    }
  }

  const loadQueue = useCallback(() => {
    if (accessState.status !== "granted") return;
    const generation = ++queueGenerationRef.current;
    setQueueState({ status: "loading" });
    setPageActionError(null);
    fetchModerationReports(statusFilter, null)
      .then((page) => {
        if (queueGenerationRef.current !== generation) return;
        setQueueState({ status: "ready", items: page.items, nextCursor: page.nextCursor });
      })
      .catch((error: unknown) => {
        if (queueGenerationRef.current !== generation) return;
        setQueueState({ status: "error", message: error instanceof Error ? error.message : "The moderation queue could not be loaded. Please try again." });
      });
  }, [accessState.status, statusFilter, authIdentity]);

  useEffect(() => {
    setSelectedReportId(null);
    loadQueue();
  }, [loadQueue]);

  async function handleLoadMore() {
    if (queueState.status !== "ready" || !queueState.nextCursor || loadingMore) return;
    const cursor = queueState.nextCursor;
    const generation = queueGenerationRef.current;
    setLoadingMore(true);
    setPageActionError(null);
    try {
      const page = await fetchModerationReports(statusFilter, cursor);
      if (queueGenerationRef.current !== generation) return;
      setQueueState((prev) => (prev.status === "ready" ? { status: "ready", items: [...prev.items, ...page.items], nextCursor: page.nextCursor } : prev));
    } catch (error) {
      if (queueGenerationRef.current !== generation) return;
      setPageActionError(error instanceof Error ? error.message : "More reports could not be loaded. Please try again.");
    } finally {
      if (queueGenerationRef.current === generation) setLoadingMore(false);
    }
  }

  // Only ever called after a real, server-confirmed ReviewResult (see
  // ReviewDialog's own onReviewed contract) — never optimistic. A decided
  // report no longer belongs in the "pending" filter it was reviewed from,
  // so it is removed from the currently-rendered list, and the detail view
  // (if it was the selected item) closes back to the queue.
  function handleReviewed(reportId: string, _result: ReviewResult) {
    setQueueState((prev) => (prev.status === "ready" ? { status: "ready", items: prev.items.filter((item) => item.reportId !== reportId), nextCursor: prev.nextCursor } : prev));
    setSelectedReportId((current) => (current === reportId ? null : current));
  }

  // Only ever called after a real, server-confirmed EnforcementResult (see
  // EnforcementDialog's own onActed contract) — never optimistic. Unlike a
  // review decision, enforcement never changes report.status, so the item
  // stays exactly where it is in whichever filter/tab is currently shown —
  // only its own messageModerationStatus is patched in place, which is all
  // ReportDetail needs to swap between offering Hide and offering Restore.
  function handleEnforced(reportId: string, result: EnforcementResult) {
    setQueueState((prev) =>
      prev.status === "ready"
        ? {
            status: "ready",
            items: prev.items.map((item) =>
              item.reportId === reportId ? { ...item, messageModerationStatus: result.moderationStatus } : item
            ),
            nextCursor: prev.nextCursor,
          }
        : prev
    );
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to access moderation"
        description="Report review is restricted to active moderators."
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

  if (accessState.status === "loading") return <LoadingState label="Checking your access" />;
  if (accessState.status === "error") return <ErrorState message={accessState.message} onRetry={loadAccess} />;
  // Neutral denial — deliberately never worded like, or adjacent to, an
  // empty-queue state; a non-moderator must never be able to infer whether
  // any report exists at all.
  if (accessState.status === "denied") {
    return <EmptyState title="You don't have access to this page" description="Report review is restricted to active moderators." />;
  }

  const selectedItem = queueState.status === "ready" ? (queueState.items.find((item) => item.reportId === selectedReportId) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="smc-editorial text-xl font-medium text-[var(--smc-charcoal)]">Report review</h1>
        <p className="text-sm text-[var(--smc-charcoal-soft)]">
          Review pending reports. Deciding here records your review only — it never takes automatic action. See the{" "}
          <Link to="/community-guidelines" className="font-semibold text-[var(--smc-charcoal)] underline underline-offset-2">
            Community Guidelines
          </Link>{" "}
          this queue enforces.
        </p>
      </div>

      <div role="tablist" aria-label="Moderation view" className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => (
          <Chip
            key={filter.value}
            role="tab"
            aria-selected={activeView === filter.value}
            active={activeView === filter.value}
            onClick={() => {
              setStatusFilter(filter.value);
              setActiveView(filter.value);
            }}
          >
            {filter.label}
          </Chip>
        ))}
        {/* Phase 4 Slice L: a fourth tab, deliberately not a ModerationStatusFilter
            value — switching here never touches statusFilter/selectedReportId,
            and switching back to a status tab never re-fetches history that's
            already loaded (loadHistory only re-runs when activeView === "history"). */}
        <Chip role="tab" aria-selected={activeView === "history"} active={activeView === "history"} onClick={() => setActiveView("history")}>
          History
        </Chip>
      </div>

      {activeView === "history" ? (
        <div>
          {historyState.status === "loading" && <LoadingState label="Loading moderation history" />}
          {historyState.status === "error" && <ErrorState message={historyState.message} onRetry={loadHistory} />}
          {historyState.status === "ready" && historyState.items.length === 0 && (
            <EmptyState title="No moderation actions yet" description="Hide and Restore actions will appear here once a moderator takes one." />
          )}
          {historyState.status === "ready" && historyState.items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {historyState.items.map((item) => (
                <li
                  key={item.actionId}
                  className="flex flex-col gap-1 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--smc-charcoal)]">
                    <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {ACTION_LABELS[item.action] ?? item.action} a {item.reportTargetKind} message —{" "}
                    {CATEGORY_LABELS[item.reportCategory] ?? item.reportCategory} report
                  </span>
                  <span className="text-xs text-[var(--smc-charcoal-faint)]">
                    {item.moderatorDisplayName} · {formatTimestamp(item.createdAt)}
                  </span>
                  {item.note && <p className="whitespace-pre-wrap break-words text-sm text-[var(--smc-charcoal-soft)]">{item.note}</p>}
                </li>
              ))}
            </ul>
          )}

          {historyActionError && (
            <p role="alert" className="mt-2 text-xs font-medium text-[var(--smc-mineral-clay)]">
              {historyActionError}
            </p>
          )}

          {historyState.status === "ready" && historyState.nextCursor && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void handleLoadMoreHistory()}
                disabled={loadingMoreHistory}
                className="min-h-[44px] rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-xs font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMoreHistory ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      ) : (
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className={selectedItem ? "hidden lg:block" : "block"}>
          {queueState.status === "loading" && <LoadingState label="Loading queue" />}
          {queueState.status === "error" && <ErrorState message={queueState.message} onRetry={loadQueue} />}
          {queueState.status === "ready" && queueState.items.length === 0 && (
            <EmptyState title={`No ${statusFilter} reports`} description="There is nothing to show for this filter right now." />
          )}
          {queueState.status === "ready" && queueState.items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {queueState.items.map((item) => (
                <li key={item.reportId}>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(item.reportId)}
                    aria-current={selectedReportId === item.reportId}
                    className="flex min-h-[44px] w-full flex-col gap-1 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 text-left outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] aria-[current=true]:border-[var(--smc-mineral-bronze)]"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--smc-charcoal)]">
                      <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {CATEGORY_LABELS[item.category] ?? item.category}
                      <span className="text-xs font-normal capitalize text-[var(--smc-charcoal-faint)]">· {item.targetKind}</span>
                    </span>
                    <span className="text-xs text-[var(--smc-charcoal-faint)]">{formatTimestamp(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pageActionError && (
            <p role="alert" className="mt-2 text-xs font-medium text-[var(--smc-mineral-clay)]">
              {pageActionError}
            </p>
          )}

          {queueState.status === "ready" && queueState.nextCursor && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="min-h-[44px] rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 text-xs font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>

        <div className={selectedItem ? "block" : "hidden lg:block"}>
          {selectedItem ? (
            <ReportDetail item={selectedItem} onBack={() => setSelectedReportId(null)} onReviewed={handleReviewed} onEnforced={handleEnforced} />
          ) : (
            <EmptyState title="Select a report" description="Choose a report from the queue to see its details." />
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function ReportDetail({
  item,
  onBack,
  onReviewed,
  onEnforced,
}: {
  item: ModerationQueueItem;
  onBack: () => void;
  onReviewed: (reportId: string, result: ReviewResult) => void;
  onEnforced: (reportId: string, result: EnforcementResult) => void;
}) {
  return (
    <Card className="p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex min-h-[44px] items-center gap-1.5 rounded-[var(--smc-radius-pill)] px-2 text-sm font-semibold text-[var(--smc-charcoal-soft)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to queue
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-2.5 py-1 text-xs font-semibold text-[var(--smc-charcoal-soft)]">
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
        <span className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] px-2.5 py-1 text-xs capitalize text-[var(--smc-charcoal-faint)]">
          {item.targetKind} report
        </span>
        <span className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] px-2.5 py-1 text-xs capitalize text-[var(--smc-charcoal-faint)]">
          {item.status}
        </span>
      </div>

      <p className="mt-3 text-xs text-[var(--smc-charcoal-faint)]">Submitted {formatTimestamp(item.createdAt)}</p>

      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal-faint)]">Reporter</dt>
          <dd className="text-[var(--smc-charcoal)]">{item.reporterDisplayName ?? "Profile unavailable"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal-faint)]">Reported</dt>
          <dd className="text-[var(--smc-charcoal)]">{item.reportedDisplayName ?? "Profile unavailable"}</dd>
        </div>
        {item.details && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal-faint)]">Reporter's details</dt>
            {/* whitespace-pre-wrap over a plain text node — never dangerouslySetInnerHTML — so this can never execute HTML/script content. */}
            <dd className="whitespace-pre-wrap break-words text-[var(--smc-charcoal)]">{item.details}</dd>
          </div>
        )}
        {item.targetKind === "message" && (
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal-faint)]">
              Reported message
              {/* Shown to the moderator alongside the evidence itself — the
                  message body above is always the real content regardless
                  of this status (moderator evidence access is never
                  affected by hiding), this badge only reflects what
                  ordinary conversation members currently see. */}
              {item.messageModerationStatus === "removed_by_moderator" && (
                <span className="rounded-[var(--smc-radius-pill)] bg-[var(--smc-mineral-clay)]/15 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-[var(--smc-mineral-clay)]">
                  Hidden from conversation
                </span>
              )}
            </dt>
            {item.messageBody !== null ? (
              <>
                <dd className="whitespace-pre-wrap break-words rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-3 py-2 text-[var(--smc-charcoal)]">
                  {item.messageBody}
                </dd>
                {item.messageCreatedAt && <p className="mt-1 text-[11px] text-[var(--smc-charcoal-faint)]">Sent {formatTimestamp(item.messageCreatedAt)}</p>}
              </>
            ) : (
              <dd className="text-[var(--smc-charcoal-faint)]">Message unavailable</dd>
            )}
          </div>
        )}
      </dl>

      {item.status === "pending" ? (
        <div className="mt-5 flex gap-2">
          <ReviewDialog reportId={item.reportId} decision="resolved" triggerLabel="Resolve" onReviewed={(result) => onReviewed(item.reportId, result)} />
          <ReviewDialog reportId={item.reportId} decision="dismissed" triggerLabel="Dismiss" onReviewed={(result) => onReviewed(item.reportId, result)} />
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--smc-charcoal)]">
            {item.status === "resolved" ? "Resolved" : "Dismissed"} by {item.reviewedByDisplayName ?? "Profile unavailable"}
          </p>
          {item.reviewedAt && <p className="text-xs text-[var(--smc-charcoal-faint)]">{formatTimestamp(item.reviewedAt)}</p>}
          {item.reviewNote && <p className="mt-2 whitespace-pre-wrap break-words text-[var(--smc-charcoal-soft)]">{item.reviewNote}</p>}
        </div>
      )}

      {/* Phase 4 Slice K: exactly one further action, only ever offered for
          a resolved message-target report — never a profile report (not
          currently enforceable at all — see moderate_reported_message's own
          target-kind gate), never a pending/dismissed one (review must
          happen first). Hide/Restore are mutually exclusive: only the
          action matching the message's own current moderation_status is
          ever offered, so this can never present a button that would only
          fail the RPC's own compare-and-swap. */}
      {item.status === "resolved" && item.targetKind === "message" && item.messageModerationStatus === "visible" && (
        <div className="mt-3 flex gap-2">
          <EnforcementDialog
            reportId={item.reportId}
            action="hide_message"
            triggerLabel="Hide message"
            onActed={(result) => onEnforced(item.reportId, result)}
          />
        </div>
      )}
      {item.status === "resolved" && item.targetKind === "message" && item.messageModerationStatus === "removed_by_moderator" && (
        <div className="mt-3 flex gap-2">
          <EnforcementDialog
            reportId={item.reportId}
            action="restore_message"
            triggerLabel="Restore message"
            onActed={(result) => onEnforced(item.reportId, result)}
          />
        </div>
      )}
    </Card>
  );
}
