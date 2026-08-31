begin;

create extension if not exists pgtap with schema extensions;
select plan(121);

-- ==========================================================================
-- Phase 4 Slice H: secure user/message reporting database foundation
-- (20260830105617_reporting_foundation.sql).
--
-- A focused new file rather than folding into direct_messaging.test.sql —
-- reporting is a distinct domain (moderation/safety, not messaging itself)
-- even though it references messages/conversations.
--
-- Fixtures are inserted into auth.users (never profiles directly), so
-- private.handle_new_auth_user() creates each fixture's public.profiles row
-- the same way a real signup does — same convention as
-- direct_messaging.test.sql / network_search.test.sql / post_type.test.sql.
-- This whole file runs inside one outer BEGIN/ROLLBACK, so nothing here is
-- ever persisted.
--
-- Role discipline: fixture setup and unrestricted verification queries run
-- as the connecting superuser role (postgres), which bypasses RLS by
-- design. Every actual policy/authorization-sensitive call is wrapped in
-- `set local role ...` (+ `request.jwt.claim.sub` where authenticated), the
-- same GUC PostgREST itself sets per request, so RLS/function-internal
-- auth.uid() checks are genuinely exercised, not merely assumed.
-- ==========================================================================

-- ==========================================================================
-- Structural: types, table, columns, constraints, indexes, RLS, grants.
-- ==========================================================================

select has_type('public', 'report_category', 'report_category enum exists');
select enum_has_labels('public', 'report_category',
  array['spam', 'harassment', 'hate_or_abuse', 'threat_or_violence', 'sexual_content', 'impersonation', 'scam_or_fraud', 'other'],
  'report_category has exactly the documented eight values');

select has_type('public', 'report_target_kind', 'report_target_kind enum exists');
select enum_has_labels('public', 'report_target_kind', array['profile', 'message'],
  'report_target_kind has exactly two values: profile, message');

select has_type('public', 'report_status', 'report_status enum exists');
select enum_has_labels('public', 'report_status', array['pending', 'resolved', 'dismissed'],
  'report_status has exactly three values: pending, resolved, dismissed — no under_review decoration ahead of a review-mutation slice that does not exist yet');

select has_type('public', 'report_receipt', 'report_receipt composite type exists');
select results_eq(
  $$select (a.attname::text) collate "default" from pg_attribute a
    where a.attrelid = 'public.report_receipt'::regclass and a.attnum > 0 and not a.attisdropped
    order by a.attnum$$,
  array['id', 'target_kind', 'category', 'created_at'],
  'report_receipt carries exactly id, target_kind, category, created_at — never reporter_id, reported_user_id, message_id, conversation_id, details, or status'
);

select has_table('public', 'reports', 'reports exists');
select col_is_pk('public', 'reports', 'id', 'reports is keyed by id');

select has_column('public', 'reports', 'reporter_id', 'reports.reporter_id exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'reporter_id'$$,
  array['uuid'], 'reports.reporter_id is typed uuid'
);
select col_not_null('public', 'reports', 'reporter_id', 'reports.reporter_id is not null');

select has_column('public', 'reports', 'reported_user_id', 'reports.reported_user_id exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'reported_user_id'$$,
  array['uuid'], 'reports.reported_user_id is typed uuid'
);
select col_not_null('public', 'reports', 'reported_user_id', 'reports.reported_user_id is not null');

select has_column('public', 'reports', 'target_kind', 'reports.target_kind exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'target_kind'$$,
  array['report_target_kind'], 'reports.target_kind is typed report_target_kind'
);
select col_not_null('public', 'reports', 'target_kind', 'reports.target_kind is not null');

select has_column('public', 'reports', 'message_id', 'reports.message_id exists');
select col_is_null('public', 'reports', 'message_id', 'reports.message_id is nullable — required only for a message-target report');

select has_column('public', 'reports', 'conversation_id', 'reports.conversation_id exists');
select col_is_null('public', 'reports', 'conversation_id', 'reports.conversation_id is nullable — required only for a message-target report');

