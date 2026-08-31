begin;

create extension if not exists pgtap with schema extensions;
select plan(91);

-- ==========================================================================
-- Phase 4 Slice J: secure moderator report review workflow
-- (20260830193342_moderation_review.sql).
--
-- A focused new file, not folded into reporting.test.sql — this is the
-- review-mutation surface reporting.test.sql's own header explicitly
-- deferred ("review-mutation API... deferred to a later slice"), and
-- deserves its own plan/fixture set the same way reporting.test.sql itself
-- got its own file distinct from direct_messaging.test.sql.
--
-- Fixtures are inserted into auth.users (never profiles directly), so
-- private.handle_new_auth_user() creates each fixture's public.profiles row
-- the same way a real signup does — same convention as every other test
-- file in this suite. This whole file runs inside one outer BEGIN/ROLLBACK,
-- so nothing here is ever persisted.
--
-- Role discipline: fixture setup and unrestricted verification queries run
-- as the connecting superuser role (postgres), which bypasses RLS by
-- design. Every actual policy/authorization-sensitive call is wrapped in
-- `set local role ...` (+ `request.jwt.claim.sub` where authenticated), the
-- same GUC PostgREST itself sets per request.
-- ==========================================================================

-- ==========================================================================
-- Structural: new columns, constraints, indexes, functions, grants.
-- ==========================================================================

select has_column('public', 'reports', 'reviewed_at', 'reports.reviewed_at exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'reviewed_at'$$,
  array['timestamptz'], 'reports.reviewed_at is typed timestamptz'
);
select col_is_null('public', 'reports', 'reviewed_at', 'reports.reviewed_at is nullable — a pending report has none');

select has_column('public', 'reports', 'reviewed_by_user_id', 'reports.reviewed_by_user_id exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'reviewed_by_user_id'$$,
  array['uuid'], 'reports.reviewed_by_user_id is typed uuid'
);
select col_is_null('public', 'reports', 'reviewed_by_user_id', 'reports.reviewed_by_user_id is nullable — a pending report has none');

select has_column('public', 'reports', 'review_note', 'reports.review_note exists');
select col_is_null('public', 'reports', 'review_note', 'reports.review_note is nullable — optional even once finalized');

-- Reviewer FK: non-cascading (confdeltype 'r' = RESTRICT), referencing
-- profiles — matching reporter_id/reported_user_id's own target table so
-- every "who" column on this row points at the same place.
select results_eq(
  $$select confdeltype::text from pg_constraint
    where conrelid = 'public.reports'::regclass and confrelid = 'public.profiles'::regclass
      and conname = 'reports_reviewed_by_user_id_fkey'$$,
  array['r'], 'reports_reviewed_by_user_id_fkey is RESTRICT — deleting a moderator profile cannot silently erase audit attribution'
);

-- Review-state CHECK: pending <-> no reviewer, non-pending <-> reviewer present.
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and conname = 'reports_review_state_consistent'$$,
  array[1::bigint], 'reports_review_state_consistent CHECK exists'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and conname = 'reports_review_note_bounded'$$,
  array[1::bigint], 'reports_review_note_bounded CHECK exists — a supplied note is already trimmed and 1..1000 characters'
);

-- Task-required supporting indexes.
select has_index('public', 'reports', 'reports_reviewed_by_user_id_idx', 'the reviewer foreign-key index exists');
select has_index('public', 'reports', 'reports_status_created_at_id_idx', 'the queue index exists');
select results_eq(
  $$select pg_get_indexdef(i.indexrelid) ~ '\(status, created_at DESC, id DESC\)'
    from pg_index i join pg_class c on c.oid = i.indexrelid
    where c.relname = 'reports_status_created_at_id_idx'$$,
  array[true], 'reports_status_created_at_id_idx is keyed on (status, created_at desc, id desc) — the exact queue ordering list_moderation_reports() uses'
);

-- Immutability trigger.
select results_eq(
  $$select count(*)::bigint from pg_trigger
    where tgrelid = 'public.reports'::regclass and tgname = 'reports_immutable_fields' and not tgisinternal$$,
  array[1::bigint], 'reports_immutable_fields trigger exists'
);
-- A real `supabase db advisors` finding (function_search_path_mutable)
-- caught this trigger function missing a fixed search_path in an initial
-- draft — fixed, and pinned here so it cannot silently regress.
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'private' and p.proname = 'reports_prevent_immutable_field_changes' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'reports_prevent_immutable_field_changes has a fixed empty search_path'
);

