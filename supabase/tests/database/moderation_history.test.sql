begin;

create extension if not exists pgtap with schema extensions;
select plan(40);

-- ==========================================================================
-- Phase 4 Slice L: read-only moderation-actions history view
-- (20260909211227_moderation_history_view.sql).
--
-- Fixtures are inserted into auth.users (never profiles directly), so
-- private.handle_new_auth_user() creates each fixture's public.profiles row
-- the same way a real signup does — same convention as every other file in
-- this suite. This whole file runs inside one outer BEGIN/ROLLBACK, so
-- nothing here is ever persisted.
--
-- Role discipline: fixture setup and unrestricted verification queries run
-- as the connecting superuser role (postgres), which bypasses RLS/grants by
-- design. Every actual policy/authorization-sensitive call is wrapped in
-- `set local role ...` (+ `request.jwt.claim.sub` where authenticated), the
-- same GUC PostgREST itself sets per request.
-- ==========================================================================

-- ==========================================================================
-- Structural: signature, SECURITY DEFINER, volatility, search_path, grants,
-- exact input+output column shape.
-- ==========================================================================

select has_function('public', 'list_moderation_actions', array['integer', 'timestamptz', 'uuid', 'uuid'],
  'list_moderation_actions exists with the expected four-argument signature (limit, cursor_created_at, cursor_id, report_id)');
select hasnt_function('public', 'list_moderation_actions', array['integer', 'timestamptz', 'uuid', 'uuid', 'uuid'],
  'list_moderation_actions has no five-argument overload that could accept a caller-supplied moderator identity');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'list_moderation_actions'$$,
  array[true], 'list_moderation_actions runs as SECURITY DEFINER — moderation_actions grants no client SELECT of any kind'
);
select results_eq(
  $$select (p.provolatile::text) collate "default" from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'list_moderation_actions'$$,
  array['s'], 'list_moderation_actions is declared stable, matching list_moderation_reports'' own volatility'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'list_moderation_actions' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'list_moderation_actions has a fixed empty search_path'
);
select function_privs_are('public', 'list_moderation_actions', array['integer', 'timestamptz', 'uuid', 'uuid'],
  'authenticated', array['EXECUTE'], 'authenticated may call list_moderation_actions');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'list_moderation_actions' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'list_moderation_actions grants no execute privilege to anon or PUBLIC'
);
select is(
  (select proargnames::text[] from pg_proc where pronamespace = 'public'::regnamespace and proname = 'list_moderation_actions'),
  array['p_limit', 'p_cursor_created_at', 'p_cursor_id', 'p_report_id',
        'action_id', 'report_id', 'message_id', 'action', 'moderator_display_name',
        'report_category', 'report_target_kind', 'note', 'created_at', 'has_more'],
  'list_moderation_actions'' complete parameter+return-column list is exactly this, in this order — no reporter_id, reported_user_id, moderator_id, report details, or message body column exists to leak'
);

-- ---- the interim raw SELECT grant this slice revokes is genuinely gone ----
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'moderation_actions' and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  array[0::bigint], 'authenticated no longer has a raw SELECT grant on moderation_actions — list_moderation_actions() is the sole read boundary'
);

-- ---- the global-feed index: justified by the exact query list_moderation_actions() runs when p_report_id is omitted, not speculative — see the migration's own comment ----
select has_index('public', 'moderation_actions', 'moderation_actions_created_at_id_idx', 'the global-feed index exists');
select results_eq(
  $$select pg_get_indexdef(i.indexrelid) ~ '\(created_at DESC, id DESC\)'
    from pg_index i join pg_class c on c.oid = i.indexrelid
    where c.relname = 'moderation_actions_created_at_id_idx'$$,
  array[true], 'moderation_actions_created_at_id_idx is keyed on exactly (created_at desc, id desc) — the exact global-feed ordering list_moderation_actions() uses'
);