select has_column('public', 'reports', 'category', 'reports.category exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'category'$$,
  array['report_category'], 'reports.category is typed report_category'
);
select col_not_null('public', 'reports', 'category', 'reports.category is not null');

select has_column('public', 'reports', 'details', 'reports.details exists');
select col_is_null('public', 'reports', 'details', 'reports.details is nullable — optional for every category except other');

select has_column('public', 'reports', 'status', 'reports.status exists');
select col_not_null('public', 'reports', 'status', 'reports.status is not null');
select col_default_is('public', 'reports', 'status', 'pending', 'reports.status defaults to pending — the only status a client insert can ever produce');

select col_not_null('public', 'reports', 'created_at', 'reports.created_at is not null');
select col_default_is('public', 'reports', 'created_at', 'now()', 'reports.created_at is server-controlled via now()');

-- CHECK constraints.
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and conname = 'reports_no_self_report'$$,
  array[1::bigint], 'reports_no_self_report CHECK exists'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and conname = 'reports_target_shape_consistent'$$,
  array[1::bigint], 'reports_target_shape_consistent CHECK exists — no invalid partial-null target tuple is possible'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and conname = 'reports_details_bounded'$$,
  array[1::bigint], 'reports_details_bounded CHECK exists — details, when present, is already trimmed and 1..1000 characters'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and conname = 'reports_other_requires_details'$$,
  array[1::bigint], 'reports_other_requires_details CHECK exists'
);

-- Message-reference FK: proves message existence, conversation membership,
-- and true sender identity in one composite constraint.
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'f' and conname = 'reports_message_reference_fk'$$,
  array[1::bigint], 'reports_message_reference_fk exists'
);
select results_eq(
  $$select pg_get_constraintdef(c.oid) ~ '\(message_id, conversation_id, reported_user_id\)'
      and pg_get_constraintdef(c.oid) ~ 'REFERENCES (public\.)?messages\(id, conversation_id, sender_id\)'
    from pg_constraint c
    where c.conrelid = 'public.reports'::regclass and c.conname = 'reports_message_reference_fk'$$,
  array[true],
  'reports_message_reference_fk covers the complete (message_id, conversation_id, reported_user_id) tuple, in that order, referencing messages(id, conversation_id, sender_id) in the same order'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.messages'::regclass and contype = 'u' and conname = 'messages_id_conversation_id_sender_id_key'$$,
  array[1::bigint], 'messages_id_conversation_id_sender_id_key unique constraint exists — the tuple reports_message_reference_fk requires'
);

-- Retention: reporter_id/reported_user_id take no delete action (NO
-- ACTION/'a'), a deliberate departure from follows/blocks/connections'
-- cascade — see the migration's own comment for why report evidence must
-- not silently vanish when a profile is later removed.
select results_eq(
  $$select confdeltype::text from pg_constraint
    where conrelid = 'public.reports'::regclass and confrelid = 'public.profiles'::regclass
      and conname = 'reports_reporter_id_fkey'$$,
  array['a'], 'reports_reporter_id_fkey takes no delete action — reporting evidence about a since-removed reporter is preserved'
);
select results_eq(
  $$select confdeltype::text from pg_constraint
    where conrelid = 'public.reports'::regclass and confrelid = 'public.profiles'::regclass
      and conname = 'reports_reported_user_id_fkey'$$,
  array['a'], 'reports_reported_user_id_fkey takes no delete action — evidence about a since-removed reported user is preserved'
);

-- Active-duplicate partial unique indexes.
select has_index('public', 'reports', 'reports_profile_active_duplicate_unique',
  'the profile-report active-duplicate index exists');
