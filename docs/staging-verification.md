# Staging database verification (Phase M2, 2026-10-01)

**Project:** `smc-pro-studio-staging`, ref `qezixxtknqbijnudvhal`, eu-west-2,
Free plan. It holds staging-only data, and it was empty when this verification
ran. No production project was touched. GeoCore / SMC-OS and the paused
projects were not touched either.

## How the migrations were applied

All 19 repository migrations were applied unchanged and in order.

| # | Migration | Applied via |
|---|---|---|
| 1–11 | identity_profiles_roles … moderation_review | Supabase `apply_migration` |
| 12 | moderation_enforcement | Dashboard SQL Editor |
| 13–17 | moderation_history_view … revoke_anon_execute_on_signed_in_rpcs | Supabase `apply_migration` |
| 18 | v1_smc_team_and_account_deletion | Dashboard SQL Editor |
| 19 | explicit_service_role_grants | Supabase `apply_migration` |

**Migrations 12 and 18 contain `DROP POLICY` / `DROP FUNCTION`.** In both,
they replace objects that earlier migrations in the same chain created. The
Supabase tool's extra confirmation for destructive statements can't be shown
in this session, so it cancelled them. The owner approved running both
through the dashboard instead:

- Each file was loaded byte-for-byte into the editor. It was gzip-transferred,
  and the editor content's SHA-256 was checked against the repo file before
  running:
  - 12: `854e9466…de3fba8f`, 22,320 bytes;
  - 18: `c9b4828f…cadcbc7be`, 15,102 bytes.
- Each ran as a single transaction.
- For migration 18 the dashboard offered to also enable RLS on
  `private.account_deletion_policy`. It was run **without** that change, as
  tested. The table is in the non-exposed `private` schema, with all access
  revoked from anon and authenticated.

**Migration history** (`supabase_migrations.schema_migrations`):

- 19 rows, in order.
- The versions were reconciled to the repository timestamps
  (`20260818194558` … `20261001070000`), so `supabase db push` and
  `migration list` see staging as up to date.
- The two dashboard-applied rows record the file and SHA-256 in `created_by`.

## Schema reconciliation

`scripts/db/schema-fingerprint.sql` was run on staging and on a local
PostgreSQL 17 built from the same 19 files with strict (no-default) grants.
All 14 object classes are **identical**:

| Class | Count | Class | Count |
|---|---|---|---|
| tables (RLS flags) | 21 | table grants | 112 |
| columns | 140 | column-only grants | 48 |
| constraints | 106 | schema grants | 2 |
| indexes | 54 | sequence grants | 2 |
| policies (incl. storage) | 57 | enums | 16 |
| functions (full-body md5, ACL, config) | 38 | buckets | 5 |
| triggers | 9 | realtime publication | 1 |

Function fingerprints hash the complete `pg_get_functiondef`, so every
function body, including its comments, matches the repository exactly.

The full pgTAP suite passes on that identical local schema: 15 files, 796
assertions, 0 failures.

## RLS and Data API grants (run on staging)

The `data_api_grants.test.sql` assertions were run directly against staging:

| Check | Result |
|---|---|
| Every public table has RLS | PASS (none without) |
| service_role has select/insert/update/delete on every public table | PASS |
| No truncate/references/trigger for anon, authenticated, service_role | PASS |
| No privileges on public sequences | PASS |
| anon cannot insert/update/delete anything | PASS |
| anon/authenticated matrix (38 entries) matches the intended matrix | PASS (md5 `1a1f3dd5…` equal) |
| No public views | PASS |
| anon-executable public RPCs | only `search_public_professionals` (approved guest search) |

**Role probes** (run as anon / authenticated inside the database):

- **Denied, as intended:**
  - anon: messages, conversations, reports, user_roles,
    account_deletion_requests, moderation_actions, the private deletion
    policy, inserting a profile, and `request_account_deletion()`;
  - authenticated: user_roles, moderation_actions, the private deletion
    policy, `process_due_account_deletions()`, and self-assigning a role.
- **Allowed, as intended:** anon can read the guest surfaces (materials,
  profiles), and RLS filters both.

## Supabase advisors (staging, after migrations)

**0 ERROR.** Every finding:

| Lint | Level | Count | Assessment |
|---|---|---|---|
| `authenticated_security_definer_function_executable` | WARN | 18 | **Intended.** These are the signed-in RPCs: reports, moderation, messaging, materials editor, and account-deletion request/cancel. Each re-checks `auth.uid()` and its role inside. anon EXECUTE is revoked (the anon variant of this lint reports nothing). This lint is newer than the pre-native triage. |
| `multiple_permissive_policies` | WARN | 5 | Already accepted (pre-native triage): connections UPDATE; materials, posts, professional_profiles and profiles SELECT. |
| `rls_enabled_no_policy` | INFO | 2 | Intended: `user_roles` and `private.role_assignment_audit` are server-only (no client access). |
| `unindexed_foreign_keys` | INFO | 16 | Known; revisit with real query plans (pre-native triage). |
| `unused_index` | INFO | 21 | Expected on an empty, unused database. |

## Auth configuration (staging)

- **Site URL:** `smcprostudio://auth/callback`.
- **Redirect URLs:**
  - `smcprostudio://auth/callback`
  - `smcprostudio://auth/reset-password`
  - `http://127.0.0.1:5173/auth/callback`
  - `http://127.0.0.1:5173/auth/reset-password`

  The last two are for local web testing with `vite --mode staging`.
- No production URL is allowed.
- Email confirmation, reset and expired-link behaviour are verified on the
  phone (QA matrix section 2).

## Client exposure

Only the staging URL and the **publishable** key are in the client:
`.env.staging` and the APK, verified by `scripts/check-client-bundle.mjs`. No
service-role or secret key, database password or connection string exists in
the repository, the bundle or the APK.
