import { isOnline } from "./networkStatus";

/**
 * V1-7: tells a likely connection failure apart from a normal validation or
 * server error, so screens can say "you're offline — nothing was saved"
 * instead of a generic failure, while ordinary errors keep their own message.
 *
 * Service layers wrap backend errors in safe, fixed messages and keep the
 * original as `cause`; this walks that chain. It recognises:
 *  - the device reporting no connection (`navigator.onLine === false`);
 *  - browser/Node fetch failures ("Failed to fetch", "Load failed",
 *    "NetworkError…", "fetch failed"), including when supabase-js wraps them
 *    into a PostgREST-style `{ message: "TypeError: Failed to fetch" }`;
 *  - Supabase Auth's AuthRetryableFetchError and Storage's wrapped
 *    `originalError`.
 * A real HTTP response (validation, RLS, 4xx/5xx with a status) is never
 * treated as a connection failure, and neither is an input-validation error
 * raised before any request was made (no `cause`), even while offline.
 */

const NETWORK_MESSAGE = /failed to fetch|fetch failed|load failed|networkerror|network request failed|network error|err_internet_disconnected|err_network_changed/i;

function looksLikeNetwork(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as { name?: unknown; message?: unknown; details?: unknown; status?: unknown };
  if (record.name === "AuthRetryableFetchError") return true;
  if (typeof record.status === "number" && record.status > 0) return false;
  const text = `${typeof record.message === "string" ? record.message : ""} ${typeof record.details === "string" ? record.details : ""}`;
  return NETWORK_MESSAGE.test(text);
}

export function isLikelyNetworkError(error: unknown): boolean {
  const attemptedRequest =
    error instanceof TypeError || (typeof error === "object" && error !== null && "cause" in error && (error as { cause?: unknown }).cause !== undefined);
  if (!isOnline() && attemptedRequest) return true;
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (looksLikeNetwork(current)) return true;
    const record = current as { cause?: unknown; originalError?: unknown };
    current = record.cause ?? record.originalError;
  }
  return false;
}

export const OFFLINE_ACTION_MESSAGE = "We couldn't reach SMC Pro Studio. Check your connection, then try again.";

export interface DescribedError {
  message: string;
  /** True when the failure was most likely the connection, not the request itself. */
  isNetwork: boolean;
}

/** The message to show for a failed user action, preferring the offline explanation when it applies. */
export function describeError(caught: unknown, fallback: string): DescribedError {
  if (isLikelyNetworkError(caught)) return { message: OFFLINE_ACTION_MESSAGE, isNetwork: true };
  return { message: caught instanceof Error && caught.message ? caught.message : fallback, isNetwork: false };
}
