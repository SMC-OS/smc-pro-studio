import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";
import type { ReportCategory, ReportTargetKind } from "./reportingClient";

/**
 * Phase 4 Slice J/K/L: service boundary for moderator report review,
 * message enforcement, and the moderation-actions audit history. Wraps
 * 20260830193342_moderation_review.sql's three review RPCs
 * (check_moderator_access, list_moderation_reports, review_report),
 * 20260831151303_moderation_enforcement.sql's one enforcement RPC
 * (moderate_reported_message), and 20260909211227_moderation_history_view.
 * sql's one read-only history RPC (list_moderation_actions) exactly as
 * merged — no schema/RLS/grant/RPC change of any kind happens here, and
 * this file never queries or writes public.reports/public.messages/
 * public.moderation_actions directly (each grants no client write of any
 * kind, and as of Slice L moderation_actions grants no client read of any
 * kind either — every read this file needs already flows through
 * list_moderation_reports()/list_moderation_actions() themselves). A
 * dedicated file, not folded into reportingClient.ts: report *submission*
 * (reportingClient.ts) and report *review/enforcement/history* (this file)
 * are distinct authorization domains — every authenticated user can submit,
 * only an active moderator can review, enforce, or read the audit history —
 * the same reasoning that already gave reporting its own file distinct from
 * messagingClient.ts despite referencing the same underlying messages
 * table.
 */

// Mirrors public.report_status exactly (20260830105617_reporting_foundation.sql).
export type ModerationStatusFilter = "pending" | "resolved" | "dismissed";

const MODERATION_STATUS_SET: ReadonlySet<string> = new Set<ModerationStatusFilter>(["pending", "resolved", "dismissed"]);

function isModerationStatusFilter(value: unknown): value is ModerationStatusFilter {
  return typeof value === "string" && MODERATION_STATUS_SET.has(value);
}

// Mirrors what public.review_report accepts for p_decision exactly — a
// strict subset of ModerationStatusFilter. 'pending' is deliberately not a
// member of this type at all (not merely rejected at runtime): there is no
// TypeScript-level way to even attempt to pass it as a decision.
export type ReviewDecision = "resolved" | "dismissed";

const REVIEW_DECISION_SET: ReadonlySet<string> = new Set<ReviewDecision>(["resolved", "dismissed"]);

function isReviewDecision(value: unknown): value is ReviewDecision {
  return typeof value === "string" && REVIEW_DECISION_SET.has(value);
}

// Mirrors public.moderation_action_type exactly (20260831151303_moderation_
// enforcement.sql) — exactly two values, message enforcement only, per this
// slice's own explicit scope boundary (no profile/post/comment action of
// any kind exists to type here).
export type ModerationAction = "hide_message" | "restore_message";

const MODERATION_ACTION_SET: ReadonlySet<string> = new Set<ModerationAction>(["hide_message", "restore_message"]);

function isModerationAction(value: unknown): value is ModerationAction {
  return typeof value === "string" && MODERATION_ACTION_SET.has(value);
}

// Mirrors public.moderation_status exactly (20260819120000_social_core.sql)
// — the same three-value enum posts/comments already carry. Typed with all
// three values (never narrowed to only the two this slice's own RPC can
// produce for a message) so a future value is a type-safe "unknown state",
// never a silently-miscoerced one.
export type MessageModerationStatus = "visible" | "removed_by_owner" | "removed_by_moderator";

const MESSAGE_MODERATION_STATUS_SET: ReadonlySet<string> = new Set<MessageModerationStatus>([
  "visible",
  "removed_by_owner",
  "removed_by_moderator",
]);

function isMessageModerationStatus(value: unknown): value is MessageModerationStatus {
  return typeof value === "string" && MESSAGE_MODERATION_STATUS_SET.has(value);
}

/**
 * Exactly what public.check_moderator_access() returns — the caller's own
 * current active-moderator status, nothing else. A plain boolean alias
 * (not a richer object) because the RPC itself returns exactly a boolean;
 * named here so every call site reads as "moderator access", not a bare
 * unlabeled boolean.
 */
export type ModeratorAccessResult = boolean;