select results_eq(
  $$select pg_get_indexdef(i.indexrelid) ~ '\(reporter_id, reported_user_id, category\)'
      and pg_get_indexdef(i.indexrelid) ~ '\(target_kind = ''profile''(::report_target_kind)?\)'
      and pg_get_indexdef(i.indexrelid) ~ '\(status = ''pending''(::report_status)?\)'
    from pg_index i join pg_class c on c.oid = i.indexrelid
    where c.relname = 'reports_profile_active_duplicate_unique'$$,
  array[true],
  'reports_profile_active_duplicate_unique is keyed on (reporter_id, reported_user_id, category), scoped to target_kind = profile and status = pending'
);
select has_index('public', 'reports', 'reports_message_active_duplicate_unique',
  'the message-report active-duplicate index exists');
select results_eq(
  $$select pg_get_indexdef(i.indexrelid) ~ '\(reporter_id, message_id, category\)'
      and pg_get_indexdef(i.indexrelid) ~ '\(target_kind = ''message''(::report_target_kind)?\)'
      and pg_get_indexdef(i.indexrelid) ~ '\(status = ''pending''(::report_status)?\)'
    from pg_index i join pg_class c on c.oid = i.indexrelid
    where c.relname = 'reports_message_active_duplicate_unique'$$,
  array[true],
  'reports_message_active_duplicate_unique is keyed on (reporter_id, message_id, category), scoped to target_kind = message and status = pending'
);

-- RLS and grants.
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.reports'::regclass$$,
  array[true], 'RLS is enabled on reports'
);
select policies_are('public', 'reports', array['reports_moderator_read'],
  'reports exposes only a moderator-read policy — no client insert/update/delete of any kind, and no reporter/reported-user self-read policy');

select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'reports' and grantee = 'anon'$$,
  array[0::bigint], 'anon has no privileges on reports'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'reports' and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  array[1::bigint], 'authenticated may select reports at the grant level (RLS narrows this to active-moderator-only rows)'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'reports' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no table-level insert/update/delete on reports — the two submit_*_report() functions are the only write path'
);
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'reports' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no column-level insert/update/delete on reports either'
);

-- private.is_active_moderator(): zero-argument, SECURITY DEFINER, fixed
-- empty search_path, sql, stable, authenticated-only execute.
select has_function('private', 'is_active_moderator', array[]::text[],
  'is_active_moderator exists with zero parameters — no argument could ever ask about a user other than the caller');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'is_active_moderator'$$,
  array[true], 'is_active_moderator runs as SECURITY DEFINER (public.user_roles grants no client select at all)'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'private' and p.proname = 'is_active_moderator' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'is_active_moderator has a fixed empty search_path'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = 'private.is_active_moderator()'::regprocedure),
  'sql', 'is_active_moderator is written in sql'
);
select results_eq(
  $$select p.provolatile::text from pg_proc p where p.oid = 'private.is_active_moderator()'::regprocedure$$,
  array['s'], 'is_active_moderator is stable'
);
select function_privs_are('private', 'is_active_moderator', array[]::text[],
  'authenticated', array['EXECUTE'], 'authenticated may call is_active_moderator');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'private' and routine_name = 'is_active_moderator' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'is_active_moderator grants no execute privilege to anon or PUBLIC'
);

-- submit_profile_report(uuid, report_category, text): SECURITY DEFINER,
-- fixed empty search_path, plpgsql, volatile, authenticated-only execute, no
-- hidden overload accepting a reporter/status/reviewer identity.
select has_function('public', 'submit_profile_report', array['uuid', 'public.report_category', 'text'],
  'submit_profile_report exists with the expected three-argument signature (reported_user_id, category, details) — no caller-suppliable reporter/status/reviewer id');
select hasnt_function('public', 'submit_profile_report', array['uuid', 'uuid', 'public.report_category', 'text'],
  'submit_profile_report has no four-argument overload that could accept an extra caller-supplied identity (reporter override)');
