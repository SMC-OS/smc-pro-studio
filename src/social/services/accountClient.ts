import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";

/**
 * V1-2 (launch roadmap): in-app account deletion requests.
 *
 * Built entirely on the existing public.account_deletion_requests table and
 * its owner-only RLS (20260818194611_visibility_account_deletion.sql): an
 * owner may insert a request (always status 'requested'), read their own
 * requests, and set cancellation_requested_at on a still-'requested' one.
 * Completing a deletion is a separate, staff/server-side step — nothing here
 * claims the account is deleted, or by when.
 */

export interface DeletionRequest {
  id: string;
  status: "requested" | "identity_locked" | "retention_review" | "completed" | "cancelled";
  requested_at: string;
  cancellation_requested_at: string | null;
}

const ACTIVE = new Set(["requested", "identity_locked", "retention_review"]);

export type AccountOperation = "load_deletion" | "request_deletion" | "cancel_deletion";

export class AccountOperationError extends Error {
  readonly operation: AccountOperation;

  constructor(operation: AccountOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AccountOperationError";
    this.operation = operation;
  }
}

async function requireAuthenticatedClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw new SocialUnavailableError("Your session could not be verified. Please try again.", { cause: error });
  if (!data.user) throw new Error("Sign in to manage your account.");
  return { client, userId: data.user.id };
}

function parseRequest(raw: unknown): DeletionRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.status !== "string" || typeof r.requested_at !== "string") return null;
  if (r.cancellation_requested_at !== null && typeof r.cancellation_requested_at !== "string") return null;
  return {
    id: r.id,
    status: r.status as DeletionRequest["status"],
    requested_at: r.requested_at,
    cancellation_requested_at: r.cancellation_requested_at as string | null,
  };
}

const SELECT = "id, status, requested_at, cancellation_requested_at";

/** The caller's single active deletion request, or null when there is none. */
export async function fetchActiveDeletionRequest(): Promise<DeletionRequest | null> {
  const { client, userId } = await requireAuthenticatedClient();
  const { data, error } = await client
    .from("account_deletion_requests")
    .select(SELECT)
    .eq("user_id", userId)
    .in("status", [...ACTIVE])
    .order("requested_at", { ascending: false })
    .limit(1);
  if (error) throw new AccountOperationError("load_deletion", "Your account status could not be loaded. Please try again.", { cause: error });
  if (!Array.isArray(data)) throw new AccountOperationError("load_deletion", "Your account status could not be loaded. Please try again.");
  if (data.length === 0) return null;
  const parsed = parseRequest(data[0]);
  if (!parsed) throw new AccountOperationError("load_deletion", "Your account status could not be loaded. Please try again.");
  return parsed;
}

/** Records a deletion request. A request that is already active is returned rather than duplicated. */
export async function requestAccountDeletion(): Promise<DeletionRequest> {
  const { client, userId } = await requireAuthenticatedClient();
  const { data, error } = await client
    .from("account_deletion_requests")
    .insert({ user_id: userId })
    .select(SELECT)
    .single();
  if (error?.code === "23505") {
    const existing = await fetchActiveDeletionRequest();
    if (existing) return existing;
  }
  const parsed = error ? null : parseRequest(data);
  if (!parsed) {
    throw new AccountOperationError("request_deletion", "Your deletion request could not be recorded. Please try again.", { cause: error ?? undefined });
  }
  return parsed;
}

/** Asks for a still-'requested' deletion to be cancelled. */
export async function cancelAccountDeletion(requestId: string): Promise<DeletionRequest> {
  const { client, userId } = await requireAuthenticatedClient();
  const { data, error } = await client
    .from("account_deletion_requests")
    .update({ cancellation_requested_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "requested")
    .select(SELECT)
    .maybeSingle();
  const parsed = error ? null : parseRequest(data);
  if (!parsed) {
    throw new AccountOperationError(
      "cancel_deletion",
      "Your cancellation could not be recorded. Please contact us so we can stop the deletion.",
      { cause: error ?? undefined },
    );
  }
  return parsed;
}
