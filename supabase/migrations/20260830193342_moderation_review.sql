-- Phase 4 Slice J: secure moderator report review workflow — database
-- transition contract only. Additive only — no existing migration, table,
-- policy, grant, or column is modified; reports_moderator_read, the
-- reports table-level grants, and submit_profile_report()/
-- submit_message_report() (20260830105617_reporting_foundation.sql) are all
-- untouched. This slice does not add enforcement (no automatic block,
-- profile change, message deletion, role revocation, or notification of any
-- kind) — see supabase/tests/database/moderation_review.test.sql for the
-- behavioural proof this migration is limited to what is described below.
--
-- Adds:
--   1. Three new nullable columns on public.reports — reviewed_at,
--      reviewed_by_user_id, review_note — plus two new CHECK constraints
--      tying them declaratively to `status`, a non-cascading reviewer FK,
--      and the two indexes the task requires (reviewer FK, queue).
--   2. private.reports_prevent_immutable_field_changes() + a BEFORE UPDATE
--      trigger — a database-level guarantee, not merely an RPC-level one,
--      that a finalized report can never be updated again by any path, and
--      that reporter/target/category/evidence/creation-time never change on
--      any update at all (structurally true today anyway, since no RPC ever
--      touches those columns — this trigger makes it true forever, even
--      against a future bug).
--   3. public.check_moderator_access() — a narrow, authenticated-only "is it
--      currently me" check, the public-schema front door onto the
--      pre-existing private.is_active_moderator() (private is not a
--      PostgREST-exposed schema — see supabase/config.toml's `schemas =
--      ["public", "graphql_public"]` — so this wrapper is the only way a
--      client can ever learn this about themselves).
--   4. public.list_moderation_reports(status, limit, cursor) — a bounded,
--      keyset-paginated, moderator-only queue read that also resolves the
--      minimal safe evidence a moderator needs (neutral reporter/target
--      display labels, and — for message reports only — the exact reported
--      message's own body/timestamp, never any other message).
--   5. public.review_report(report_id, decision, note) — the sole
--      client-reachable write path onto the three new columns: one atomic
--      pending-to-final UPDATE, conflict-of-interest checks, and the same
--      trimmed/whitespace-only/1000-char note discipline
--      submit_profile_report()/submit_message_report() already established
--      for `details`.
--
-- Out of scope here (deferred, and not something this slice's own schema
-- decorates ahead of time): automatic enforcement of any kind, reopening a
-- finalized report, reassignment between moderators, an 'under_review'
-- intermediate status, notifications, and any AI/automated scoring.
--
-- ==========================================================================
-- Why `reviewed_by_user_id references public.profiles (id)`, not
-- `auth.users (id)`: this table's other two person-identity columns
-- (reporter_id, reported_user_id) already reference profiles(id) — for a
-- reader inspecting one table, every "who" column pointing at the same
-- target table is less surprising than mixing profiles/auth.users within
-- the same row. `on delete restrict` is written explicitly (rather than
-- relying on the default NO ACTION reporter_id/reported_user_id use) to
-- match user_roles.assigned_by/revoked_by's own explicit RESTRICT for the
-- identical "who performed this administrative action" semantic
-- (20260818194558_identity_profiles_roles.sql) — either default satisfies
-- "non-cascading" equally; RESTRICT is simply the more self-documenting of
-- the two for an actor-attribution column specifically.
-- ==========================================================================

alter table public.reports
  add column reviewed_at timestamptz,
  add column reviewed_by_user_id uuid references public.profiles (id) on delete restrict,
  add column review_note text;

-- Declarative coupling between `status` and the three new columns —
-- provable from the schema itself, not merely "review_report() happens to
-- always set all three together": a pending report can never carry partial
-- or full reviewer state, and a finalized report can never be missing it.
-- review_note IS included in the pending branch (must be null) — a pending
-- report has not been reviewed yet, so it cannot carry a reviewer's note;
-- an earlier draft of this constraint wrongly excluded review_note from
-- this either/or on the theory that "an omitted note stays null regardless
-- of status" (true for the RPC's own well-behaved path) without also
-- proving no other write path could set it — a raw privileged insert of a
-- pending row with a non-null review_note was confirmed live to pass the
-- original constraint before this fix. review_note remains optional (may
-- be null) on the finalized branch, exactly like `reports.details` is
-- optional for every category except 'other'.
alter table public.reports
  add constraint reports_review_state_consistent check (
    (status = 'pending' and reviewed_at is null and reviewed_by_user_id is null and review_note is null)
    or (status <> 'pending' and reviewed_at is not null and reviewed_by_user_id is not null)
  );

-- Same trimmed/bounded discipline as reports_details_bounded — a supplied
-- value must already be trimmed (no leading/trailing whitespace — a
-- whitespace-only value normalizes to '' under btrim, rejected by the
-- length bound) and 1..1000 characters; null (omitted) is always fine.
alter table public.reports
  add constraint reports_review_note_bounded check (
    review_note is null or (review_note = btrim(review_note) and char_length(review_note) between 1 and 1000)
  );

-- Task-required supporting indexes: the reviewer FK (moderator-audit
-- lookups: "everything this moderator has reviewed") and the queue itself
-- (status filter + the exact keyset-pagination ordering
-- list_moderation_reports() below uses — created_at desc, id desc).
create index reports_reviewed_by_user_id_idx on public.reports (reviewed_by_user_id);
create index reports_status_created_at_id_idx on public.reports (status, created_at desc, id desc);

-- ==========================================================================
-- Immutability trigger.
--
-- Two independent guarantees, both declarative and both true regardless of
-- which function (today's review_report(), or any future code) attempts an
-- UPDATE:
--
--   1. Once a report leaves 'pending', it can never be updated again by any
--      path — not overwritten, reversed, reopened, or re-stamped. This is
--      what makes "reviewer attribution cannot change after finalization"
--      an actual database invariant rather than something only true because
--      review_report() happens to be careful today: even a
--      SECURITY DEFINER function running as the table owner is still
--      subject to this table's own triggers (triggers are not bypassed by
--      elevated function privilege the way RLS is).
--   2. reporter_id/reported_user_id/target_kind/category/created_at/
--      message_id/conversation_id/details can never change on ANY update,
--      finalized or not — structurally true today regardless (no existing
--      or new RPC ever assigns to those columns), but this makes it true
--      forever rather than merely true by current code discipline.
--
-- No elevated privilege is needed (this only compares OLD/NEW on the row
-- already being updated), so no SECURITY DEFINER. `search_path = ''` is
-- still set regardless — caught by `supabase db advisors` itself
-- (`function_search_path_mutable`) after an initial draft omitted it on
-- the mistaken assumption that a trigger touching no table/schema
-- reference didn't need one; operator resolution (`<>`/`IS DISTINCT FROM`
-- below) is itself subject to search_path, so a fixed empty one is the
-- correct hardening for any function regardless of whether it looks like
-- it references an external object.
-- ==========================================================================

create or replace function private.reports_prevent_immutable_field_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' then
    raise exception 'reports: a finalized report cannot be modified';
  end if;

  if new.reporter_id <> old.reporter_id
    or new.reported_user_id <> old.reported_user_id
    or new.target_kind <> old.target_kind
    or new.category <> old.category
    or new.created_at <> old.created_at
    or new.message_id is distinct from old.message_id
    or new.conversation_id is distinct from old.conversation_id
    or new.details is distinct from old.details
  then
    raise exception 'reports: reporter, target, category, evidence, and creation time cannot change';
  end if;

  return new;
end;
$$;

revoke all on function private.reports_prevent_immutable_field_changes() from public;

create trigger reports_immutable_fields
before update on public.reports
for each row execute function private.reports_prevent_immutable_field_changes();

-- ==========================================================================
-- 1. public.check_moderator_access()
--
-- The public-schema front door onto private.is_active_moderator() — the
-- `private` schema is not in PostgREST's exposed-schemas list
-- (supabase/config.toml: `schemas = ["public", "graphql_public"]`), so no
-- client could ever call private.is_active_moderator() directly via RPC
-- regardless of any grant; this wrapper is the only path.
--
-- SECURITY DEFINER is genuinely required, not a stylistic choice — verified
-- directly against a live local instance before settling on this, after an
-- initial SECURITY INVOKER attempt failed with "permission denied for
-- schema private" for an ordinary authenticated (non-superuser) caller.
-- `private` itself carries `revoke all ... from public, anon, authenticated`
-- (20260818194558_identity_profiles_roles.sql) — schema USAGE, not merely
-- function EXECUTE, is what that revokes. reports_moderator_read's own RLS
-- policy calls the identical private.is_active_moderator() successfully
-- only because that policy's expression was parsed once, by the migration's
-- superuser role, at CREATE POLICY time, and its already-resolved OID is
-- reused on every later query — it never re-resolves the qualified name
-- under the querying role's own privileges. A fresh SECURITY INVOKER SQL
-- function is different: being a simple single-statement STABLE function,
-- the planner is free to inline its body directly into the caller's own
-- query, which re-resolves `private.is_active_moderator` fresh, under the
-- calling (authenticated) role's own privileges — exactly where the lack of
-- schema USAGE bites. SECURITY DEFINER functions are never inlined by the
-- planner (inlining a definer function would itself be a privilege-context
-- bug), so the body instead executes, and its schema references resolve,
-- under this function's own owner (the migration role, which does have
-- access to every schema) — sidestepping the caller's own lack of `private`
-- USAGE entirely, the same reasoning every other SECURITY DEFINER function
-- in this schema already relies on to reach a client-inaccessible table or
-- schema. Zero-argument, bound to auth.uid() only inside
-- is_active_moderator() itself, exactly like every other "tell me only my
-- own state" helper in this schema — there is no parameter through which a
-- caller could ask about a different user.
-- ==========================================================================

create or replace function public.check_moderator_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_moderator();
$$;

revoke all on function public.check_moderator_access() from public;
grant execute on function public.check_moderator_access() to authenticated;

-- ==========================================================================
-- 2. public.list_moderation_reports(status, limit, cursor)
--
-- SECURITY DEFINER is genuinely necessary here, for exactly one reason: a
-- moderator reviewing a message report is very often not a member of the
-- reported conversation, so messages_member_read RLS
-- (20260824090000_direct_messaging_foundation.sql, unchanged) would
-- otherwise hide the one message this report is actually about. This
-- function explicitly re-checks private.is_active_moderator() itself as
-- its very first action (never trusting that a caller who reached this far
-- must already be authorized) — the same "SECURITY DEFINER means this
-- function IS the authorization boundary, not RLS" discipline
-- submit_profile_report()/submit_message_report() already established for
-- their own tables.
--
-- Never adds a broad moderator message-reading RLS policy (the task's own
-- explicit prohibition): there is no new policy on public.messages at all.
-- The only message row this function can ever touch for a given report is
-- the exact one already referenced by that report's own message_id — the
-- join condition is `m.id = r.message_id`, never `m.conversation_id =
-- r.conversation_id` or anything broader — so this is structurally
-- incapable of returning a second message, a different message, or any
-- surrounding conversation history; proven directly in the test file by
-- planting unrelated messages in the same conversation and confirming none
-- of them are ever returned by any report row.
--
-- Evidence returned is deliberately minimal: report id, target kind,
-- category, the reporter's own submitted details, creation time, status,
-- confirmed review fields (a resolved display name for the reviewer, never
-- their raw id), neutral reporter/reported display labels (a plain
-- `coalesce(profiles.display_name, 'Profile unavailable')` — the exact
-- same neutral-fallback idiom ConversationList's own counterpart-resolution
-- already established for an unenrichable profile), and — for message
-- reports only — the exact reported message's body and its own confirmed
-- created_at. A profile report's message_body/message_created_at are
-- always null: message_id is null for every target_kind = 'profile' row
-- (reports_target_shape_consistent already guarantees this), so the LEFT
-- JOIN onto messages simply never matches — "no fabricated message content
-- for profile reports" is a structural consequence of the join condition,
-- not a separate branch of logic that could be forgotten. Never returns
-- email, phone, auth metadata, or any user_roles/role-assignment record —
-- this function reads only public.reports and public.profiles.display_name
-- (plus the one bounded messages join above), nothing else.
--
-- Keyset pagination mirrors messagingClient.ts's own fetchMessages/
-- MessageCursor contract exactly: (created_at, id) as a row-comparison
-- cursor, deterministic newest-first ordering (created_at desc, id desc),
-- and a fixed [1, 50] bound (default 25) enforced server-side regardless of
-- what the caller requests — never trusting a client-declared limit alone.
-- "Whether another page exists" is computed here, not via the client's own
-- "+1 overfetch" trick fetchMessages uses for a raw table query: doing that
-- here would collide with this function's own "maximum 50" contract (a
-- caller asking for the true limit+1 to detect a next page could never
-- legitimately request 51 rows if 50 is the hard ceiling). Instead, an
-- inner CTE fetches one row beyond the requested page, and
-- `count(*) over ()` on that CTE (evaluated before the outer LIMIT trims it
-- back down to the real page size) becomes the `has_more` flag on every
-- returned row.
-- ==========================================================================

create or replace function public.list_moderation_reports(
  p_status public.report_status,
  p_limit integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  report_id uuid,
  target_kind public.report_target_kind,
  category public.report_category,
  details text,
  created_at timestamptz,
  status public.report_status,
  reviewed_at timestamptz,
  reviewed_by_display_name text,
  review_note text,
  reporter_display_name text,
  reported_display_name text,
  message_body text,
  message_created_at timestamptz,
  has_more boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if not private.is_active_moderator() then
    raise exception 'list_moderation_reports: active moderator access required';
  end if;

  if p_status is null then
    raise exception 'list_moderation_reports: status is required';
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'list_moderation_reports: cursor must include both created_at and id, or neither';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 25), 1), 50);

  return query
  with candidates as (
    select
      r.id,
      r.target_kind,
      r.category,
      r.details,
      r.created_at,
      r.status,
      r.reviewed_at,
      -- Deliberately different from reporter/reported_display_name below:
      -- reviewed_by_user_id is genuinely null for every pending report (no
      -- reviewer exists yet — reports_review_state_consistent guarantees
      -- this), so a bare `coalesce(reviewer.display_name, 'Profile
      -- unavailable')` would misleadingly claim a reviewer exists whose
      -- profile merely couldn't be resolved, for what is actually the
      -- ordinary "not yet reviewed" case. Caught live against a running
      -- local instance (a pending report's own queue row showing "Profile
      -- unavailable" as its reviewer) before this comment was written — the
      -- fallback now only ever applies once a reviewer genuinely exists.
      case when r.reviewed_by_user_id is not null then coalesce(reviewer.display_name, 'Profile unavailable') else null end as reviewed_by_display_name,
      r.review_note,
      coalesce(reporter.display_name, 'Profile unavailable') as reporter_display_name,
      coalesce(reported.display_name, 'Profile unavailable') as reported_display_name,
      m.body as message_body,
      m.created_at as message_created_at
    from public.reports r
    left join public.profiles reporter on reporter.id = r.reporter_id
    left join public.profiles reported on reported.id = r.reported_user_id
    left join public.profiles reviewer on reviewer.id = r.reviewed_by_user_id
    left join public.messages m on m.id = r.message_id
    where r.status = p_status
      and (
        p_cursor_created_at is null
        or (r.created_at, r.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by r.created_at desc, r.id desc
    limit v_limit + 1
  )
  select
    c.id,
    c.target_kind,
    c.category,
    c.details,
    c.created_at,
    c.status,
    c.reviewed_at,
    c.reviewed_by_display_name,
    c.review_note,
    c.reporter_display_name,
    c.reported_display_name,
    c.message_body,
    c.message_created_at,
    (count(*) over ()) > v_limit as has_more
  from candidates c
  order by c.created_at desc, c.id desc
  limit v_limit;
end;
$$;

revoke all on function public.list_moderation_reports(public.report_status, integer, timestamptz, uuid) from public;
grant execute on function public.list_moderation_reports(public.report_status, integer, timestamptz, uuid) to authenticated;

-- ==========================================================================
-- 3. public.review_report(report_id, decision, note)
--
-- The sole client-reachable write path onto the three new columns.
-- SECURITY DEFINER (reports grants no client UPDATE of any kind, so a
-- SECURITY INVOKER function would have nothing to write through — the same
-- justification submit_profile_report() already documents for its own
-- table), search_path = '' with every reference schema-qualified, bound to
-- auth.uid() with no p_reviewed_by/p_reviewed_at parameter of any kind (so
-- there is no argument through which a caller could inject a different
-- reviewer identity or timestamp — both always come from the database
-- itself: auth.uid() and now()).
--
-- Authorization is re-checked here independently (never trusting that a
-- prior check_moderator_access() call is still valid by the time this
-- runs): a role revoked between those two calls is rejected here exactly
-- as if it had never been a moderator at all.
--
-- Conflict-of-interest (task-required, database-authoritative): a moderator
-- can never review a report they themselves submitted (reporter_id =
-- caller), and can never review a report where they are the reported party
-- — reported_user_id already holds the correct identity for *either*
-- target kind (the profile being reported, or the true sender of the
-- reported message, resolved server-side at submission time by
-- submit_message_report() — never a caller-supplied value), so a single
-- comparison covers both cases without needing to branch on target_kind at
-- all.
--
-- Atomicity ("two concurrent moderators cannot both win", "repeated calls
-- do not silently succeed", "only a currently pending report can
-- transition"): one UPDATE ... WHERE status = 'pending' ... RETURNING —
-- Postgres's own row lock on the matched row serializes two genuinely
-- concurrent calls; whichever commits first wins, and the second's WHERE
-- clause re-evaluates against the now-committed row (status already
-- something other than 'pending') and matches nothing, so `FOUND` is false
-- and it raises rather than silently reporting success a second time. This
-- is the entire mechanism — no advisory lock, no separate read-then-write
-- application-level check, and no reliance on the immutability trigger
-- above to catch what should have been prevented here (that trigger is a
-- second, independent, defense-in-depth guarantee, not the primary
-- mechanism).
--
-- Returns only the minimal server-confirmed result the UI needs to update
-- its own local queue-item state: the report id, the confirmed final
-- status, and the database-generated reviewed_at. The note text and
-- reviewer identity are not echoed back — the caller already knows both
-- (it typed the note, and it is the reviewer).
-- ==========================================================================

create or replace function public.review_report(
  p_report_id uuid,
  p_decision public.report_status,
  p_note text default null
)
returns table (
  report_id uuid,
  status public.report_status,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_note text;
  v_existing public.reports;
  v_updated public.reports;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'review_report: authentication required';
  end if;

  if not private.is_active_moderator() then
    raise exception 'review_report: active moderator access required';
  end if;

  if p_report_id is null then
    raise exception 'review_report: report_id is required';
  end if;

  if p_decision is null or p_decision = 'pending' then
    raise exception 'review_report: decision must be resolved or dismissed';
  end if;

  if p_note is not null then
    v_note := btrim(p_note);
    if v_note = '' then
      raise exception 'review_report: note cannot be whitespace-only';
    end if;
    if char_length(v_note) > 1000 then
      raise exception 'review_report: note must be 1000 characters or fewer';
    end if;
  else
    v_note := null;
  end if;

  -- reporter_id/reported_user_id are immutable once a report is created
  -- (reports_prevent_immutable_field_changes above guarantees this for any
  -- future update, and no existing code path ever changes them either), so
  -- reading them here — ahead of, and separately from, the atomic
  -- transition below — is never a race condition: a genuinely concurrent
  -- reviewer cannot make this comparison stale, because these two specific
  -- columns cannot be concurrently modified by anything. This is not the
  -- read-then-write pattern the task warns against, because the actual
  -- state transition (below) is never gated on anything read here.
  select r.* into v_existing from public.reports r where r.id = p_report_id;
  if v_existing.id is null then
    raise exception 'review_report: report not found';
  end if;
  if v_existing.reporter_id = v_caller then
    raise exception 'review_report: cannot review a report you submitted';
  end if;
  if v_existing.reported_user_id = v_caller then
    raise exception 'review_report: cannot review a report about yourself';
  end if;

  -- Table-aliased and every column qualified deliberately: this function's
  -- own `returns table (..., status public.report_status, ...)` clause
  -- implicitly declares `status` as a plpgsql variable in scope for the
  -- whole function body, which collides with an unqualified `status`
  -- reference in the WHERE clause below (Postgres would otherwise raise
  -- "column reference is ambiguous" — caught directly while smoke-testing
  -- this function against a live local instance before ever writing this
  -- comment). SET's own left-hand side is always the table column by SQL
  -- syntax rules (never ambiguous), but `r.status` in WHERE is qualified
  -- here anyway, for the same reason every other reference in this
  -- function already is.
  update public.reports as r
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by_user_id = v_caller,
      review_note = v_note
  where r.id = p_report_id and r.status = 'pending'
  returning r.* into v_updated;

  if not found then
    raise exception 'review_report: report is no longer pending';
  end if;

  return query select v_updated.id, v_updated.status, v_updated.reviewed_at;
end;
$$;

revoke all on function public.review_report(uuid, public.report_status, text) from public;
grant execute on function public.review_report(uuid, public.report_status, text) to authenticated;
