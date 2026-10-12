#!/usr/bin/env node
// Account-deletion processor (launch roadmap V1-2 / owner decision O4).
//
// Server-side only. Run on a schedule (e.g. daily) by a trusted job with the
// Supabase secret/service-role key. Never ships to a client and never runs in
// the browser or the mobile app.
//
// Per run:
//   1. process_due_account_deletions(): anonymises every request whose
//      cancellation window has ended and marks it 'completed' (SQL, atomic per
//      request — see supabase/migrations/20261001060000_*.sql).
//   2. For each completed request whose identity has not been removed yet:
//        a. delete the member's Storage objects under "<user id>/" in the
//           member-owned buckets;
//        b. soft-delete the Auth user through the Auth admin API, which
//           scrubs email/phone and removes identities and sessions while
//           keeping the row the de-identified profile still references;
//        c. mark_account_deletion_identity_removed().
//      Step 2 is resumable: anything that fails is retried on the next run.
//
// Usage:
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/process-account-deletions.mjs [--confirm-environment=<name>]
// The --confirm-environment flag is required and is echoed in the log, so a run
// against production is always deliberate. Policy (window, reported-message
// handling) lives in private.account_deletion_policy — see
// docs/account-deletion-policy.md.

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

/** Buckets whose object keys start with the owning member's user id. */
export const MEMBER_OWNED_BUCKETS = ["avatars", "public-media", "private-user-media"];

async function removeMemberStorage(client, userId) {
  let removed = 0;
  for (const bucket of MEMBER_OWNED_BUCKETS) {
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(userId, { limit: 100 });
      if (error) throw new Error(`list ${bucket}/${userId}: ${error.message}`);
      if (!data || data.length === 0) break;
      const paths = data.map((entry) => `${userId}/${entry.name}`);
      const { data: gone, error: removeError } = await client.storage.from(bucket).remove(paths);
      if (removeError) throw new Error(`remove ${bucket}/${userId}: ${removeError.message}`);
      removed += gone?.length ?? 0;
      if (!gone || gone.length === 0) throw new Error(`remove ${bucket}/${userId}: nothing was removed (check storage policies)`);
    }
  }
  return removed;
}

function isUserNotFound(error) {
  return error && (error.status === 404 || /not.?found/i.test(error.message ?? ""));
}

/**
 * Runs one processing pass. Returns a summary; never throws for a single
 * member's failure (it is recorded and retried next run).
 */
export async function processAccountDeletions(client, { limit = 50, log = () => {} } = {}) {
  const summary = { anonymised: 0, identitiesRemoved: 0, failures: [] };

  const { data: processed, error: processError } = await client.rpc("process_due_account_deletions", { p_limit: limit });
  if (processError) throw new Error(`process_due_account_deletions failed: ${processError.message}`);
  summary.anonymised = processed?.length ?? 0;
  log(`anonymised ${summary.anonymised} account(s)`);

  const { data: pending, error: listError } = await client.rpc("list_account_deletions_pending_identity_removal", { p_limit: limit });
  if (listError) throw new Error(`list_account_deletions_pending_identity_removal failed: ${listError.message}`);

  for (const { request_id: requestId, user_id: userId } of pending ?? []) {
    try {
      const files = await removeMemberStorage(client, userId);
      const { error: authError } = await client.auth.admin.deleteUser(userId, true);
      if (authError && !isUserNotFound(authError)) throw new Error(`auth soft delete: ${authError.message}`);
      const { error: markError } = await client.rpc("mark_account_deletion_identity_removed", { p_request_id: requestId });
      if (markError) throw new Error(`mark identity removed: ${markError.message}`);
      summary.identitiesRemoved += 1;
      log(`request ${requestId}: identity removed (${files} storage object(s))`);
    } catch (error) {
      summary.failures.push({ requestId, message: error instanceof Error ? error.message : String(error) });
      log(`request ${requestId}: will retry next run — ${error instanceof Error ? error.message : error}`);
    }
  }
  return summary;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const confirm = process.argv.find((arg) => arg.startsWith("--confirm-environment="))?.split("=")[1];
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SECRET_KEY are required (server-side secret; never a VITE_ variable).");
    process.exit(2);
  }
  if (!confirm) {
    console.error("Refusing to run without --confirm-environment=<name> (e.g. local, staging, production).");
    process.exit(2);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const log = (message) => console.log(`[account-deletions:${confirm}] ${message}`);
  const summary = await processAccountDeletions(client, { log });
  log(JSON.stringify(summary));
  process.exit(summary.failures.length > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