-- public.check_moderator_access(): zero-argument, SECURITY DEFINER, fixed
-- empty search_path, authenticated-only execute.
select has_function('public', 'check_moderator_access', array[]::text[],
  'check_moderator_access exists with zero parameters — no argument could ever ask about a user other than the caller');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'check_moderator_access'$$,
  array[true], 'check_moderator_access runs as SECURITY DEFINER (verified live: SECURITY INVOKER fails with "permission denied for schema private" — see the migration''s own comment)'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'check_moderator_access' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'check_moderator_access has a fixed empty search_path'
);
select function_privs_are('public', 'check_moderator_access', array[]::text[],
  'authenticated', array['EXECUTE'], 'authenticated may call check_moderator_access');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'check_moderator_access' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'check_moderator_access grants no execute privilege to anon or PUBLIC'
);

-- public.list_moderation_reports(report_status, integer, timestamptz, uuid):
-- SECURITY DEFINER, fixed empty search_path, authenticated-only execute.
select has_function('public', 'list_moderation_reports',
  array['public.report_status', 'integer', 'timestamptz', 'uuid'],
  'list_moderation_reports exists with the expected four-argument signature (status, limit, cursor_created_at, cursor_id)');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'list_moderation_reports'$$,
  array[true], 'list_moderation_reports runs as SECURITY DEFINER — necessary so a moderator who is not a conversation member can still read the exact reported message'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'list_moderation_reports' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'list_moderation_reports has a fixed empty search_path'
);
select function_privs_are('public', 'list_moderation_reports', array['public.report_status', 'integer', 'timestamptz', 'uuid'],
  'authenticated', array['EXECUTE'], 'authenticated may call list_moderation_reports');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'list_moderation_reports' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'list_moderation_reports grants no execute privilege to anon or PUBLIC'
);

-- public.review_report(uuid, report_status, text): SECURITY DEFINER, fixed
-- empty search_path, authenticated-only execute, no hidden overload
-- accepting a caller-supplied reviewer/timestamp.
select has_function('public', 'review_report', array['uuid', 'public.report_status', 'text'],
  'review_report exists with the expected three-argument signature (report_id, decision, note) — no caller-suppliable reviewer id or timestamp');
select hasnt_function('public', 'review_report', array['uuid', 'public.report_status', 'text', 'uuid'],
  'review_report has no four-argument overload that could accept a caller-supplied reviewer identity');
select hasnt_function('public', 'review_report', array['uuid', 'public.report_status', 'text', 'timestamptz'],
  'review_report has no overload accepting a caller-supplied review timestamp');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'review_report'$$,
  array[true], 'review_report runs as SECURITY DEFINER (reports grants no client UPDATE of any kind)'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'review_report' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'review_report has a fixed empty search_path'
);
select function_privs_are('public', 'review_report', array['uuid', 'public.report_status', 'text'],
  'authenticated', array['EXECUTE'], 'authenticated may call review_report');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'review_report' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'review_report grants no execute privilege to anon or PUBLIC'
);

-- Still no direct client UPDATE/DELETE grant on reports at all — this
-- slice adds no such grant; review_report() remains the sole write path.
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'reports' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated still has no table-level insert/update/delete on reports after this slice'
);

-- Realtime: still untouched by this slice either.
select results_eq(
  $$select count(*)::bigint from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'$$,
  array[0::bigint], 'public.reports is still never added to the supabase_realtime publication'
);
select results_eq(
  $$select count(*)::bigint from pg_publication_tables where pubname = 'supabase_realtime'$$,
  array[1::bigint], 'supabase_realtime still publishes exactly one table (messages) — this slice added nothing to it either'
);