select hasnt_function('public', 'submit_profile_report', array['uuid', 'public.report_category', 'text', 'public.report_status'],
  'submit_profile_report has no overload accepting a caller-supplied report_status');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_profile_report'$$,
  array[true], 'submit_profile_report runs as SECURITY DEFINER (reports grants clients no direct insert at all)'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'submit_profile_report' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'submit_profile_report has a fixed empty search_path'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = 'public.submit_profile_report(uuid, public.report_category, text)'::regprocedure),
  'plpgsql', 'submit_profile_report is written in plpgsql'
);
select results_eq(
  $$select p.provolatile::text from pg_proc p
    where p.oid = 'public.submit_profile_report(uuid, public.report_category, text)'::regprocedure$$,
  array['v'], 'submit_profile_report is volatile (it writes reports)'
);
select function_privs_are('public', 'submit_profile_report', array['uuid', 'public.report_category', 'text'],
  'authenticated', array['EXECUTE'], 'authenticated may call submit_profile_report');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'submit_profile_report' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'submit_profile_report grants no execute privilege to anon or PUBLIC'
);

-- submit_message_report(uuid, report_category, text): identical discipline.
select has_function('public', 'submit_message_report', array['uuid', 'public.report_category', 'text'],
  'submit_message_report exists with the expected three-argument signature (message_id, category, details) — no caller-suppliable conversation/sender/reported-user id');
select hasnt_function('public', 'submit_message_report', array['uuid', 'uuid', 'public.report_category', 'text'],
  'submit_message_report has no four-argument overload that could accept a caller-supplied conversation/sender/reported-user id');
select hasnt_function('public', 'submit_message_report', array['uuid', 'public.report_category', 'text', 'public.report_status'],
  'submit_message_report has no overload accepting a caller-supplied report_status');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_message_report'$$,
  array[true], 'submit_message_report runs as SECURITY DEFINER'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'submit_message_report' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'submit_message_report has a fixed empty search_path'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = 'public.submit_message_report(uuid, public.report_category, text)'::regprocedure),
  'plpgsql', 'submit_message_report is written in plpgsql'
);
select results_eq(
  $$select p.provolatile::text from pg_proc p
    where p.oid = 'public.submit_message_report(uuid, public.report_category, text)'::regprocedure$$,
  array['v'], 'submit_message_report is volatile'
);
select function_privs_are('public', 'submit_message_report', array['uuid', 'public.report_category', 'text'],
  'authenticated', array['EXECUTE'], 'authenticated may call submit_message_report');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'submit_message_report' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'submit_message_report grants no execute privilege to anon or PUBLIC'
);

-- Realtime: reports is never published, and the existing publication is
-- otherwise unaffected by this slice.
select results_eq(
  $$select count(*)::bigint from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'$$,
  array[0::bigint], 'public.reports is never added to the supabase_realtime publication'
);
select results_eq(
  $$select count(*)::bigint from pg_publication_tables where pubname = 'supabase_realtime'$$,
  array[1::bigint],
  'supabase_realtime still publishes exactly one table (messages) — this slice added nothing to it'
);