/**
 * One row of public.list_moderation_reports()'s result, camelCased —
 * mirrors this file's own convention (MessageReadCursor in
 * messagingClient.ts, ReportReceipt in reportingClient.ts) of camelCase
 * client-side fields regardless of the RPC's own snake_case column names.
 * Every field here is exactly what the RPC is documented to return — no
 * email, phone, auth metadata, or role-assignment record of any kind ever
 * passes through this shape, because the RPC itself never selects any such
 * column in the first place.
 */
export interface ModerationQueueItem {
  reportId: string;
  targetKind: ReportTargetKind;
  category: ReportCategory;
  /** The reporter's own submitted details — never message body content. */
  details: string | null;
  createdAt: string;
  status: ModerationStatusFilter;
  /** Non-null only once finalized — reports_review_state_consistent guarantees this pairing server-side; validated again here rather than assumed. */
  reviewedAt: string | null;
  /** A resolved display name (or the same neutral fallback the RPC itself uses) — never the reviewer's raw id. */
  reviewedByDisplayName: string | null;
  reviewNote: string | null;
  reporterDisplayName: string | null;
  reportedDisplayName: string | null;
  /** Non-null only for a message-report row — always null for a profile report (the RPC's own LEFT JOIN on message_id makes this structural, not a special case this file adds). */
  messageBody: string | null;
  messageCreatedAt: string | null;
  /** Non-null only for a message-report row, for the identical structural reason as messageBody above. Reflects the reported message's *current* state — 'visible' unless a moderator has hidden it via moderateReportedMessage(). */
  messageModerationStatus: MessageModerationStatus | null;
}

/** Mirrors messagingClient.ts's own MessageCursor shape exactly — (createdAt, id) as an opaque keyset cursor. */
export interface ModerationCursor {
  createdAt: string;
  id: string;
}

export interface ModerationQueuePage {
  items: ModerationQueueItem[];
  /** Present only when the RPC's own server-computed has_more flag confirms a next page exists. */
  nextCursor: ModerationCursor | null;
}

/** Mirrors ModerationCursor's own (createdAt, id) keyset shape — here `id` is the ledger row's own action_id, not a report_id. */
export interface ModerationActionCursor {
  createdAt: string;
  id: string;
}

/**
 * One row of public.list_moderation_actions()'s result, camelCased —
 * mirrors ModerationQueueItem's own convention. Deliberately narrow: never
 * moderatorId (only moderatorDisplayName — accountable audit attribution,
 * the same coalesce-to-"Profile unavailable" pattern reviewedByDisplayName
 * already establishes), never reporter/reported-user identity of any kind,
 * never report details, never message body — this is an audit trail of
 * moderator actions, not a second evidence-access surface (that remains
 * list_moderation_reports()'s own, unchanged, responsibility).
 */
export interface ModerationActionItem {
  actionId: string;
  reportId: string;
  messageId: string;
  action: ModerationAction;
  moderatorDisplayName: string;
  reportCategory: ReportCategory;
  reportTargetKind: ReportTargetKind;
  note: string | null;
  createdAt: string;
}

export interface ModerationActionPage {
  items: ModerationActionItem[];
  nextCursor: ModerationActionCursor | null;
}

/** Exactly what public.review_report() returns — the minimal server-confirmed result the UI needs, never the note text or reviewer identity (the caller already knows both). */
export interface ReviewResult {
  reportId: string;
  status: ReviewDecision;
  reviewedAt: string;
}

/** Exactly what public.moderate_reported_message() returns — the minimal server-confirmed result the UI needs, never the note text or acting-moderator identity (the caller already knows both). */
export interface EnforcementResult {
  actionId: string;
  messageId: string;
  moderationStatus: MessageModerationStatus;
  actedAt: string;
}

/**
 * The one error boundary every backend (Postgres/PostgREST/RPC) failure in
 * this file passes through before reaching a caller — the identical
 * discipline reportingClient.ts's ReportingOperationError /
 * messagingClient.ts's MessagingOperationError already establish.
 * `operation` is for tests/logging only, never rendered; `message` is
 * always one of the safe constants authored by this file, never derived
 * from `error.message`.
 */