-- ==========================================================================
-- Behavioural coverage.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'mrev-alice@fixture.test', jsonb_build_object('display_name', 'Alice Review Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000002', 'mrev-bob@fixture.test', jsonb_build_object('display_name', 'Bob Review Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000003', 'mrev-carol@fixture.test', jsonb_build_object('display_name', 'Carol Review Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000004', 'mrev-dave@fixture.test', jsonb_build_object('display_name', 'Dave Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000005', 'mrev-erin@fixture.test', jsonb_build_object('display_name', 'Erin Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

-- Dave and Erin are both moderators — two are needed to test
-- conflict-of-interest (a moderator who is also the reporter or the
-- reported party) independently of "is this caller a moderator at all".
insert into public.user_roles (user_id, role, assignment_reason)
values
  ('d0000000-0000-0000-0000-000000000004', 'moderator', 'moderation_review.test.sql fixture'),
  ('d0000000-0000-0000-0000-000000000005', 'moderator', 'moderation_review.test.sql fixture');

-- Alice/Bob have a direct conversation; Bob sends one reportable message and
-- one unrelated message, so "only the exact reported message, never
-- surrounding history" has something real to disprove against.
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select public.create_direct_conversation('d0000000-0000-0000-0000-000000000002'::uuid) as ab_conversation_id \gset
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000002';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'Reportable message from Bob.')$$, :'ab_conversation_id'),
  'Bob sends the reportable message'
);
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'A different, unrelated message from Bob.')$$, :'ab_conversation_id'),
  'Bob sends a second, unrelated message in the same conversation'
);
reset role;
reset request.jwt.claim.sub;

select id as bob_reportable_message_id from public.messages
where conversation_id = :'ab_conversation_id'::uuid and body = 'Reportable message from Bob.' \gset

-- Alice reports Bob's profile, Bob's message, and creates one more profile
-- report to have pagination/status-mixing material.
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select (public.submit_profile_report('d0000000-0000-0000-0000-000000000002'::uuid, 'harassment'::public.report_category, 'Ongoing unwanted contact.')).id as profile_report_id \gset
select (public.submit_message_report(:'bob_reportable_message_id'::uuid, 'threat_or_violence'::public.report_category, null)).id as message_report_id \gset
select (public.submit_profile_report('d0000000-0000-0000-0000-000000000002'::uuid, 'spam'::public.report_category, null)).id as second_profile_report_id \gset
reset role;
reset request.jwt.claim.sub;

-- ---- anon cannot call any of the three new functions ----

set local role anon;
select throws_ok(
  $$select public.check_moderator_access()$$,
  '42501', null, 'anon cannot call check_moderator_access at all — no execute grant'
);
select throws_ok(
  $$select * from public.list_moderation_reports('pending'::public.report_status)$$,
  '42501', null, 'anon cannot call list_moderation_reports at all — no execute grant'
);
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, null)$$, :'profile_report_id'),
  '42501', null, 'anon cannot call review_report at all — no execute grant'
);
reset role;

-- ---- ordinary authenticated user (not a moderator) is denied ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000003';
select results_eq(
  $$select public.check_moderator_access()$$,
  array[false], 'Carol (ordinary user) check_moderator_access is false — never a fabricated true, never an error either'
);
select throws_ok(
  $$select * from public.list_moderation_reports('pending'::public.report_status)$$,
  'P0001', 'list_moderation_reports: active moderator access required',
  'Carol (ordinary user) cannot list the queue'
);
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, null)$$, :'profile_report_id'),
  'P0001', 'review_report: active moderator access required',
  'Carol (ordinary user, not even the reporter or reported party) cannot review a report'
);
reset role;
reset request.jwt.claim.sub;

-- ---- reporter/reported/unrelated still cannot SELECT reports directly (unchanged from Slice H) ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select results_eq($$select count(*)::bigint from public.reports$$, array[0::bigint], 'Alice (the reporter) still cannot select reports directly');
reset role; reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000002';
select results_eq($$select count(*)::bigint from public.reports$$, array[0::bigint], 'Bob (the reported user) still cannot select reports directly');
reset role; reset request.jwt.claim.sub;

-- ---- active moderator: access true, queue readable ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select results_eq(
  $$select public.check_moderator_access()$$,
  array[true], 'Dave (active moderator) check_moderator_access is true'
);
select results_eq(
  format($$select count(*)::bigint from public.list_moderation_reports('pending'::public.report_status, 50)$$),
  array[3::bigint], 'Dave sees all three pending reports Alice created'
);
reset role;
reset request.jwt.claim.sub;

-- ---- filters do not mix statuses ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select results_eq(
  $$select count(*)::bigint from public.list_moderation_reports('resolved'::public.report_status, 50)$$,
  array[0::bigint], 'the resolved filter returns zero rows — nothing has been decided yet'
);
select results_eq(
  $$select count(*)::bigint from public.list_moderation_reports('dismissed'::public.report_status, 50)$$,
  array[0::bigint], 'the dismissed filter returns zero rows either'
);
reset role;
reset request.jwt.claim.sub;