-- ==========================================================================
-- Behavioural coverage.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('e0000000-0000-0000-0000-000000000001', 'rep-alice@fixture.test', jsonb_build_object('display_name', 'Alice Reporter Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('e0000000-0000-0000-0000-000000000002', 'rep-bob@fixture.test', jsonb_build_object('display_name', 'Bob Reported Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('e0000000-0000-0000-0000-000000000003', 'rep-carol@fixture.test', jsonb_build_object('display_name', 'Carol Unrelated Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('e0000000-0000-0000-0000-000000000004', 'rep-dave@fixture.test', jsonb_build_object('display_name', 'Dave Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

-- Dave is assigned the pre-existing 'moderator' staff_role directly (the
-- unrestricted superuser role bypasses RLS/user_roles' own client lockout,
-- exactly the mechanism a real assignment would use server-side today,
-- since no client can ever write user_roles) — no new role is created.
insert into public.user_roles (user_id, role, assignment_reason)
values ('e0000000-0000-0000-0000-000000000004', 'moderator', 'reporting.test.sql fixture');

-- Alice and Bob have an existing direct conversation with messages in both
-- directions, exactly the state a real reportable conversation would be in.
set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_direct_conversation('e0000000-0000-0000-0000-000000000002'::uuid)$$,
  'Alice can create a direct conversation with Bob'
);
reset role;
reset request.jwt.claim.sub;

select id as ab_conversation_id from public.conversations
where kind = 'direct'
  and direct_member_low = least('e0000000-0000-0000-0000-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid)
  and direct_member_high = greatest('e0000000-0000-0000-0000-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid) \gset

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000002';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 'Unwanted content from Bob.')$$, :'ab_conversation_id'),
  'Bob can send a message to Alice'
);
reset role;
reset request.jwt.claim.sub;

select id as bob_message_id from public.messages
where conversation_id = :'ab_conversation_id'::uuid and body = 'Unwanted content from Bob.' \gset

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'Hi Bob, this is Alice.')$$, :'ab_conversation_id'),
  'Alice can send a message to Bob'
);
reset role;
reset request.jwt.claim.sub;

select id as alice_message_id from public.messages
where conversation_id = :'ab_conversation_id'::uuid and body = 'Hi Bob, this is Alice.' \gset

-- ---- Unauthenticated is rejected before any write, two distinct ways ----

set local role anon;
select throws_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'spam'::public.report_category, null)$$,
  '42501', null, 'anon cannot call submit_profile_report at all — no execute grant'
);
select throws_ok(
  format($$select public.submit_message_report(%L::uuid, 'spam'::public.report_category, null)$$, :'bob_message_id'),
  '42501', null, 'anon cannot call submit_message_report at all — no execute grant'
);
reset role;

set local role authenticated;
select throws_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'spam'::public.report_category, null)$$,
  'P0001', 'submit_profile_report: authentication required',
  'authenticated role with no session (auth.uid() null) is rejected by submit_profile_report'
);
select throws_ok(
  format($$select public.submit_message_report(%L::uuid, 'spam'::public.report_category, null)$$, :'bob_message_id'),
  'P0001', 'submit_message_report: authentication required',
  'authenticated role with no session (auth.uid() null) is rejected by submit_message_report'
);
reset role;

-- ---- Self-report rejected ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000001'::uuid, 'spam'::public.report_category, null)$$,
  'P0001', 'submit_profile_report: cannot report yourself',
  'Alice cannot submit a profile report against herself'
);
select throws_ok(
  format($$select public.submit_message_report(%L::uuid, 'spam'::public.report_category, null)$$, :'alice_message_id'),
  'P0001', 'submit_message_report: cannot report your own message',
  'Alice cannot report her own message'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Nonexistent targets rejected safely ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select public.submit_profile_report('ffffffff-0000-0000-0000-000000000099'::uuid, 'spam'::public.report_category, null)$$,
  'P0001', 'submit_profile_report: reported user does not exist',
  'a nonexistent profile target is rejected safely'
);
select throws_ok(
  $$select public.submit_message_report('ffffffff-0000-0000-0000-000000000098'::uuid, 'spam'::public.report_category, null)$$,
  'P0001', 'submit_message_report: message not found in an accessible conversation',
  'a nonexistent message id is rejected — same generic message as an inaccessible-conversation message, never distinguishable'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Non-member cannot report a message from a conversation they do not belong to ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000003';
select throws_ok(
  format($$select public.submit_message_report(%L::uuid, 'spam'::public.report_category, null)$$, :'bob_message_id'),
  'P0001', 'submit_message_report: message not found in an accessible conversation',
  'Carol (not a member of the Alice/Bob conversation) cannot report a message in it — indistinguishable from a nonexistent message'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Whitespace-only / over-limit details rejected; other requires details ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'spam'::public.report_category, '   ')$$,
  'P0001', 'submit_profile_report: details cannot be whitespace-only',
  'whitespace-only details is rejected outright, never silently treated as "no details provided"'
);
select throws_ok(
  format($$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'spam'::public.report_category, repeat('x', 1001))$$),
  'P0001', 'submit_profile_report: details must be 1000 characters or fewer',
  'over-limit details (1001 characters) is rejected'
);
select throws_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'other'::public.report_category, null)$$,
  'P0001', 'submit_profile_report: details are required for category other',
  'category other with no details is rejected'
);
select throws_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'other'::public.report_category, '   ')$$,
  'P0001', 'submit_profile_report: details cannot be whitespace-only',
  'category other with whitespace-only details is rejected as whitespace-only, not as "missing" — the earlier, more specific check fires first'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Valid profile report returns a confirmed receipt; reporter identity is always auth.uid() ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select (public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'harassment'::public.report_category, 'Ongoing unwanted contact.')).*
  \gset profile_receipt_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::public.report_target_kind$$, :'profile_receipt_target_kind'),
  array['profile'::public.report_target_kind], 'the profile-report receipt reports target_kind = profile'
);
select results_eq(
  format($$select %L::public.report_category$$, :'profile_receipt_category'),
  array['harassment'::public.report_category], 'the profile-report receipt reports category = harassment'
);
select results_eq(
  format($$select exists (
      select 1 from public.reports r
      where r.id = %L::uuid
        and r.reporter_id = 'e0000000-0000-0000-0000-000000000001'::uuid
        and r.reported_user_id = 'e0000000-0000-0000-0000-000000000002'::uuid
        and r.target_kind = 'profile'
        and r.category = 'harassment'
        and r.status = 'pending'
        and r.details = 'Ongoing unwanted contact.'
        and r.message_id is null
        and r.conversation_id is null
    )$$, :'profile_receipt_id'),
  array[true],
  'the underlying row has reporter_id exactly = auth.uid() at submission time, the exact reported user, pending status, and no message/conversation reference — a profile report'
);

