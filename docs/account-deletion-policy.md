# Account deletion — how it works and what is configurable

Status: implemented 2026-10-01 (owner decision O4). Engineering defaults are in place. **SMC and its legal advisers must confirm the configurable values below before public launch.** This document describes the system; it is not legal advice.

## Member flow

| Step | Where | What happens |
|---|---|---|
| Request | Settings → Delete account, or `/delete-account` | Member types `DELETE` to confirm. `request_account_deletion()` creates one active request, scheduled for `now() + cancellation_window`. Repeating returns the same request. |
| Cancellation window | Same screens | Member keeps full use of the app. `cancel_account_deletion()` is allowed while the request is `requested` and `scheduled_for` is in the future. A new request can be made afterwards. |
| Processing | Server job only | `scripts/process-account-deletions.mjs` (service-role key) runs `process_due_account_deletions()`, then removes Storage objects and soft-deletes the Auth user, then calls `mark_account_deletion_identity_removed()`. Resumable: a failed member is retried on the next run. |
| Can't sign in | `/delete-account` (signed out) | Explains the steps and offers `support@smcprostudio.app`. Staff handle these requests manually after verifying the sender owns the account email. |

Members cannot insert or update `account_deletion_requests` directly; RLS gives them read access to their own rows only. `anon` and `authenticated` cannot execute the processing functions (`service_role` only).

## What processing does (`private.anonymise_account`)

Deleted: professional profile; posts (and, by cascade, their media, comments, reactions and saves); the member's comments, reactions and saved posts; follows, connections and blocks in either direction; conversation memberships and read positions.

Changed: the profile row becomes a hidden tombstone — `display_name = 'Deleted member'`, username/bio/avatar cleared, `visibility = private`, `onboarding_completed = false`, `account_type = customer`. Every staff role is revoked (audited). Message text is replaced with "This message was deleted." (see policy below).

Auth: the Auth admin API soft-delete scrubs the email and phone and removes identities and sessions; the user row is kept only because the tombstone profile and safety records reference it.

Storage: every object under `<user id>/` in `avatars`, `public-media` and `private-user-media`.

Kept: reports (made by or about the member), moderation actions and — under the default policy — the text of the member's messages that were reported. They now point at the "Deleted member" tombstone, not at a name or email.

## Configuration — `private.account_deletion_policy` (one row)

| Setting | Default | Meaning | Who decides |
|---|---|---|---|
| `cancellation_window` | 14 days | How long a member can change their mind. Product setting, 0–90 days. | SMC (product) |
| `reported_message_handling` | `retain` | `retain`: reported messages keep their text as safety evidence. `redact`: redacted like every other message. | **SMC legal** |
| `approval_note` | "Engineering defaults … pending SMC/legal approval" | Record who approved the current values and when. | SMC |

Change values with SQL run by a privileged role in each environment (staging first). If `reported_message_handling` changes, also update the copy in `src/social/components/DeleteAccountPanel.tsx`, `src/social/routes/DeleteAccountRoute.tsx` and the Privacy Policy (`src/social/legal/documents.ts`).

## Not yet decided (legal)

- How long retained safety records are kept, and when they are themselves deleted or further anonymised.
- Whether report `details` text written by the deleted member is kept, redacted or deleted.
- The identity-verification procedure for email-only deletion requests.

## Operations

- Schedule the processor daily in staging and production with that environment's own `SUPABASE_URL` and `SUPABASE_SECRET_KEY`; pass `--confirm-environment=<name>`.
- The job exits non-zero if any member failed; alert on that.
- Tests: `supabase/tests/database/v1_smc_team_and_account_deletion.test.sql` (pgTAP) and `tests/integration/account-deletion.real.test.mjs` (real Auth/PostgREST/Storage).