-- ---- evidence: exact message only, no surrounding history, no message body for profile reports ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select results_eq(
  format($$select message_body from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'message_report_id'),
  array['Reportable message from Bob.'], 'the message report returns exactly the reported message''s own body'
);
select results_eq(
  $$select count(*)::bigint from public.list_moderation_reports('pending'::public.report_status, 50)
    where message_body = 'A different, unrelated message from Bob.'$$,
  array[0::bigint], 'the unrelated second message from Bob never appears in any report row — no surrounding conversation history'
);
select results_eq(
  format($$select message_body is null from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'profile_report_id'),
  array[true], 'a profile report''s message_body is null — no fabricated message content'
);
select results_eq(
  format($$select reporter_display_name from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'profile_report_id'),
  array['Alice Review Fixture'], 'the neutral reporter display label resolves to the real profile display name, never a raw UUID'
);
select results_eq(
  format($$select reported_display_name from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'profile_report_id'),
  array['Bob Review Fixture'], 'the neutral reported-party display label resolves to the real profile display name, never a raw UUID'
);
-- A live-verified regression: a genuinely pending report (no reviewer yet)
-- must report reviewed_by_display_name as null, never the same neutral
-- "Profile unavailable" fallback reserved for a reviewer that exists but
-- cannot be resolved — those are different, non-interchangeable states.
select results_eq(
  format($$select reviewed_by_display_name is null from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'profile_report_id'),
  array[true], 'a pending report''s reviewed_by_display_name is null — never the neutral-unavailable fallback, which would misleadingly imply a reviewer already exists'
);
reset role;
reset request.jwt.claim.sub;

-- ---- pagination is deterministic without duplicates or skips ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select results_eq(
  $$with page1 as (
      select report_id, has_more from public.list_moderation_reports('pending'::public.report_status, 2)
    )
    select count(*)::bigint from page1$$,
  array[2::bigint], 'a page size of 2 returns exactly 2 rows when 3 pending reports exist'
);
select results_eq(
  $$select bool_and(has_more) from (
      select has_more from public.list_moderation_reports('pending'::public.report_status, 2)
    ) p$$,
  array[true], 'has_more is true on the first page — a third pending report genuinely exists beyond it'
);
select results_eq(
  $$select bool_and(has_more) from (
      select has_more from public.list_moderation_reports('pending'::public.report_status, 50)
    ) p$$,
  array[false], 'has_more is false once the page size already covers every pending report'
);
-- Full keyset walk at page size 1 across all three pending reports must
-- visit each exactly once, in deterministic newest-first order, matching a
-- single unbounded fetch exactly.
select results_eq(
  $$with recursive walk as (
      select
        (select report_id from public.list_moderation_reports('pending'::public.report_status, 1) limit 1) as report_id,
        (select created_at from public.list_moderation_reports('pending'::public.report_status, 1) limit 1) as created_at,
        1 as step
      union all
      select next.report_id, next.created_at, walk.step + 1
      from walk
      cross join lateral (
        select report_id, created_at
        from public.list_moderation_reports('pending'::public.report_status, 1, walk.created_at, walk.report_id)
        limit 1
      ) next
      where walk.step < 5
    )
    select array_agg(report_id order by step)
    from walk$$,
  $$select array_agg(report_id order by created_at desc, report_id desc)
    from public.list_moderation_reports('pending'::public.report_status, 50)$$,
  'walking the keyset cursor one row at a time visits the exact same reports, in the exact same order, as a single unbounded fetch — no duplicate, no skip'
);
-- The RPC itself — not only moderationClient.ts's client-side validation —
-- must reject a half-supplied cursor. A timestamp with no id (or an id with
-- no timestamp) cannot be resolved into the deterministic (created_at, id)
-- keyset ordering the walk above just proved, so both halves are required
-- together or omitted together.
select throws_ok(
  $$select * from public.list_moderation_reports('pending'::public.report_status, 25, now(), null)$$,
  'P0001', 'list_moderation_reports: cursor must include both created_at and id, or neither',
  'a cursor timestamp supplied without a cursor id is rejected by list_moderation_reports itself, not only by the client'
);
select throws_ok(
  $$select * from public.list_moderation_reports('pending'::public.report_status, 25, null, gen_random_uuid())$$,
  'P0001', 'list_moderation_reports: cursor must include both created_at and id, or neither',
  'a cursor id supplied without a cursor timestamp is rejected by list_moderation_reports itself, not only by the client'
);
reset role;
reset request.jwt.claim.sub;

