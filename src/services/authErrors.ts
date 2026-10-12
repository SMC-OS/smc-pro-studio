export function getAuthErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; cause?: unknown };
  return typeof value.code === "string" ? value.code : getAuthErrorCode(value.cause);
}

export function safeAuthFailure(error: unknown, fallback: string): Error {
  const code = getAuthErrorCode(error);
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return new Error("Too many email requests were made. Please wait a few minutes before trying again.", { cause: error });
  }
  return new Error(fallback, { cause: error });
}