-- ---- Valid message report derives conversation and sender correctly, never trusting a caller-supplied value (no such parameter exists) ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select (public.submit_message_report(:'bob_message_id'::uuid, 'threat_or_violence'::public.report_category, null)).* \gset message_receipt_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::public.report_target_kind$$, :'message_receipt_target_kind'),
  array['message'::public.report_target_kind], 'the message-report receipt reports target_kind = message'
);
select results_eq(
  format($$select exists (
      select 1 from public.reports r
      where r.id = %L::uuid
        and r.reporter_id = 'e0000000-0000-0000-0000-000000000001'::uuid
        and r.reported_user_id = 'e0000000-0000-0000-0000-000000000002'::uuid
        and r.target_kind = 'message'
        and r.message_id = %L::uuid
        and r.conversation_id = %L::uuid
        and r.category = 'threat_or_violence'
        and r.status = 'pending'
        and r.details is null
    )$$, :'message_receipt_id', :'bob_message_id', :'ab_conversation_id'),
  array[true],
  'the underlying row has the real sender as reported_user_id and the real conversation_id — both server-derived from the message row, matching Bob (the true sender), never any caller input'
);

-- ---- Block state neither bypasses nor reveals authorization: reporting still works identically regardless of a block in either direction ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$insert into public.blocks (blocker_id, blocked_id) values ('e0000000-0000-0000-0000-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid)$$,
  'Alice blocks Bob (ordinary authenticated insert, same as any real block)'
);
select lives_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'scam_or_fraud'::public.report_category, null)$$,
  'a distinct-category profile report against a now-blocked user still succeeds identically — reporting is never gated on block state'
);
reset role;
reset request.jwt.claim.sub;
select results_eq(
  $$select count(*)::bigint from public.reports
    where reporter_id = 'e0000000-0000-0000-0000-000000000001'::uuid
      and reported_user_id = 'e0000000-0000-0000-0000-000000000002'::uuid
      and category = 'scam_or_fraud'::public.report_category and target_kind = 'profile'$$,
  array[1::bigint], 'the post-block report row was genuinely created, not silently dropped or altered by the block'
);

-- ---- Different category creates a distinct report (intended) ----