-- ---- invalid report id is rejected safely ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select throws_ok(
  $$select * from public.review_report('ffffffff-0000-0000-0000-000000000099'::uuid, 'dismissed'::public.report_status, null)$$,
  'P0001', 'review_report: report not found',
  'a nonexistent report id is rejected safely, never treated as success'
);
reset role;
reset request.jwt.claim.sub;

-- ---- pending is rejected as a decision ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'pending'::public.report_status, null)$$, :'profile_report_id'),
  'P0001', 'review_report: decision must be resolved or dismissed',
  '"pending" is rejected as a decision — only resolved/dismissed transitions exist'
);
reset role;
reset request.jwt.claim.sub;

-- ---- note trimming, whitespace-only rejection, and 1000-character bound ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, '   ')$$, :'second_profile_report_id'),
  'P0001', 'review_report: note cannot be whitespace-only',
  'a whitespace-only note is rejected outright, never silently treated as omitted'
);
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, repeat('x', 1001))$$, :'second_profile_report_id'),
  'P0001', 'review_report: note must be 1000 characters or fewer',
  'an over-limit (1001-character) note is rejected'
);
reset role;
reset request.jwt.claim.sub;

-- ---- conflict-of-interest: reporter-as-moderator cannot review their own report ----

-- user_roles has no client insert grant at all (unchanged by this slice) —
-- this fixture assignment runs as the unrestricted connecting role, the
-- same way Dave/Erin's own moderator assignment above does, never wrapped
-- in `set local role authenticated`.
insert into public.user_roles (user_id, role, assignment_reason) values ('d0000000-0000-0000-0000-000000000001', 'moderator', 'conflict-of-interest fixture — Alice is both reporter and, for this check only, also a moderator');

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, null)$$, :'profile_report_id'),
  'P0001', 'review_report: cannot review a report you submitted',
  'Alice, now also a moderator, still cannot review a report she herself submitted'
);
reset role;
reset request.jwt.claim.sub;

update public.user_roles set revoked_at = now(), revoked_by = 'd0000000-0000-0000-0000-000000000004'::uuid
where user_id = 'd0000000-0000-0000-0000-000000000001' and role = 'moderator'::public.staff_role;

-- ---- conflict-of-interest: reported-user-as-moderator cannot review the report about themselves ----

insert into public.user_roles (user_id, role, assignment_reason) values ('d0000000-0000-0000-0000-000000000002', 'moderator', 'conflict-of-interest fixture — Bob is both the reported party and, for this check only, also a moderator');

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000002';
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, null)$$, :'profile_report_id'),
  'P0001', 'review_report: cannot review a report about yourself',
  'Bob, now also a moderator, still cannot review a report where he is the reported party'
);
reset role;
reset request.jwt.claim.sub;

update public.user_roles set revoked_at = now(), revoked_by = 'd0000000-0000-0000-0000-000000000004'::uuid
where user_id = 'd0000000-0000-0000-0000-000000000002' and role = 'moderator'::public.staff_role;

-- ---- resolve succeeds with database-derived reviewer/time ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select (public.review_report(:'profile_report_id'::uuid, 'resolved'::public.report_status, 'Reviewed and actioned outside this system.')).* \gset resolve_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::public.report_status$$, :'resolve_status'),
  array['resolved'::public.report_status], 'review_report returns the confirmed final status'
);
select results_eq(
  format($$select exists (
      select 1 from public.reports r
      where r.id = %L::uuid
        and r.status = 'resolved'
        and r.reviewed_by_user_id = 'd0000000-0000-0000-0000-000000000004'::uuid
        and r.reviewed_at is not null
        and r.review_note = 'Reviewed and actioned outside this system.'
    )$$, :'profile_report_id'),
  array[true], 'the underlying row has reviewed_by_user_id exactly = auth.uid() at review time and a database-generated reviewed_at — never a caller-supplied identity or timestamp'
);

-- ---- dismiss succeeds (a distinct report, distinct decision) ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select (public.review_report(:'message_report_id'::uuid, 'dismissed'::public.report_status, null)).* \gset dismiss_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::public.report_status$$, :'dismiss_status'),
  array['dismissed'::public.report_status], 'a distinct report can be independently dismissed, with a null note (optional)'
);