-- ---- untouched invariants: this slice narrows read access and adds one index; nothing about write protection, Realtime, or the two pre-existing indexes changes ----
select results_eq(
  $$select count(*)::bigint from pg_trigger where tgrelid = 'public.moderation_actions'::regclass and tgname = 'moderation_actions_immutable'$$,
  array[1::bigint], 'the append-only immutability trigger still exists, untouched by this slice'
);
select results_eq(
  $$select count(*)::bigint from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moderation_actions'$$,
  array[0::bigint], 'moderation_actions remains absent from supabase_realtime, untouched by this slice'
);
select has_index('public', 'moderation_actions', 'moderation_actions_report_id_idx', 'the pre-existing report_id index is untouched');
select has_index('public', 'moderation_actions', 'moderation_actions_message_id_created_at_idx', 'the pre-existing message-history index is untouched');

-- ==========================================================================
-- Fixtures: two moderators, a reporter, two separate resolved message
-- reports, each enforced — one hidden then restored (2 ledger rows), one
-- only hidden (1 ledger row) — giving 3 real ledger rows across 2 reports,
-- enough to genuinely prove p_report_id scoping and keyset pagination
-- without an inflated fixture set.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a9000000-0000-0000-0000-000000000001', 'mhist-alice@fixture.test', jsonb_build_object('display_name', 'Alice History Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a9000000-0000-0000-0000-000000000002', 'mhist-bob@fixture.test', jsonb_build_object('display_name', 'Bob History Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a9000000-0000-0000-0000-000000000004', 'mhist-dave@fixture.test', jsonb_build_object('display_name', 'Dave Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a9000000-0000-0000-0000-000000000005', 'mhist-erin@fixture.test', jsonb_build_object('display_name', 'Erin Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

insert into public.user_roles (user_id, role, assignment_reason)
values
  ('a9000000-0000-0000-0000-000000000004', 'moderator', 'moderation_history.test.sql fixture'),
  ('a9000000-0000-0000-0000-000000000005', 'moderator', 'moderation_history.test.sql fixture');

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000001';
select public.create_direct_conversation('a9000000-0000-0000-0000-000000000002'::uuid) as ab_conversation_id \gset
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000002';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body) values (%L::uuid, 'a9000000-0000-0000-0000-000000000002'::uuid, 'First reportable message.')$$, :'ab_conversation_id'),
  'Bob sends the first reportable message'
);
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body) values (%L::uuid, 'a9000000-0000-0000-0000-000000000002'::uuid, 'Second reportable message.')$$, :'ab_conversation_id'),
  'Bob sends the second reportable message'
);
reset role;
reset request.jwt.claim.sub;

select id as message_one_id from public.messages where conversation_id = :'ab_conversation_id'::uuid and body = 'First reportable message.' \gset
select id as message_two_id from public.messages where conversation_id = :'ab_conversation_id'::uuid and body = 'Second reportable message.' \gset

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000001';
select (public.submit_message_report(:'message_one_id'::uuid, 'harassment'::public.report_category, null)).id as report_one_id \gset
select (public.submit_message_report(:'message_two_id'::uuid, 'spam'::public.report_category, null)).id as report_two_id \gset
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
select (public.review_report(:'report_one_id'::uuid, 'resolved'::public.report_status, null)).status as r1_status \gset
select (public.review_report(:'report_two_id'::uuid, 'resolved'::public.report_status, null)).status as r2_status \gset
reset role;
reset request.jwt.claim.sub;
select results_eq(format($$select %L::public.report_status$$, :'r1_status'), array['resolved'::public.report_status], 'report one is resolved');
select results_eq(format($$select %L::public.report_status$$, :'r2_status'), array['resolved'::public.report_status], 'report two is resolved');

-- Dave (the moderator throughout) produces exactly 3 ledger rows in a known
-- order: hide(report_one), restore(report_one, with a note), hide(report_two).
set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
select (public.moderate_reported_message(:'report_one_id'::uuid, 'hide_message'::public.moderation_action_type, null)).action_id as hide_one_action_id \gset
select (public.moderate_reported_message(:'report_one_id'::uuid, 'restore_message'::public.moderation_action_type, 'Restored after reconsideration.')).action_id as restore_one_action_id \gset
select (public.moderate_reported_message(:'report_two_id'::uuid, 'hide_message'::public.moderation_action_type, null)).action_id as hide_two_action_id \gset
reset role;
reset request.jwt.claim.sub;

