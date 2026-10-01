# Database grants convention (Data API)

## Why

Supabase no longer grants Data API privileges automatically on new objects in the
`public` schema. This applies to new projects since 30 May 2026, to all projects
from 30 October 2026, and to the pinned CLI's local stack already. A table that
relies on the old automatic grants works on an old database and is refused on a
new one. That is how defect D4 reached the first official CI run.

The platform still auto-grants `TRUNCATE`, `REFERENCES` and `TRIGGER` on tables,
and `UPDATE` on sequences. None of them is needed by a Data API client.
`TRUNCATE` ignores row level security.

**This project never relies on default privileges and never adds
`ALTER DEFAULT PRIVILEGES` to re-enable automatic grants.** Every privilege is
written in the migration that creates the object.

## The rule: every new `public` table

Write these in the same migration that creates the table:

```sql
create table public.example (...);

alter table public.example enable row level security;

-- 1. Start from nothing.
revoke all on public.example from public, anon, authenticated, service_role;

-- 2. Client roles get only what the app needs. Prefer column-level grants for
--    writes, then add RLS policies for the rows.
grant select on public.example to authenticated;
grant insert (body) on public.example to authenticated;

-- 3. The server-held secret key gets the Data API privileges it needs for
--    server and staff operations. It bypasses RLS, not grants.
grant select, insert, update, delete on public.example to service_role;

-- 4. Identity columns need no sequence privileges. Never grant a sequence to
--    a Data API role.
```

## Rules for other objects

- **Functions (RPCs):** revoke `EXECUTE` from `public, anon` (and from
  `authenticated` for staff/server-only RPCs), then grant it explicitly.
  `rpc_execute_grants.test.sql` pins which RPCs `anon` may call.
- **Views:** do not add any to `public` without review. A view must use
  `security_invoker = true` and receive explicit grants. The guard test fails
  if a view appears.
- **Other schemas** (`private`, `storage` policies): not exposed through the
  Data API. Access goes through `SECURITY DEFINER` functions with a fixed
  `search_path`.

## Enforcement

`supabase/tests/database/data_api_grants.test.sql` fails when any of these hold:

- a `public` table has RLS disabled;
- `service_role` lacks select, insert, update or delete on a `public` table;
- any Data API role holds `TRUNCATE`, `REFERENCES` or `TRIGGER`, or any
  privilege on a `public` sequence;
- `anon` can write to any table;
- the complete `anon`/`authenticated` privilege matrix differs from the pinned
  one. A new table, or any change to a client grant, must be added to the
  matrix deliberately;
- a `public` view exists.

CI runs this test on the official Supabase CLI stack (`database` job). Locally,
`STRICT_GRANTS=1 /opt/pg17/reset17.sh` reproduces the platform's strict
defaults.

## Why `service_role` keeps CRUD on every table

`service_role` is used only by server-side code holding the secret key: staff
role assignment and SMC Team assignment (O3), catalogue editor grants,
verification, the legacy server's role lookup, and the integration and QA
harness that emulates them. The account-deletion processor uses
`SECURITY DEFINER` RPCs and needs no table grants. Because the role already
bypasses RLS, narrowing its table grants without a defined admin-tooling
surface would be guesswork. Revisit this when staff tooling is designed.