-- ---- finalized overwrite rejection: retry on the now-resolved report ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, null)$$, :'profile_report_id'),
  'P0001', 'review_report: report is no longer pending',
  'a repeated review_report call on the already-resolved report is rejected, never silently succeeding a second time'
);
reset role;
reset request.jwt.claim.sub;

-- ---- direct update/delete remains impossible for both ordinary users and active moderators ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$update public.reports set status = 'dismissed' where id = %L::uuid$$, :'second_profile_report_id'),
  '42501', null, 'even an active moderator has no direct UPDATE grant on reports — review_report() remains the only write path'
);
select throws_ok(
  format($$delete from public.reports where id = %L::uuid$$, :'second_profile_report_id'),
  '42501', null, 'even an active moderator has no direct DELETE grant on reports'
);
reset role;
reset request.jwt.claim.sub;

-- ---- atomic/concurrency invariant: a raw UPDATE with the identical WHERE
-- clause review_report() itself relies on, run against the connecting
-- superuser role (bypassing the 42501 permission error an authenticated
-- role would hit first, which would prove only "no grant", not the atomic
-- mechanism itself) affects zero rows once the row is already final —
-- exactly what makes two genuinely concurrent review_report() calls safe:
-- whichever commits first changes status away from 'pending', and every
-- later WHERE status = 'pending' — evaluated against the now-committed row
-- — matches nothing. ----

select results_eq(
  format($$with attempt as (
      update public.reports set status = 'dismissed' where id = %L::uuid and status = 'pending'
      returning id
    )
    select count(*)::bigint from attempt$$, :'profile_report_id'),
  array[0::bigint],
  'a conditional UPDATE ... WHERE status = ''pending'' against the already-resolved report affects zero rows — the exact compare-and-swap mechanism a genuinely concurrent second review_report() call would hit and safely lose'
);

-- ---- immutability trigger: no update at all survives once finalized, even bypassing review_report() entirely ----

select throws_ok(
  format($$update public.reports set review_note = 'tampered' where id = %L::uuid$$, :'profile_report_id'),
  'P0001', 'reports: a finalized report cannot be modified',
  'a raw UPDATE on a finalized report — of any column, not just status — is rejected by the immutability trigger, independent of review_report()''s own logic'
);
select throws_ok(
  $$update public.reports set reporter_id = 'd0000000-0000-0000-0000-000000000004'::uuid
    where id = (select id from public.reports where status = 'pending' limit 1)$$,
  'P0001', 'reports: reporter, target, category, evidence, and creation time cannot change',
  'a raw UPDATE attempting to change reporter_id on a still-pending report is rejected — immutable fields never change on any update, finalized or not'
);

-- ---- review-state consistency is a declarative CHECK, not merely review_report()'s own validation — proven against raw privileged INSERTs (the trigger above only fires on UPDATE, so INSERT is the only way to test the CHECK constraints directly) ----