-- ==========================================================================
-- Authorization.
-- ==========================================================================

set local role anon;
select throws_ok(
  $$select * from public.list_moderation_actions()$$,
  '42501', null, 'anon cannot call list_moderation_actions at all — no execute grant'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select * from public.list_moderation_actions()$$,
  'P0001', 'list_moderation_actions: active moderator access required',
  'Alice (the reporter, not a moderator) is denied'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
select isnt_empty(
  $$select * from public.list_moderation_actions()$$,
  'Dave (an active moderator) can call list_moderation_actions and gets real rows back'
);
reset role;
reset request.jwt.claim.sub;

-- Erin loses access the instant her moderator role is revoked, in the same
-- session with no re-login needed — identical discipline every other
-- moderation RPC in this schema already proves for itself.
update public.user_roles set revoked_at = now(), revoked_by = 'a9000000-0000-0000-0000-000000000004'::uuid
where user_id = 'a9000000-0000-0000-0000-000000000005'::uuid and role = 'moderator';
set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000005';
select throws_ok(
  $$select * from public.list_moderation_actions()$$,
  'P0001', 'list_moderation_actions: active moderator access required',
  'a revoked moderator (Erin) immediately loses access'
);
reset role;
reset request.jwt.claim.sub;

-- ==========================================================================
-- Cursor validation: both-or-neither, identical to list_moderation_reports.
-- ==========================================================================

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
select throws_ok(
  $$select * from public.list_moderation_actions(25, now(), null)$$,
  'P0001', 'list_moderation_actions: cursor must include both created_at and id, or neither',
  'a cursor with created_at but no id is rejected'
);
select throws_ok(
  format($$select * from public.list_moderation_actions(25, null, %L::uuid)$$, :'hide_one_action_id'),
  'P0001', 'list_moderation_actions: cursor must include both created_at and id, or neither',
  'a cursor with id but no created_at is rejected'
);
reset role;
reset request.jwt.claim.sub;

-- ==========================================================================
-- Limit clamping: coalesce(NULL) to the default, and the floor at 1. The
-- ceiling (50) is proven as a standalone formula check below — reproducing
-- it end-to-end would need 51 real ledger rows, disproportionate to what a
-- pure arithmetic clamp needs proving.
-- ==========================================================================

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
select results_eq(
  $$select count(*)::bigint from public.list_moderation_actions(null)$$,
  array[3::bigint], 'an explicit NULL limit is coalesced to the default (25) rather than erroring — all 3 real rows are returned'
);
select results_eq(
  $$select count(*)::bigint from public.list_moderation_actions(0)$$,
  array[1::bigint], 'a limit of 0 is floored to 1, not treated as "no rows" or an error'
);
select results_eq(
  $$select count(*)::bigint from public.list_moderation_actions(-5)$$,
  array[1::bigint], 'a negative limit is floored to 1 the same way'
);
reset role;
reset request.jwt.claim.sub;
select results_eq(
  $$select least(greatest(coalesce(1000, 25), 1), 50)$$,
  array[50], 'the clamp formula itself ceilings an oversized limit at 50 — the identical idiom list_moderation_reports() already uses'
);

-- ==========================================================================
-- Data correctness: global ordering, p_report_id scoping, moderator
-- attribution, note round-trip.
-- ==========================================================================

set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
-- Bare `:'var'` interpolation does not happen inside a $$...$$-quoted
-- literal (that quoting exists specifically to suppress it, the same
-- reason every other query in this file that needs a variable wraps it in
-- format(...) instead) — so the expected-values side is built via format()
-- too, exactly like every parameterized query above it.
--
-- These three fixture actions are all produced within this file's own
-- single pgTAP transaction, so created_at (default now(), frozen for the
-- transaction's whole duration) genuinely ties across all of them — the
-- RPC's own id-desc tiebreaker (required for real keyset-pagination
-- determinism, not a test artifact) therefore governs relative order among
-- them, and that order is a function of gen_random_uuid()'s own output, not
-- predictable at test-authoring time. set_eq proves membership (the right
-- rows, nothing missing, nothing extra) without depending on that
-- unpredictable tiebreak; the dedicated pagination test further below
-- proves the ordering contract is genuinely deterministic and stable
-- across pages by cursoring off the server's own real returned values,
-- never a value this file predicted in advance.
select set_eq(
  $$select action_id from public.list_moderation_actions(50)$$,
  format($$values (%L::uuid), (%L::uuid), (%L::uuid)$$, :'hide_two_action_id', :'restore_one_action_id', :'hide_one_action_id'),
  'the global feed (no p_report_id) returns exactly these 3 actions, nothing missing or extra'
);
select set_eq(
  format($$select action_id from public.list_moderation_actions(50, null, null, %L::uuid)$$, :'report_one_id'),
  format($$values (%L::uuid), (%L::uuid)$$, :'restore_one_action_id', :'hide_one_action_id'),
  'p_report_id scoped to report one returns exactly its own 2 actions'
);
select set_eq(
  format($$select action_id from public.list_moderation_actions(50, null, null, %L::uuid)$$, :'report_two_id'),
  format($$values (%L::uuid)$$, :'hide_two_action_id'),
  'p_report_id scoped to report two returns exactly its own 1 action'
);
select results_eq(
  $$select distinct moderator_display_name from public.list_moderation_actions()$$,
  array['Dave Moderator Fixture'], 'every row is correctly attributed to Dave, the sole acting moderator throughout'
);
select results_eq(
  format($$select note from public.list_moderation_actions(50, null, null, %L::uuid) where action_id = %L::uuid$$, :'report_one_id', :'restore_one_action_id'),
  array['Restored after reconsideration.'], 'the restore action''s own note round-trips exactly — filtered by its own action_id, never by an assumed relative order among tied-timestamp rows'
);
select results_eq(
  format($$select note from public.list_moderation_actions(50, null, null, %L::uuid) where action_id = %L::uuid$$, :'report_two_id', :'hide_two_action_id'),
  array[null::text], 'a hide action with no note round-trips as null, never coerced to an empty string'
);
select results_eq(
  format($$select report_category, report_target_kind from public.list_moderation_actions(50, null, null, %L::uuid) limit 1$$, :'report_one_id'),
  $$values ('harassment'::public.report_category, 'message'::public.report_target_kind)$$,
  'report_category/report_target_kind reflect report one''s own real values, not a constant or the other report''s'
);
select results_eq(
  format($$select report_category from public.list_moderation_actions(50, null, null, %L::uuid) limit 1$$, :'report_two_id'),
  array['spam'::public.report_category], 'report two''s own distinct category is returned correctly, proving the join is per-row, not fixed'
);

-- ---- keyset pagination: no duplicate, no skipped row across two pages ----
select action_id as page1_last_id, created_at as page1_last_created_at
  from public.list_moderation_actions(2) order by created_at desc, action_id desc limit 1 offset 1 \gset
select results_eq(
  $$select count(*)::bigint from public.list_moderation_actions(2)$$,
  array[2::bigint], 'the first page with limit 2 returns exactly 2 rows'
);
select results_eq(
  format($$select count(*)::bigint from public.list_moderation_actions(2, %L::timestamptz, %L::uuid)$$, :'page1_last_created_at', :'page1_last_id'),
  array[1::bigint], 'the second page (cursored off the first page''s own last row) returns exactly the 1 remaining row — no duplicate, no skip'
);
reset role;
reset request.jwt.claim.sub;

-- ---- no-leak proof: a real returned row''s own key set is exactly the documented 10 columns, nothing else ----
set local role authenticated;
set local request.jwt.claim.sub to 'a9000000-0000-0000-0000-000000000004';
select is(
  (select array(select jsonb_object_keys(to_jsonb(x)) from public.list_moderation_actions(1) x order by 1)),
  array['action', 'action_id', 'created_at', 'has_more', 'message_id', 'moderator_display_name', 'note', 'report_category', 'report_id', 'report_target_kind'],
  'a real returned row has exactly these 10 keys — no moderator_id, reporter identity, reported-user identity, report details, or message body field exists to leak'
);
reset role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
