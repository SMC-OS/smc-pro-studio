import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";

/**
 * Phase 4 Slice I: service boundary for reporting only. Wraps
 * 20260830105617_reporting_foundation.sql's two client-reachable RPCs
 * (submit_profile_report, submit_message_report) exactly as merged — no
 * schema/RLS/grant/RPC change of any kind happens here, and this file never
 * queries or writes public.reports directly (that table grants no client
 * INSERT of any kind, and its only SELECT policy is moderator-only — see the
 * migration). A dedicated file, not folded into messagingClient.ts or
 * socialClient.ts: reporting is a distinct safety/moderation domain, the
 * same reasoning that gave direct messaging (Slice B) and reporting's own
 * pgTAP suite (Slice H) each their own file despite messaging/reporting
 * referencing the same underlying messages table.
 */

// Mirrors public.report_category exactly (20260830105617_reporting_foundation.sql).
// The array below is this module's single source of truth for the vocabulary —
// both the runtime validity check and the UI's option list are derived from
// it, so there is no second place that could silently drift out of sync with
// the enum.
export const REPORT_CATEGORIES = [
  "spam",
  "harassment",
  "hate_or_abuse",
  "threat_or_violence",
  "sexual_content",
  "impersonation",
  "scam_or_fraud",
  "other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

const REPORT_CATEGORY_SET: ReadonlySet<string> = new Set(REPORT_CATEGORIES);

function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && REPORT_CATEGORY_SET.has(value);
}

// Mirrors public.report_target_kind exactly.
export const REPORT_TARGET_KINDS = ["profile", "message"] as const;
export type ReportTargetKind = (typeof REPORT_TARGET_KINDS)[number];

const REPORT_TARGET_KIND_SET: ReadonlySet<string> = new Set(REPORT_TARGET_KINDS);

function isReportTargetKind(value: unknown): value is ReportTargetKind {
  return typeof value === "string" && REPORT_TARGET_KIND_SET.has(value);
}

/** Matches reports_details_bounded's `char_length(details) between 1 and 1000` check constraint. */
export const REPORT_DETAILS_MAX_LENGTH = 1000;

/**
 * Exactly what public.report_receipt carries — the composite return shape
 * both RPCs are typed to return, and the only fields either function's
 * return value can ever contain (see the migration: report_receipt has no
 * reporter_id/reported_user_id/message_id/conversation_id/details/status
 * field to leak in the first place). camelCase here mirrors this file's own
 * convention (MessageReadCursor in messagingClient.ts), not the wire shape.
 */
export interface ReportReceipt {
  id: string;
  targetKind: ReportTargetKind;
  category: ReportCategory;
  createdAt: string;
}

/**
 * The one error boundary every backend (Postgres/PostgREST/RPC) failure in
 * this file passes through before reaching a caller — the identical
 * discipline messagingClient.ts's MessagingOperationError already
 * establishes. `operation` is for tests/logging only, never rendered;
 * `message` is always one of the safe constants authored by this file,
 * never derived from `error.message`, so a raw SQLSTATE, constraint name,
 * function name, or other backend-internal detail can never reach the UI
 * through this type.
 */
export type ReportingOperation = "submit_profile_report" | "submit_message_report";

export class ReportingOperationError extends Error {
  readonly operation: ReportingOperation;