export type ModerationOperation = "check_access" | "fetch_queue" | "review_report" | "moderate_message" | "fetch_action_history";

export class ModerationOperationError extends Error {
  readonly operation: ModerationOperation;

  constructor(operation: ModerationOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ModerationOperationError";
    this.operation = operation;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rejects a malformed ID before it ever reaches an RPC call — same guard shape as reportingClient.ts's requireUuid. */
function requireUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a valid ID.`);
  }
  return value;
}

function requireClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  return getSupabaseClient();
}

/**
 * The repository's existing trusted authentication pattern (duplicated
 * here rather than imported — each service file in this codebase owns its
 * own copy; socialClient.ts/messagingClient.ts/reportingClient.ts already
 * do the same rather than sharing one cross-file helper). An unconfigured
 * client throws SocialUnavailableError, a genuine auth.getUser() failure
 * (network/token problem, not "no session") also throws
 * SocialUnavailableError with a generic session-verification message
 * (never the action-specific "Sign in..." text), and only a *successful*
 * getUser() call that comes back with no user throws `signInMessage`. All
 * three happen before any RPC call.
 */
async function requireAuthenticatedClient(signInMessage: string) {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw new SocialUnavailableError("Your session could not be verified. Please try again.", { cause: userError });
  }
  if (!userData.user) throw new Error(signInMessage);
  return { client, userId: userData.user.id };
}

const QUEUE_MIN_LIMIT = 1;
const QUEUE_MAX_LIMIT = 50;
const QUEUE_DEFAULT_LIMIT = 25;

function clampLimit(limit: number | undefined, fallback: number, max: number, min = 1): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), min), max);
}

/** Matches reports_review_note_bounded's `char_length(review_note) between 1 and 1000` check constraint. */
export const REVIEW_NOTE_MAX_LENGTH = 1000;

/**
 * Trims a supplied review note and rejects a whitespace-only value outright
 * (never silently coerced into "omitted") — the identical discipline
 * reportingClient.ts's own prepareDetails already establishes for report
 * `details`, mirrored here for `review_note`. Omitted/null stays null.
 */
function prepareReviewNote(note: string | undefined): string | null {
  if (note === undefined || note === null) return null;
  const trimmed = note.trim();
  if (trimmed === "") {
    throw new Error("Note can't be whitespace-only.");
  }
  if (trimmed.length > REVIEW_NOTE_MAX_LENGTH) {
    throw new Error(`Note must be ${REVIEW_NOTE_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

// ==========================================================================
// checkModeratorAccess
// ==========================================================================

const SAFE_ACCESS_CHECK_ERROR = "We couldn't verify your access. Please try again.";

/**
 * Calls public.check_moderator_access() — zero arguments, exactly matching
 * its signature; there is no parameter through which a caller could ask
 * about anyone else's moderator status. A `false` return is a genuine,
 * confirmed "not currently an active moderator" answer — not an error and
 * never fabricated — but any real RPC failure (unconfigured client, auth
 * verification failure, network/database problem, or a malformed
 * non-boolean response) always throws, and is never reinterpreted as a
 * successful denial: the caller must be able to tell "you are confirmed not
 * a moderator" apart from "we don't know, something failed" (the UI's own
 * loading/error states depend on this distinction — see ModerationRoute).
 */
export async function checkModeratorAccess(): Promise<ModeratorAccessResult> {
  const { client } = await requireAuthenticatedClient("Sign in to access moderation.");
  const { data, error } = await client.rpc("check_moderator_access");
  if (error) {
    throw new ModerationOperationError("check_access", SAFE_ACCESS_CHECK_ERROR, { cause: error });
  }
  if (typeof data !== "boolean") {
    throw new ModerationOperationError("check_access", SAFE_ACCESS_CHECK_ERROR);
  }
  return data;
}

// ==========================================================================
// fetchModerationReports
// ==========================================================================

const SAFE_QUEUE_ERROR = "The moderation queue could not be loaded. Please try again.";

function parseQueueItem(raw: unknown): ModerationQueueItem {
  if (!raw || typeof raw !== "object") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  const record = raw as Record<string, unknown>;
  let reportId: string;
  try {
    reportId = requireUuid(record.report_id, "report_id");
  } catch (parseError) {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR, { cause: parseError });
  }
  const targetKind = record.target_kind;
  if (targetKind !== "profile" && targetKind !== "message") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (typeof record.category !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (typeof record.created_at !== "string" || !record.created_at) {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (!isModerationStatusFilter(record.status)) {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.details !== null && typeof record.details !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.reviewed_at !== null && typeof record.reviewed_at !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.reviewed_by_display_name !== null && typeof record.reviewed_by_display_name !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.review_note !== null && typeof record.review_note !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.reporter_display_name !== null && typeof record.reporter_display_name !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.reported_display_name !== null && typeof record.reported_display_name !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.message_body !== null && typeof record.message_body !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  if (record.message_created_at !== null && typeof record.message_created_at !== "string") {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  // Cross-validated against targetKind, not merely checked for its own
  // shape: a message report's status is only ever null when the referenced
  // message row itself is somehow unresolvable (structurally near-impossible
  // — reports_message_reference_fk already guarantees a message report's
  // message_id points at a real row — but never trusted blindly here), and
  // a profile report must never carry a status at all (the RPC's own LEFT
  // JOIN on message_id makes this structural on the server side; this check
  // makes it structural on the client side too, rather than merely hoping
  // the server never sends a malformed combination).
  if (targetKind === "message") {
    if (!isMessageModerationStatus(record.message_moderation_status)) {
      throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
    }
  } else if (record.message_moderation_status !== null) {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }
  return {
    reportId,
    targetKind,
    category: record.category as ReportCategory,
    details: record.details as string | null,
    createdAt: record.created_at,
    status: record.status,
    reviewedAt: record.reviewed_at as string | null,
    reviewedByDisplayName: record.reviewed_by_display_name as string | null,
    reviewNote: record.review_note as string | null,
    reporterDisplayName: record.reporter_display_name as string | null,
    reportedDisplayName: record.reported_display_name as string | null,
    messageBody: record.message_body as string | null,
    messageCreatedAt: record.message_created_at as string | null,
    messageModerationStatus: record.message_moderation_status as MessageModerationStatus | null,
  };
}

/**
 * Calls public.list_moderation_reports(p_status, p_limit,
 * p_cursor_created_at, p_cursor_id) — the exact merged parameter names, and
 * no others; there is no caller-suppliable moderator identity parameter of
 * any kind (the RPC binds to auth.uid() internally and re-verifies active
 * moderator status on every call). `status` is required (an exact one of
 * pending/resolved/dismissed, never a caller-suppliable "all" or omitted
 * filter that could mix statuses); `limit` is clamped client-side to
 * [1, 50] before the call (the RPC independently re-clamps regardless —
 * defense in depth, never trusting a client-declared bound alone); `cursor`
 * — when supplied — must carry both `createdAt` and `id` together, matching
 * the RPC's own "both or neither" validation.
 *
 * A genuinely empty page is a real, successful result (a moderator with
 * nothing pending sees a real empty queue) — but an RPC failure (denied
 * access, a revoked role, a network/database problem, or a malformed
 * response) always throws and is never reinterpreted as an empty queue;
 * only a query that actually ran and returned zero rows produces `[]`.
 * `hasMore`/`nextCursor` are read from the RPC's own server-computed
 * `has_more` flag on the last returned row — never inferred from an
 * overfetch trick client-side, since the RPC's own [1, 50] ceiling would
 * otherwise collide with asking for `limit + 1`.
 */
export async function fetchModerationReports(
  status: ModerationStatusFilter,
  cursor: ModerationCursor | null = null,
  limit?: number
): Promise<ModerationQueuePage> {
  const { client } = await requireAuthenticatedClient("Sign in to access moderation.");
  if (!isModerationStatusFilter(status)) {
    throw new Error("Choose a valid moderation status.");
  }
  if (cursor) {
    requireUuid(cursor.id, "The cursor report ID");
    if (typeof cursor.createdAt !== "string" || !cursor.createdAt) {
      throw new Error("The cursor creation time must be valid.");
    }
  }
  const boundedLimit = clampLimit(limit, QUEUE_DEFAULT_LIMIT, QUEUE_MAX_LIMIT, QUEUE_MIN_LIMIT);

  const { data, error } = await client.rpc("list_moderation_reports", {
    p_status: status,
    p_limit: boundedLimit,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
  });
  if (error) {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR, { cause: error });
  }
  if (!Array.isArray(data)) {
    throw new ModerationOperationError("fetch_queue", SAFE_QUEUE_ERROR);
  }

  const items = data.map((row) => parseQueueItem(row));
  const last = items[items.length - 1];
  const lastRaw = data[data.length - 1] as Record<string, unknown> | undefined;
  const hasMore = lastRaw !== undefined && lastRaw.has_more === true;
  const nextCursor = hasMore && last ? { createdAt: last.createdAt, id: last.reportId } : null;
  return { items, nextCursor };
}

// ==========================================================================
// reviewReport
// ==========================================================================

const SAFE_REVIEW_ERROR = "This report could not be reviewed. Please try again.";

function parseReviewResult(raw: unknown): ReviewResult {
  if (!raw || typeof raw !== "object") {
    throw new ModerationOperationError("review_report", SAFE_REVIEW_ERROR);
  }
  const record = raw as Record<string, unknown>;
  let reportId: string;
  try {
    reportId = requireUuid(record.report_id, "report_id");
  } catch (parseError) {
    throw new ModerationOperationError("review_report", SAFE_REVIEW_ERROR, { cause: parseError });
  }
  if (!isReviewDecision(record.status)) {
    throw new ModerationOperationError("review_report", SAFE_REVIEW_ERROR);
  }
  if (typeof record.reviewed_at !== "string" || !record.reviewed_at) {
    throw new ModerationOperationError("review_report", SAFE_REVIEW_ERROR);
  }
  return { reportId, status: record.status, reviewedAt: record.reviewed_at };
}

/**
 * Calls public.review_report(p_report_id, p_decision, p_note) — the exact
 * merged parameter names, and no others; there is no p_reviewed_by/
 * p_reviewed_at parameter of any kind to send even if this file wanted to
 * — both always come from the database itself (auth.uid() and now()) on
 * the server side. `decision` is typed to only ever be "resolved" or
 * "dismissed" (TypeScript itself rejects "pending" as an argument before
 * this function's own body even runs); the database remains authoritative
 * for the atomic pending-to-final transition, conflict-of-interest
 * rejection, and every other business rule — this function's own
 * responsibility ends at auth/UUID/decision/note validation, exactly
 * mirroring reportingClient.ts's submitProfileReport/submitMessageReport.
 *
 * Every RPC failure — access denied, a revoked role, conflict-of-interest,
 * an already-finalized report, or a genuine network/database problem —
 * collapses to the same safe SAFE_REVIEW_ERROR text, the original error
 * preserved as `cause` for logging. A concurrent-finalization failure (two
 * moderators racing) is therefore indistinguishable from any other review
 * failure to the caller — the UI's own recovery path (Refresh/Retry) is the
 * same regardless of cause.
 */
export async function reviewReport(reportId: string, decision: ReviewDecision, note?: string): Promise<ReviewResult> {
  const { client } = await requireAuthenticatedClient("Sign in to review this report.");
  requireUuid(reportId, "The report ID");
  if (!isReviewDecision(decision)) {
    throw new Error("Choose resolved or dismissed.");
  }
  const preparedNote = prepareReviewNote(note);

  const { data, error } = await client.rpc("review_report", {
    p_report_id: reportId,
    p_decision: decision,
    p_note: preparedNote,
  });
  if (error) {
    throw new ModerationOperationError("review_report", SAFE_REVIEW_ERROR, { cause: error });
  }
  // review_report()'s `returns table (...)` serializes as a JSON array over
  // PostgREST, the same as mark_conversation_read()'s own `returns setof` —
  // the function's own body either returns exactly one row via `return
  // query select ...` or raises before ever reaching that point, so a
  // well-formed call always yields exactly one element here.
  if (!Array.isArray(data) || data.length !== 1) {
    throw new ModerationOperationError("review_report", SAFE_REVIEW_ERROR);
  }
  return parseReviewResult(data[0]);
}

// ==========================================================================
// moderateReportedMessage
// ==========================================================================

const SAFE_ENFORCEMENT_ERROR = "This action could not be completed. Please try again.";

function parseEnforcementResult(raw: unknown): EnforcementResult {
  if (!raw || typeof raw !== "object") {
    throw new ModerationOperationError("moderate_message", SAFE_ENFORCEMENT_ERROR);
  }
  const record = raw as Record<string, unknown>;
  let actionId: string;
  let messageId: string;
  try {
    actionId = requireUuid(record.action_id, "action_id");
    messageId = requireUuid(record.message_id, "message_id");
  } catch (parseError) {
    throw new ModerationOperationError("moderate_message", SAFE_ENFORCEMENT_ERROR, { cause: parseError });
  }
  if (!isMessageModerationStatus(record.moderation_status)) {
    throw new ModerationOperationError("moderate_message", SAFE_ENFORCEMENT_ERROR);
  }
  if (typeof record.acted_at !== "string" || !record.acted_at) {
    throw new ModerationOperationError("moderate_message", SAFE_ENFORCEMENT_ERROR);
  }
  return { actionId, messageId, moderationStatus: record.moderation_status, actedAt: record.acted_at };
}

/**
 * Calls public.moderate_reported_message(p_report_id, p_action, p_note) —
 * the exact merged parameter names, and no others; there is no
 * p_moderator_id parameter of any kind to send even if this file wanted to
 * — the acting moderator always comes from the database itself (auth.uid())
 * on the server side. `action` is typed to only ever be "hide_message" or
 * "restore_message" — the only two values this slice supports (no profile/
 * post/comment action exists to pass); the database remains authoritative
 * for the report-shape/status gate, the conflict-of-interest rejection, and
 * the atomic compare-and-swap transition — this function's own
 * responsibility ends at auth/UUID/action/note validation, exactly
 * mirroring reviewReport above.
 *
 * Every RPC failure — access denied, a revoked role, conflict-of-interest, a
 * report that is pending/dismissed/profile-target, a message already in the
 * target state (concurrent enforcement), or a genuine network/database
 * problem — collapses to the same safe SAFE_ENFORCEMENT_ERROR text, the
 * original error preserved as `cause` for logging. A concurrent-enforcement
 * failure (two moderators racing) is therefore indistinguishable from any
 * other failure to the caller — the UI's own recovery path (reload the
 * report) is the same regardless of cause.
 */
export async function moderateReportedMessage(reportId: string, action: ModerationAction, note?: string): Promise<EnforcementResult> {
  const { client } = await requireAuthenticatedClient("Sign in to moderate this report.");
  requireUuid(reportId, "The report ID");
  if (!isModerationAction(action)) {
    throw new Error("Choose hide or restore.");
  }
  const preparedNote = prepareReviewNote(note);

  const { data, error } = await client.rpc("moderate_reported_message", {
    p_report_id: reportId,
    p_action: action,
    p_note: preparedNote,
  });
  if (error) {
    throw new ModerationOperationError("moderate_message", SAFE_ENFORCEMENT_ERROR, { cause: error });
  }
  // moderate_reported_message()'s `returns table (...)` serializes as a JSON
  // array over PostgREST, identically to review_report() above — a
  // well-formed call always yields exactly one element here.
  if (!Array.isArray(data) || data.length !== 1) {
    throw new ModerationOperationError("moderate_message", SAFE_ENFORCEMENT_ERROR);
  }
  return parseEnforcementResult(data[0]);
}

// ==========================================================================
// listModerationActions
// ==========================================================================

const SAFE_ACTION_HISTORY_ERROR = "The moderation history could not be loaded. Please try again.";

function isReportTargetKind(value: unknown): value is ReportTargetKind {
  return value === "profile" || value === "message";
}

function parseActionHistoryItem(raw: unknown): ModerationActionItem {
  if (!raw || typeof raw !== "object") {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  const record = raw as Record<string, unknown>;
  let actionId: string;
  let reportId: string;
  let messageId: string;
  try {
    actionId = requireUuid(record.action_id, "action_id");
    reportId = requireUuid(record.report_id, "report_id");
    messageId = requireUuid(record.message_id, "message_id");
  } catch (parseError) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR, { cause: parseError });
  }
  if (!isModerationAction(record.action)) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  if (typeof record.moderator_display_name !== "string" || !record.moderator_display_name) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  if (typeof record.report_category !== "string") {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  if (!isReportTargetKind(record.report_target_kind)) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  if (record.note !== null && typeof record.note !== "string") {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  if (typeof record.created_at !== "string" || !record.created_at) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }
  return {
    actionId,
    reportId,
    messageId,
    action: record.action,
    moderatorDisplayName: record.moderator_display_name,
    reportCategory: record.report_category as ReportCategory,
    reportTargetKind: record.report_target_kind,
    note: record.note as string | null,
    createdAt: record.created_at,
  };
}

/**
 * Calls public.list_moderation_actions(p_limit, p_cursor_created_at,
 * p_cursor_id, p_report_id) — the exact merged parameter names, and no
 * others; there is no caller-suppliable moderator identity parameter of any
 * kind (the RPC binds to auth.uid() internally via private.is_active_
 * moderator() and re-verifies on every call, never trusting a prior
 * checkModeratorAccess() result). `limit` is clamped client-side to [1, 50]
 * before the call (the RPC independently re-clamps regardless — defense in
 * depth, the identical discipline fetchModerationReports already
 * establishes); `cursor` — when supplied — must carry both `createdAt` and
 * `id` together, matching the RPC's own "both or neither" validation.
 * `reportId` — when supplied — scopes the result to one report's own action
 * history; omitted, it is the global feed across every report a moderator
 * has ever acted on.
 *
 * As of Slice L, public.moderation_actions grants no client SELECT of any
 * kind — this function is the only client-reachable way to read it, and
 * this file never falls back to a raw `.from("moderation_actions")` query
 * of any kind, matching the identical discipline this file already
 * establishes for `reports`/`messages`.
 *
 * A genuinely empty page is a real, successful result (a moderator who has
 * never acted, or a report with no history yet, sees a real empty list) —
 * but an RPC failure (denied access, a revoked role, a network/database
 * problem, or a malformed response) always throws and is never
 * reinterpreted as an empty history; only a query that actually ran and
 * returned zero rows produces `[]`. `hasMore`/`nextCursor` are read from
 * the RPC's own server-computed `has_more` flag on the last returned row —
 * never inferred from an overfetch trick client-side, the same reasoning
 * fetchModerationReports already documents.
 */
export async function listModerationActions(
  cursor: ModerationActionCursor | null = null,
  limit?: number,
  reportId?: string
): Promise<ModerationActionPage> {
  const { client } = await requireAuthenticatedClient("Sign in to access moderation.");
  if (cursor) {
    requireUuid(cursor.id, "The cursor action ID");
    if (typeof cursor.createdAt !== "string" || !cursor.createdAt) {
      throw new Error("The cursor creation time must be valid.");
    }
  }
  if (reportId !== undefined) {
    requireUuid(reportId, "The report ID");
  }
  const boundedLimit = clampLimit(limit, QUEUE_DEFAULT_LIMIT, QUEUE_MAX_LIMIT, QUEUE_MIN_LIMIT);

  const { data, error } = await client.rpc("list_moderation_actions", {
    p_limit: boundedLimit,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_report_id: reportId ?? null,
  });
  if (error) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR, { cause: error });
  }
  if (!Array.isArray(data)) {
    throw new ModerationOperationError("fetch_action_history", SAFE_ACTION_HISTORY_ERROR);
  }

  const items = data.map((row) => parseActionHistoryItem(row));
  const last = items[items.length - 1];
  const lastRaw = data[data.length - 1] as Record<string, unknown> | undefined;
  const hasMore = lastRaw !== undefined && lastRaw.has_more === true;
  const nextCursor = hasMore && last ? { createdAt: last.createdAt, id: last.actionId } : null;
  return { items, nextCursor };
}
