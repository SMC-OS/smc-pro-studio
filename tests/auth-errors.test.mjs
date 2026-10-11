import assert from "node:assert/strict";
import test from "node:test";
import { getAuthErrorCode, safeAuthFailure } from "../src/services/authErrors.ts";

test("nested Supabase rate-limit errors produce retry guidance without exposing backend text", () => {
  const backend = { code: "over_email_send_rate_limit", message: "internal provider details" };
  const described = safeAuthFailure(new Error("wrapped", { cause: backend }), "fallback");
  assert.equal(getAuthErrorCode(described), "over_email_send_rate_limit");
  assert.match(described.message, /wait a few minutes/i);
  assert.doesNotMatch(described.message, /provider|internal/i);
});

test("ordinary authentication failures use the caller's enumeration-safe fallback", () => {
  const described = safeAuthFailure({ code: "invalid_credentials", message: "user lookup detail" }, "Sign-in could not be completed.");
  assert.equal(described.message, "Sign-in could not be completed.");
  assert.doesNotMatch(described.message, /lookup|invalid_credentials/i);
});

test("unconfirmed accounts get verification guidance", () => {
  const described = safeAuthFailure({ code: "email_not_confirmed", message: "x" }, "fallback");
  assert.match(described.message, /not been verified/i);
});