  constructor(operation: ReportingOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ReportingOperationError";
    this.operation = operation;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rejects a malformed ID before it ever reaches an RPC call — same guard shape as messagingClient.ts's requireUuid. */
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
 * The repository's existing trusted authentication pattern (identical to
 * messagingClient.ts's requireAuthenticatedClient, duplicated here rather
 * than imported — each service file in this codebase owns its own copy;
 * socialClient.ts and messagingClient.ts already do the same rather than
 * sharing one cross-file helper). An unconfigured client throws
 * SocialUnavailableError, a genuine auth.getUser() failure (network/token
 * problem, not "no session") also throws SocialUnavailableError with a
 * generic session-verification message (never the action-specific
 * "Sign in..." text, since the caller may already be signed in), and only a
 * *successful* getUser() call that comes back with no user throws
 * `signInMessage`. All three happen before any RPC call.
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

/**
 * Local pre-RPC validation shared by both submit functions, mirroring the
 * RPCs' own server-side rules exactly (20260830105617_reporting_foundation.sql):
 * omitted/null details is always fine (unless category is 'other', checked
 * by the caller after this returns); a non-null value that trims to empty is
 * rejected outright, never silently coerced into "no details" — the same
 * "reject whitespace-only, never silently coerce it into omitted" discipline
 * both submit_profile_report/submit_message_report already enforce
 * server-side. This is defense in depth, not the only enforcement — the
 * database's own reports_details_bounded CHECK remains authoritative
 * regardless of anything this function does.
 */
function prepareDetails(details: string | undefined): string | null {
  if (details === undefined || details === null) return null;
  const trimmed = details.trim();
  if (trimmed === "") {
    throw new Error("Details can't be whitespace-only.");
  }
  if (trimmed.length > REPORT_DETAILS_MAX_LENGTH) {
    throw new Error(`Details must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

function requireReportCategory(category: unknown): ReportCategory {
  if (!isReportCategory(category)) {
    throw new Error("Choose a valid report category.");
  }
  return category;
}

/** category = 'other' requires non-empty (already-trimmed) details — mirrors reports_other_requires_details exactly. */
function requireDetailsForOther(category: ReportCategory, preparedDetails: string | null) {
  if (category === "other" && preparedDetails === null) {
    throw new Error('Details are required when the category is "other".');
  }
}

const SAFE_REPORT_SUBMIT_ERROR = "We couldn't submit this report. Please try again.";

/**
 * Validates the RPC's JSON response into a genuine ReportReceipt, rejecting
 * anything malformed rather than fabricating success — the same discipline
 * markConversationRead/fetchUnreadMessageCounts already apply in
 * messagingClient.ts. `expectedTargetKind`/`expectedCategory` are checked
 * against the response too: a well-formed call always echoes back exactly
 * the target kind and category it was asked to submit (even on the
 * duplicate-pending idempotent path, since category is part of both partial
 * unique indexes' key — see the migration), so a receipt that disagrees with
 * the request is a contract violation to surface, never a "some report or
 * other" result silently trusted, mirroring markConversationRead's own
 * "the returned row must match the request" identity check exactly.
 */
function parseReportReceipt(
  raw: unknown,
  operation: ReportingOperation,
  expectedTargetKind: ReportTargetKind,
  expectedCategory: ReportCategory
): ReportReceipt {
  if (!raw || typeof raw !== "object") {
    throw new ReportingOperationError(operation, SAFE_REPORT_SUBMIT_ERROR);
  }
  const record = raw as Record<string, unknown>;
  let id: string;
  try {
    id = requireUuid(record.id, "id");
  } catch (parseError) {
    throw new ReportingOperationError(operation, SAFE_REPORT_SUBMIT_ERROR, { cause: parseError });
  }
  if (!isReportTargetKind(record.target_kind) || !isReportCategory(record.category)) {
    throw new ReportingOperationError(operation, SAFE_REPORT_SUBMIT_ERROR);
  }
  if (typeof record.created_at !== "string" || !record.created_at) {
    throw new ReportingOperationError(operation, SAFE_REPORT_SUBMIT_ERROR);
  }
  if (record.target_kind !== expectedTargetKind || record.category !== expectedCategory) {
    throw new ReportingOperationError(operation, SAFE_REPORT_SUBMIT_ERROR);
  }
  return { id, targetKind: record.target_kind, category: record.category, createdAt: record.created_at };
}

// ==========================================================================
// submitProfileReport
// ==========================================================================

/**
 * Calls public.submit_profile_report(p_reported_user_id, p_category,
 * p_details) — the exact merged parameter names and no others; there is no
 * reporter/status/reviewer/enforcement parameter of any kind to send,
 * because the RPC's own signature has none (it binds to auth.uid()
 * internally). The database remains authoritative for authentication,
 * self-reporting, target existence, and duplicate-pending idempotency — this
 * function performs only the client-side validation the task requires
 * (auth, UUID shape, category vocabulary, details trimming/whitespace/
 * length/'other'-requires-details) before ever reaching the RPC, never a
 * duplicate of the database's own business-rule enforcement.
 *
 * Every RPC failure — self-report, missing user, or a genuine network/
 * database problem — collapses to the same safe SAFE_REPORT_SUBMIT_ERROR
 * text, the original error preserved as `cause` for logging. A duplicate
 * pending report is not a failure at all: the RPC's own idempotent
 * begin/exception handling returns the original row's receipt exactly as if
 * this were the first call, so this function has nothing special to do for
 * that case — it is already an ordinary, confirmed success.
 */
export async function submitProfileReport(reportedUserId: string, category: ReportCategory, details?: string): Promise<ReportReceipt> {
  const { client } = await requireAuthenticatedClient("Sign in to report this profile.");
  requireUuid(reportedUserId, "The reported user's ID");
  const validCategory = requireReportCategory(category);
  const preparedDetails = prepareDetails(details);
  requireDetailsForOther(validCategory, preparedDetails);

  const { data, error } = await client.rpc("submit_profile_report", {
    p_reported_user_id: reportedUserId,
    p_category: validCategory,
    p_details: preparedDetails,
  });
  if (error) {
    throw new ReportingOperationError("submit_profile_report", SAFE_REPORT_SUBMIT_ERROR, { cause: error });
  }
  return parseReportReceipt(data, "submit_profile_report", "profile", validCategory);
}

// ==========================================================================
// submitMessageReport
// ==========================================================================

/**
 * Calls public.submit_message_report(p_message_id, p_category, p_details) —
 * the exact merged parameter names and no others. There is deliberately no
 * p_conversation_id/p_sender_id/p_reported_user_id parameter to send: the
 * RPC derives the true conversation and sender entirely server-side from
 * the message row itself, in the same query that checks the caller's
 * membership, so this file cannot leak or spoof either value even if it
 * wanted to — there is no argument through which to do so. The database
 * remains authoritative for message existence, conversation membership, own
 * -message rejection, and duplicate-pending idempotency; this function's
 * own responsibility ends at the same client-side validation
 * submitProfileReport performs (auth, UUID shape, category, details).
 *
 * Block state (in either direction) is never checked here, matching the
 * RPC's own deliberate block-blindness — reporting a message from an
 * already-blocked sender must remain available, and this file must never
 * let a caller infer block state from whether this call succeeds or fails.
 */
export async function submitMessageReport(messageId: string, category: ReportCategory, details?: string): Promise<ReportReceipt> {
  const { client } = await requireAuthenticatedClient("Sign in to report this message.");
  requireUuid(messageId, "The message ID");
  const validCategory = requireReportCategory(category);
  const preparedDetails = prepareDetails(details);
  requireDetailsForOther(validCategory, preparedDetails);

  const { data, error } = await client.rpc("submit_message_report", {
    p_message_id: messageId,
    p_category: validCategory,
    p_details: preparedDetails,
  });
  if (error) {
    throw new ReportingOperationError("submit_message_report", SAFE_REPORT_SUBMIT_ERROR, { cause: error });
  }
  return parseReportReceipt(data, "submit_message_report", "message", validCategory);
}