select results_eq(
  $$select count(*)::bigint from public.reports
    where reporter_id = 'e0000000-0000-0000-0000-000000000001'::uuid
      and reported_user_id = 'e0000000-0000-0000-0000-000000000002'::uuid
      and target_kind = 'profile' and status = 'pending'$$,
  array[2::bigint],
  'Alice now has two distinct active profile reports against Bob (harassment, scam_or_fraud) — different categories are genuinely different reports, by design'
);

-- ---- Active-duplicate idempotency: repeating the identical (reporter, target, category) returns the existing receipt, never a second row ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select (public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'harassment'::public.report_category, 'A different details string this time.')).* \gset repeat_receipt_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::uuid = %L::uuid$$, :'repeat_receipt_id', :'profile_receipt_id'),
  array[true], 'repeating the identical (reporter, target=Bob, category=harassment) report while still pending returns the original report''s id, not a new one'
);
select results_eq(
  $$select count(*)::bigint from public.reports
    where reporter_id = 'e0000000-0000-0000-0000-000000000001'::uuid
      and reported_user_id = 'e0000000-0000-0000-0000-000000000002'::uuid
      and category = 'harassment'::public.report_category and target_kind = 'profile'$$,
  array[1::bigint], 'still exactly one harassment/profile row for Alice->Bob after the repeat — no duplicate active row was created'
);
select results_eq(
  format($$select details from public.reports where id = %L::uuid$$, :'profile_receipt_id'),
  array['Ongoing unwanted contact.'],
  'the original row''s details are unchanged — the repeat call''s different details text was silently ignored in favor of the existing active report, exactly as documented'
);

-- ---- Concurrency cannot create duplicate active reports: true two-session
-- concurrency cannot run inside this single pgTAP transaction, so the
-- underlying unique-index/conflict mechanism submit_profile_report()'s own
-- exception handler relies on is proven directly instead — a raw insert
-- that collides with an already-committed active row must itself raise
-- unique_violation (23505), which is exactly what a second, truly
-- concurrent submit_profile_report() call would hit and catch. ----

-- Run as the unrestricted connecting role (not authenticated): the point
-- here is to prove the index itself, not to re-prove "ordinary users cannot
-- write reports directly" (already covered further below) — authenticated
-- has no INSERT grant on reports at all, so running this as authenticated
-- would only ever demonstrate a 42501 permission error, never reach the
-- index.
select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, target_kind, category)
    values ('e0000000-0000-0000-0000-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 'profile', 'harassment')$$,
  '23505', null,
  'a raw insert colliding with an already-active (reporter, target, category) row hits the partial unique index directly — the exact mechanism a genuinely concurrent second submit_profile_report() call would race on and safely recover from'
);
reset request.jwt.claim.sub;

-- ---- Once resolved/dismissed, a genuinely new report is allowed: proven
-- directly via fixture-level status transition (no review-mutation API
-- ships this slice — see the migration's own header). ----
--
-- Phase 4 Slice J correction: also sets reviewed_at/reviewed_by_user_id
-- alongside status here — 20260830193342_moderation_review.sql added
-- reports_review_state_consistent, which requires both whenever status is
-- not 'pending'; a bare `set status = 'resolved'` (this line's original
-- form, written before that constraint existed) would now violate it. Dave
-- (the pre-existing moderator fixture below) is reused as the reviewer,
-- since he is already a real active moderator in this file's own fixture
-- set at this point — this stays a direct fixture-level transition, not a
-- call through review_report() (still deliberately out of scope for
-- reporting.test.sql itself; see moderation_review.test.sql for that RPC's
-- own coverage).
update public.reports
set status = 'resolved', reviewed_at = now(), reviewed_by_user_id = 'e0000000-0000-0000-0000-000000000004'::uuid
where id = :'profile_receipt_id'::uuid;

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.submit_profile_report('e0000000-0000-0000-0000-000000000002'::uuid, 'harassment'::public.report_category, 'A genuinely new report after the prior one was resolved.')$$,
  'once the prior harassment/profile report is resolved, a new one for the identical (reporter, target, category) is allowed'
);
reset role;
reset request.jwt.claim.sub;

