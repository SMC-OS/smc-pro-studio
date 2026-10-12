import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";

/**
 * Account deletion (launch roadmap V1-2, owner decision O4).
 *
 * Requests and cancellations go only through the request_account_deletion()
 * and cancel_account_deletion() RPCs (20261001060000_*.sql), which schedule
 * processing for the end of the configured cancellation window. Processing
 * itself is a server job (scripts/process-account-deletions.mjs). Nothing here
 * claims an account is already deleted.
 */

export type DeletionStatus = "requested" | "identity_locked" | "retention_review" | "completed" | "cancelled";

export interface DeletionRequest {
  id: string;
  status: DeletionStatus;
  requested_at: string;
  /** When processing becomes due; null only for a legacy request made before scheduling existed. */
  scheduled_for: string | null;
  cancellation_requested_at: string | null;
}

const STATUSES = new Set<DeletionStatus>(["requested", "identity_locked", "retention_review", "completed", "cancelled"]);
const ACTIVE: DeletionStatus[] = ["requested", "identity_locked", "retention_review"];

export type AccountOperation = "load_deletion" | "request_deletion" | "cancel_deletion";

export class AccountOperationError extends Error {
  readonly operation: AccountOperation;

  constructor(operation: AccountOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AccountOperationError";
    this.operation = operation;
  }
}

const SAFE_LOAD = "Your account status could not be loaded. Please try again.";
const SAFE_REQUEST = "Your deletion request could not be recorded. Please try again.";
const SAFE_CANCEL = "Your deletion request could not be cancelled. If it is still within the cancellation window, please try again or contact support.";

async function requireAuthenticatedClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw new SocialUnavailableError("Your session could not be verified. Please try again.", { cause: error });
  if (!data.user) throw new Error("Sign in to manage your account.");
  return { client, userId: data.user.id };
}

const isIsoOrNull = (value: unknown) => value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));

export function parseDeletionRequest(raw: unknown): DeletionRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !STATUSES.has(r.status as DeletionStatus)) return null;
  if (typeof r.requested_at !== "string" || Number.isNaN(Date.parse(r.requested_at))) return null;
  if (!isIsoOrNull(r.scheduled_for ?? null) || !isIsoOrNull(r.cancellation_requested_at ?? null)) return null;
  return {
    id: r.id,
    status: r.status as DeletionStatus,
    requested_at: r.requested_at,
    scheduled_for: (r.scheduled_for ?? null) as string | null,
    cancellation_requested_at: (r.cancellation_requested_at ?? null) as string | null,
  };
}

const SELECT = "id, status, requested_at, scheduled_for, cancellation_requested_at";

/** The caller's single active deletion request, or null when there is none. */
export async function fetchActiveDeletionRequest(): Promise<DeletionRequest | null> {
  const { client, userId } = await requireAuthenticatedClient();
  const { data, error } = await client
    .from("account_deletion_requests")
    .select(SELECT)
    .eq("user_id", userId)
    .in("status", ACTIVE)
    .order("requested_at", { ascending: false })
    .limit(1);
  if (error || !Array.isArray(data)) throw new AccountOperationError("load_deletion", SAFE_LOAD, { cause: error ?? undefined });
  if (data.length === 0) return null;
  const parsed = parseDeletionRequest(data[0]);
  if (!parsed) throw new AccountOperationError("load_deletion", SAFE_LOAD);
  return parsed;
}

function singleRow(data: unknown): DeletionRequest | null {
  return Array.isArray(data) && data.length === 1 ? parseDeletionRequest(data[0]) : null;
}

/** Schedules deletion for the end of the cancellation window. Idempotent. */
export async function requestAccountDeletion(): Promise<DeletionRequest> {
  const { client } = await requireAuthenticatedClient();
  const { data, error } = await client.rpc("request_account_deletion");
  const parsed = error ? null : singleRow(data);
  if (!parsed) throw new AccountOperationError("request_deletion", SAFE_REQUEST, { cause: error ?? undefined });
  return parsed;
}

/** Cancels the caller's pending request while its window is still open. */
export async function cancelAccountDeletion(): Promise<DeletionRequest> {
  const { client } = await requireAuthenticatedClient();
  const { data, error } = await client.rpc("cancel_account_deletion");
  const parsed = error ? null : singleRow(data);
  if (!parsed) throw new AccountOperationError("cancel_deletion", SAFE_CANCEL, { cause: error ?? undefined });
  return parsed;
}

/** True while the member can still cancel (status requested and window not yet passed). */
export function canCancel(request: DeletionRequest, now: Date = new Date()): boolean {
  if (request.status !== "requested") return false;
  return request.scheduled_for === null || Date.parse(request.scheduled_for) > now.getTime();
}