select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, target_kind, category, status, review_note)
    values ('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'profile'::public.report_target_kind, 'spam'::public.report_category, 'pending'::public.report_status, 'not allowed on a pending row')$$,
  '23514', 'new row for relation "reports" violates check constraint "reports_review_state_consistent"',
  'a raw privileged INSERT of a pending report carrying a non-null review_note is rejected declaratively — a pending report has not been reviewed yet and cannot carry a reviewer''s note'
);
select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, target_kind, category, status, reviewed_at, reviewed_by_user_id)
    values ('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'profile'::public.report_target_kind, 'spam'::public.report_category, 'resolved'::public.report_status, now(), null)$$,
  '23514', 'new row for relation "reports" violates check constraint "reports_review_state_consistent"',
  'a raw privileged INSERT of a finalized report with no reviewed_by_user_id is rejected declaratively'
);
select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, target_kind, category, status, reviewed_at, reviewed_by_user_id)
    values ('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'profile'::public.report_target_kind, 'spam'::public.report_category, 'resolved'::public.report_status, null, 'd0000000-0000-0000-0000-000000000004'::uuid)$$,
  '23514', 'new row for relation "reports" violates check constraint "reports_review_state_consistent"',
  'a raw privileged INSERT of a finalized report with no reviewed_at is rejected declaratively'
);
select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, target_kind, category, status, reviewed_at, reviewed_by_user_id, review_note)
    values ('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'profile'::public.report_target_kind, 'spam'::public.report_category, 'resolved'::public.report_status, now(), 'd0000000-0000-0000-0000-000000000004'::uuid, '    ')$$,
  '23514', 'new row for relation "reports" violates check constraint "reports_review_note_bounded"',
  'a raw privileged INSERT of a finalized report with a whitespace-only review_note is rejected declaratively'
);
select throws_ok(
  format($$insert into public.reports (reporter_id, reported_user_id, target_kind, category, status, reviewed_at, reviewed_by_user_id, review_note)
    values ('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'profile'::public.report_target_kind, 'spam'::public.report_category, 'resolved'::public.report_status, now(), 'd0000000-0000-0000-0000-000000000004'::uuid, %L)$$, repeat('a', 1001)),
  '23514', 'new row for relation "reports" violates check constraint "reports_review_note_bounded"',
  'a raw privileged INSERT of a finalized report with a 1001-trimmed-character review_note is rejected declaratively'
);
select lives_ok(
  $$insert into public.reports (reporter_id, reported_user_id, target_kind, category, status, reviewed_at, reviewed_by_user_id, review_note)
    values ('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'profile'::public.report_target_kind, 'spam'::public.report_category, 'resolved'::public.report_status, now(), 'd0000000-0000-0000-0000-000000000004'::uuid, null)$$,
  'a finalized report with an omitted/null review_note remains valid — a note is optional even once a report is resolved, only its presence-while-pending or invalid shape is rejected'
);

-- ---- finalization permits a later, genuinely new report under the existing pending-only uniqueness contract ----

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.submit_profile_report('d0000000-0000-0000-0000-000000000002'::uuid, 'harassment'::public.report_category, 'A genuinely new report after the prior harassment report was resolved via review_report().')$$,
  'once the harassment/profile report is resolved via review_report(), a new one for the identical (reporter, target, category) is allowed — the existing pending-only partial unique index is unaffected by this slice'
);
reset role;
reset request.jwt.claim.sub;

-- ---- revoked moderator immediately loses access to every new function ----

update public.user_roles set revoked_at = now(), revoked_by = 'd0000000-0000-0000-0000-000000000005'::uuid
where user_id = 'd0000000-0000-0000-0000-000000000004' and role = 'moderator'::public.staff_role;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select results_eq(
  $$select public.check_moderator_access()$$,
  array[false], 'once Dave''s moderator role is revoked, check_moderator_access immediately reflects it — no caching'
);
select throws_ok(
  $$select * from public.list_moderation_reports('pending'::public.report_status)$$,
  'P0001', 'list_moderation_reports: active moderator access required',
  'Dave can no longer list the queue once revoked'
);
select throws_ok(
  format($$select * from public.review_report(%L::uuid, 'dismissed'::public.report_status, null)$$, :'second_profile_report_id'),
  'P0001', 'review_report: active moderator access required',
  'Dave can no longer review a report once revoked'
);
reset role;
reset request.jwt.claim.sub;

-- ---- no automatic block, profile change, message deletion, role revocation beyond what this file itself performed, or notification occurs as a side effect of reviewing ----

select results_eq(
  $$select count(*)::bigint from public.blocks$$,
  array[0::bigint], 'no block was ever created — reviewing a report never creates one automatically'
);
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_reportable_message_id'),
  array[1::bigint], 'the reported message still exists — reviewing a report never deletes a message'
);
select results_eq(
  $$select display_name from public.profiles where id = 'd0000000-0000-0000-0000-000000000002'::uuid$$,
  array['Bob Review Fixture'], 'Bob''s profile is completely unchanged by being reported and the report later resolved'
);
-- Every real user carries the base 'user' role from signup; the only
-- *additional* roles anyone in this file holds are the ones this file
-- itself explicitly granted (Dave/Erin as moderator fixtures, and Alice/Bob
-- briefly for the conflict-of-interest checks, all already revoked above) —
-- so the honest proof is "no unexplained role", not "zero roles".
select results_eq(
  $$select count(*)::bigint from public.user_roles
    where user_id = 'd0000000-0000-0000-0000-000000000002'::uuid and revoked_at is null and role <> 'user'::public.staff_role$$,
  array[0::bigint], 'Bob has gained no active role beyond his base user role — reviewing a report about him never changes his account roles automatically'
);
-- No notification assertion is needed here: this schema has no
-- notifications table or mechanism of any kind in any prior slice, so
-- there is nothing review_report() could have written to even in
-- principle — the absence is structural, not something a runtime query
-- against a nonexistent object could meaningfully prove.

select * from finish();
rollback;