select results_eq(
  $$select count(*)::bigint from public.reports
    where reporter_id = 'e0000000-0000-0000-0000-000000000001'::uuid
      and reported_user_id = 'e0000000-0000-0000-0000-000000000002'::uuid
      and category = 'harassment'::public.report_category and target_kind = 'profile'$$,
  array[2::bigint], 'two harassment/profile rows now exist for Alice->Bob: the resolved original and the new pending one'
);

-- ---- Reporter/reported-user/other-reporter visibility: nobody but an active moderator can select reports ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select results_eq(
  $$select count(*)::bigint from public.reports$$,
  array[0::bigint], 'Alice (the reporter herself) cannot select the reports table at all — no reporter self-read policy exists'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000002';
select results_eq(
  $$select count(*)::bigint from public.reports$$,
  array[0::bigint], 'Bob (the reported user) cannot discover that any report about him exists'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000003';
select results_eq(
  $$select count(*)::bigint from public.reports$$,
  array[0::bigint], 'Carol (an unrelated ordinary user, not the reporter) cannot see any report either'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Ordinary user cannot mutate or delete reports ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$update public.reports set status = 'dismissed' where id = %L::uuid$$, :'profile_receipt_id'),
  '42501', null, 'Alice cannot update any report, including her own, directly'
);
select throws_ok(
  format($$delete from public.reports where id = %L::uuid$$, :'profile_receipt_id'),
  '42501', null, 'Alice cannot delete any report, including her own, directly'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Privileged reviewer (the pre-existing moderator role) can select reports ----

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000004';
select results_eq(
  $$select count(*)::bigint from public.reports$$,
  array[4::bigint],
  'Dave, an active moderator, can select reports — sees exactly the four rows this file created (the original harassment/profile report, now resolved; the scam_or_fraud/profile report; the message report; and the new harassment/profile report submitted after the first was resolved)'
);
select throws_ok(
  format($$update public.reports set status = 'dismissed' where id = %L::uuid$$, :'profile_receipt_id'),
  '42501', null, 'even an active moderator has no update grant on reports in this slice — review mutation is deferred to a later slice'
);
reset role;
reset request.jwt.claim.sub;

-- ---- A revoked moderator loses access immediately ----

update public.user_roles set revoked_at = now(), revoked_by = 'e0000000-0000-0000-0000-000000000004'::uuid
where user_id = 'e0000000-0000-0000-0000-000000000004'::uuid and role = 'moderator'::public.staff_role;

set local role authenticated;
set local request.jwt.claim.sub to 'e0000000-0000-0000-0000-000000000004';
select results_eq(
  $$select count(*)::bigint from public.reports$$,
  array[0::bigint], 'once Dave''s moderator role is revoked, he can no longer select any report'
);
reset role;
reset request.jwt.claim.sub;

-- ---- No automatic block, message deletion, or account-role change occurs as a side effect of reporting ----

select results_eq(
  $$select count(*)::bigint from public.blocks
    where blocker_id = 'e0000000-0000-0000-0000-000000000001'::uuid and blocked_id = 'e0000000-0000-0000-0000-000000000002'::uuid$$,
  array[1::bigint], 'still exactly the one block Alice created herself earlier — reporting never creates or removes a block automatically'
);
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array[1::bigint], 'the reported message still exists — reporting never deletes a message'
);
-- Every real user carries the base 'user' role from signup
-- (private.handle_new_auth_user(), 20260818194558_identity_profiles_roles.sql)
-- — so the honest proof is "no role beyond that base one," not "zero roles."
select results_eq(
  $$select count(*)::bigint from public.user_roles
    where user_id = 'e0000000-0000-0000-0000-000000000002'::uuid and revoked_at is null and role <> 'user'::public.staff_role$$,
  array[0::bigint], 'Bob (the reported user, reported multiple times in this file) has gained no role beyond his original base user role — reporting never changes account roles automatically'
);

select * from finish();
rollback;
