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
  if (code === "email_not_confirmed") {
    return new Error("Your email address has not been verified yet. Open the verification message we sent, or request a new one.", { cause: error });
  }
  if (code === "unexpected_failure" || code === "smtp_failed" || code === "hook_timeout") {
    return new Error("We could not send the email right now. Please try again later.", { cause: error });
  }
  return new Error(fallback, { cause: error });
}
