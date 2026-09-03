begin;

create extension if not exists pgtap with schema extensions;
select plan(87);

-- ==========================================================================
-- Phase 4 Slice K: secure manual message moderation enforcement
-- (20260831151303_moderation_enforcement.sql).
--
-- A focused new file, not folded into moderation_review.test.sql — this is
-- the enforcement surface that migration's own header explicitly deferred
-- ("automatic enforcement of any kind... deferred, and not something this
-- slice's own schema decorates ahead of time"), and deserves its own
-- plan/fixture set the same way moderation_review.test.sql itself got its
-- own file distinct from reporting.test.sql.
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
-- Structural: new column, index, replaced policy, new constraint, new enum,
-- new table, trigger, RLS, grants, and the two replaced/extended functions.
-- ==========================================================================

select has_column('public', 'messages', 'moderation_status', 'messages.moderation_status exists');
select results_eq(
  $$select (udt_name::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'moderation_status'$$,
  array['moderation_status'], 'messages.moderation_status reuses the existing public.moderation_status enum type — no new enum was created for it'
);
select col_not_null('public', 'messages', 'moderation_status', 'messages.moderation_status is not null');
select results_eq(
  $$select (column_default::text) collate "default" from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'moderation_status'$$,
  array[$$'visible'::moderation_status$$], 'messages.moderation_status defaults to visible — every existing and new message stays reachable unless a moderator acts'
);
-- Deliberately no standalone index on messages.moderation_status — the
-- approved spec prohibits one unless a real query plan proves it useful,
-- and none was produced: every read through this column is already
-- conversation-scoped first via the existing messages_conversation_created_idx.
-- hasnt_index proves the absence explicitly rather than merely never
-- asserting it.
select hasnt_index('public', 'messages', 'messages_moderation_status_hidden_idx', 'no standalone index exists on messages.moderation_status — none was ever justified by a proven query plan');

-- messages_member_read is replaced (drop+recreate in the new migration, not
-- an edit to the historical 20260824090000_direct_messaging_foundation.sql
-- file) to additionally require moderation_status = 'visible'. Per the
-- approved product decision, this is a single unconditional clause — no
-- sender-exception carve-out.
select results_eq(
  $$select (pg_get_expr(polqual, polrelid)::text) collate "default" from pg_policy
    where polrelid = 'public.messages'::regclass and polname = 'messages_member_read'$$,
  array['(private.is_conversation_member(conversation_id) AND (moderation_status = ''visible''::moderation_status))'],
  'messages_member_read now also requires moderation_status = ''visible'' — unconditionally, including for the message''s own sender'
);
-- messages_member_insert (sending) is untouched by this slice.
select results_eq(
  $$select count(*)::bigint from pg_policy where polrelid = 'public.messages'::regclass$$,
  array[2::bigint], 'public.messages still has exactly two policies (member_read, member_insert) — this slice adds no new policy, only replaces one'
);

-- reports_id_message_id_key: a supporting composite unique constraint on the
-- existing reports table, making (id, message_id) a valid FK target below.
select results_eq(
  $$select (pg_get_constraintdef(oid)::text) collate "default" from pg_constraint
    where conrelid = 'public.reports'::regclass and conname = 'reports_id_message_id_key'$$,
  array['UNIQUE (id, message_id)'], 'reports_id_message_id_key exists on (id, message_id)'
);

-- public.moderation_action_type: exactly two values, message enforcement only.
select results_eq(
  $$select (enumlabel::text) collate "default" from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'moderation_action_type' order by e.enumsortorder$$,
  array['hide_message', 'restore_message'],
  'moderation_action_type has exactly hide_message/restore_message — no profile/post/comment action exists, per this slice''s own scope boundary'
);

-- public.moderation_actions structural shape.
select has_table('public', 'moderation_actions', 'moderation_actions table exists');
select has_column('public', 'moderation_actions', 'report_id', 'moderation_actions.report_id exists');
select has_column('public', 'moderation_actions', 'message_id', 'moderation_actions.message_id exists');
select has_column('public', 'moderation_actions', 'action', 'moderation_actions.action exists');
select has_column('public', 'moderation_actions', 'moderator_id', 'moderation_actions.moderator_id exists');
select has_column('public', 'moderation_actions', 'note', 'moderation_actions.note exists');
select col_is_null('public', 'moderation_actions', 'note', 'moderation_actions.note is nullable — optional, same as reports.review_note');
select col_not_null('public', 'moderation_actions', 'report_id', 'moderation_actions.report_id is not null — every action is tied to the report that justified it');
select col_not_null('public', 'moderation_actions', 'message_id', 'moderation_actions.message_id is not null');
select col_not_null('public', 'moderation_actions', 'moderator_id', 'moderation_actions.moderator_id is not null');

-- moderator_id FK is RESTRICT — same "who performed this administrative
-- action" attribution discipline as reports.reviewed_by_user_id.
select results_eq(
  $$select confdeltype::text from pg_constraint
    where conrelid = 'public.moderation_actions'::regclass and confrelid = 'public.profiles'::regclass
      and conname = 'moderation_actions_moderator_id_fkey'$$,
  array['r'], 'moderation_actions_moderator_id_fkey is RESTRICT'
);

-- The composite FK structurally excludes a profile-target report from ever
-- being cited here: reports.message_id is null for every target_kind =
-- 'profile' row (reports_target_shape_consistent), and this table's own
-- message_id is NOT NULL, so no such row could ever satisfy the FK.
select results_eq(
  $$select (pg_get_constraintdef(oid)::text) collate "default" from pg_constraint
    where conrelid = 'public.moderation_actions'::regclass and conname = 'moderation_actions_report_message_fk'$$,
  array['FOREIGN KEY (report_id, message_id) REFERENCES reports(id, message_id)'],
  'moderation_actions_report_message_fk ties this row''s message_id to the exact message_id stored on its own report_id — a mismatched pair, or a profile-target report, is a foreign-key violation, not merely an RPC-level check'
);

-- moderation_actions' own note CHECK is proven behaviourally further down
-- via whitespace-only/over-limit inserts routed through moderate_reported_
-- message(), mirroring how reports_review_note_bounded is proven in
-- moderation_review.test.sql.
select results_eq(
  $$select (pg_get_constraintdef(oid)::text) collate "default" from pg_constraint
    where conrelid = 'public.moderation_actions'::regclass and conname = 'moderation_actions_note_check'$$,
  array['CHECK (((note IS NULL) OR ((note = btrim(note)) AND ((char_length(note) >= 1) AND (char_length(note) <= 1000)))))'],
  'moderation_actions_note_check mirrors reports_review_note_bounded''s exact trimmed/1..1000-character contract'
);

select has_index('public', 'moderation_actions', 'moderation_actions_report_id_idx', 'the report_id lookup index exists');
select has_index('public', 'moderation_actions', 'moderation_actions_message_id_created_at_idx', 'the message history index exists');

-- Immutable ledger: a trigger blocks UPDATE/DELETE unconditionally,
-- regardless of grants — the same "true forever, not merely by current
-- code discipline" guarantee reports_immutable_fields already established.
select results_eq(
  $$select count(*)::bigint from pg_trigger
    where tgrelid = 'public.moderation_actions'::regclass and tgname = 'moderation_actions_immutable' and not tgisinternal$$,
  array[1::bigint], 'moderation_actions_immutable trigger exists'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'private' and p.proname = 'moderation_actions_prevent_modification' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'moderation_actions_prevent_modification has a fixed empty search_path'
);

-- RLS: moderator-only read, no client write grant of any kind.
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.moderation_actions'::regclass$$,
  array[true], 'moderation_actions has RLS enabled'
);
select results_eq(
  $$select count(*)::bigint from pg_policy where polrelid = 'public.moderation_actions'::regclass$$,
  array[1::bigint], 'moderation_actions has exactly one policy'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'moderation_actions' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no insert/update/delete grant on moderation_actions at all — moderate_reported_message() is the sole writer'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'moderation_actions' and grantee = 'anon'$$,
  array[0::bigint], 'anon has no grant of any kind on moderation_actions'
);

-- public.moderate_reported_message(uuid, moderation_action_type, text):
-- SECURITY DEFINER, fixed empty search_path, authenticated-only execute, no
-- hidden overload accepting a caller-supplied moderator identity.
select has_function('public', 'moderate_reported_message', array['uuid', 'public.moderation_action_type', 'text'],
  'moderate_reported_message exists with the expected three-argument signature (report_id, action, note) — no caller-suppliable moderator id or timestamp');
select hasnt_function('public', 'moderate_reported_message', array['uuid', 'public.moderation_action_type', 'text', 'uuid'],
  'moderate_reported_message has no four-argument overload that could accept a caller-supplied moderator identity');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'moderate_reported_message'$$,
  array[true], 'moderate_reported_message runs as SECURITY DEFINER (messages.moderation_status and moderation_actions both grant no client write)'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'moderate_reported_message' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'moderate_reported_message has a fixed empty search_path'
);
select function_privs_are('public', 'moderate_reported_message', array['uuid', 'public.moderation_action_type', 'text'],
  'authenticated', array['EXECUTE'], 'authenticated may call moderate_reported_message');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'moderate_reported_message' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'moderate_reported_message grants no execute privilege to anon or PUBLIC'
);

-- list_moderation_reports() was replaced (drop+recreate) to add
-- message_moderation_status — everything else about it (parameters,
-- authorization, pagination) is byte-for-byte unchanged from Slice J.
select has_function('public', 'list_moderation_reports',
  array['public.report_status', 'integer', 'timestamptz', 'uuid'],
  'list_moderation_reports still has the identical four-argument signature after being replaced');
select results_eq(
  $$select (proargnames[array_length(proargnames, 1) - 1]::text) collate "default" from pg_proc
    where pronamespace = 'public'::regnamespace and proname = 'list_moderation_reports'$$,
  array['message_moderation_status'], 'list_moderation_reports''s output now includes message_moderation_status as its second-to-last column (immediately before has_more)'
);

-- ==========================================================================
-- Behavioural coverage.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('f0000000-0000-0000-0000-000000000001', 'menf-alice@fixture.test', jsonb_build_object('display_name', 'Alice Enforcement Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f0000000-0000-0000-0000-000000000002', 'menf-bob@fixture.test', jsonb_build_object('display_name', 'Bob Enforcement Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f0000000-0000-0000-0000-000000000003', 'menf-carol@fixture.test', jsonb_build_object('display_name', 'Carol Enforcement Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f0000000-0000-0000-0000-000000000004', 'menf-dave@fixture.test', jsonb_build_object('display_name', 'Dave Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f0000000-0000-0000-0000-000000000005', 'menf-erin@fixture.test', jsonb_build_object('display_name', 'Erin Moderator Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

-- Dave and Erin are both moderators — two are needed to test
-- conflict-of-interest independently of "is this caller a moderator at all".
insert into public.user_roles (user_id, role, assignment_reason)
values
  ('f0000000-0000-0000-0000-000000000004', 'moderator', 'moderation_enforcement.test.sql fixture'),
  ('f0000000-0000-0000-0000-000000000005', 'moderator', 'moderation_enforcement.test.sql fixture');

-- Alice/Bob have a direct conversation; Bob sends the reportable message.
set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select public.create_direct_conversation('f0000000-0000-0000-0000-000000000002'::uuid) as ab_conversation_id \gset
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 'Reportable enforcement message from Bob.')$$, :'ab_conversation_id'),
  'Bob sends the reportable message'
);
reset role;
reset request.jwt.claim.sub;

select id as bob_message_id from public.messages
where conversation_id = :'ab_conversation_id'::uuid and body = 'Reportable enforcement message from Bob.' \gset

-- Alice reports Bob's message and, separately, Bob's profile — the profile
-- report exists purely to prove enforcement rejects a profile-target report.
set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select (public.submit_message_report(:'bob_message_id'::uuid, 'harassment'::public.report_category, null)).id as message_report_id \gset
select (public.submit_profile_report('f0000000-0000-0000-0000-000000000002'::uuid, 'spam'::public.report_category, null)).id as profile_report_id \gset
reset role;
reset request.jwt.claim.sub;

-- ---- list_moderation_reports()'s message_moderation_status is read live from the authoritative messages row, non-null only for a message-target report ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select results_eq(
  format($$select message_moderation_status from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'message_report_id'),
  array['visible'::public.moderation_status],
  'a pending message report''s message_moderation_status already reflects the authoritative messages row — visible, before any enforcement action — not merely null-until-hidden'
);
select results_eq(
  format($$select message_moderation_status is null from public.list_moderation_reports('pending'::public.report_status, 50)
    where report_id = %L::uuid$$, :'profile_report_id'),
  array[true],
  'a profile report''s message_moderation_status is null — nullable only for a non-message-target report, never a fabricated status'
);
reset role;
reset request.jwt.claim.sub;

-- ---- enforcement is rejected before the report is even reviewed ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: report must be resolved before enforcement',
  'a still-pending message report cannot be enforced — review must happen first'
);
reset role;
reset request.jwt.claim.sub;

-- ---- anon and ordinary users cannot call it at all ----

set local role anon;
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  '42501', null, 'anon cannot call moderate_reported_message at all — no execute grant'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000003';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: active moderator access required',
  'Carol (ordinary user, not even the reporter or reported party) cannot enforce a report'
);
reset role;
reset request.jwt.claim.sub;

-- ---- resolve the message report so enforcement becomes reachable ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select (public.review_report(:'message_report_id'::uuid, 'resolved'::public.report_status, null)).status as resolve_status \gset
reset role;
reset request.jwt.claim.sub;
select results_eq(format($$select %L::public.report_status$$, :'resolve_status'), array['resolved'::public.report_status], 'the message report is resolved, unblocking enforcement');

-- ---- a resolved but dismissed sibling report is still never enforceable (profile-target report proof, dismissed via direct fixture status manipulation — the identical technique moderation_review.test.sql already established for testing a status this slice ships no mutation API for) ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000005';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'profile_report_id'),
  'P0001', 'moderate_reported_message: report is not a message report',
  'a profile-target report is rejected on its target kind before its status is ever checked — even a still-pending profile report never reaches the status gate'
);
reset role;
reset request.jwt.claim.sub;

update public.reports set status = 'resolved', reviewed_at = now(), reviewed_by_user_id = 'f0000000-0000-0000-0000-000000000004'::uuid
where id = :'profile_report_id'::uuid;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000005';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'profile_report_id'),
  'P0001', 'moderate_reported_message: report is not a message report',
  'a resolved *profile*-target report is still never enforceable — this RPC only ever acts on a message'
);
reset role;
reset request.jwt.claim.sub;

-- ---- nonexistent report id is rejected safely ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  $$select * from public.moderate_reported_message('ffffffff-0000-0000-0000-000000000099'::uuid, 'hide_message'::public.moderation_action_type, null)$$,
  'P0001', 'moderate_reported_message: report not found',
  'a nonexistent report id is rejected safely, never treated as success'
);
reset role;
reset request.jwt.claim.sub;

-- ---- conflict-of-interest: reporter-as-moderator cannot enforce their own report ----

insert into public.user_roles (user_id, role, assignment_reason) values ('f0000000-0000-0000-0000-000000000001', 'moderator', 'conflict-of-interest fixture — Alice is both reporter and, for this check only, also a moderator');

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: cannot enforce a report you submitted',
  'Alice, now also a moderator, still cannot enforce a report she herself submitted'
);
reset role;
reset request.jwt.claim.sub;

update public.user_roles set revoked_at = now(), revoked_by = 'f0000000-0000-0000-0000-000000000004'::uuid
where user_id = 'f0000000-0000-0000-0000-000000000001' and role = 'moderator'::public.staff_role;

-- ---- conflict-of-interest: reported-user-as-moderator cannot enforce the report about themselves ----

insert into public.user_roles (user_id, role, assignment_reason) values ('f0000000-0000-0000-0000-000000000002', 'moderator', 'conflict-of-interest fixture — Bob is both the reported party and, for this check only, also a moderator');

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: cannot enforce a report about yourself',
  'Bob, now also a moderator, still cannot enforce a report where he is the reported party'
);
reset role;
reset request.jwt.claim.sub;

update public.user_roles set revoked_at = now(), revoked_by = 'f0000000-0000-0000-0000-000000000004'::uuid
where user_id = 'f0000000-0000-0000-0000-000000000002' and role = 'moderator'::public.staff_role;

-- ---- note validation: whitespace-only and over-limit rejected ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, '   ')$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: note cannot be whitespace-only',
  'a whitespace-only note is rejected outright, never silently treated as omitted'
);
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, %L)$$, :'message_report_id', repeat('x', 1001)),
  'P0001', 'moderate_reported_message: note must be 1000 characters or fewer',
  'an over-limit (1001-character) note is rejected'
);
reset role;
reset request.jwt.claim.sub;

-- ---- both members can read the message before enforcement (baseline) ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array[1::bigint], 'before enforcement, Bob (the sender) can read his own message'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array[1::bigint], 'before enforcement, Alice (the other member) can read it too'
);
reset role;
reset request.jwt.claim.sub;

-- ---- hide succeeds ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select (public.moderate_reported_message(:'message_report_id'::uuid, 'hide_message'::public.moderation_action_type, 'Confirmed harassment.')).* \gset hide_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::public.moderation_status$$, :'hide_moderation_status'),
  array['removed_by_moderator'::public.moderation_status], 'moderate_reported_message returns the confirmed new moderation_status'
);
select results_eq(
  format($$select %L::uuid = %L::uuid$$, :'hide_message_id', :'bob_message_id'),
  array[true], 'moderate_reported_message returns the exact message it acted on'
);
select results_eq(
  format($$select created_at from public.moderation_actions where id = %L::uuid$$, :'hide_action_id'),
  format($$select %L::timestamptz$$, :'hide_acted_at'),
  'the returned acted_at is not a fresh now() recomputation — it is the exact created_at of the ledger row the RPC itself just inserted, read back from the row'
);

-- ---- hidden from BOTH members, including the sender (approved product decision 1) ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array[0::bigint], 'once hidden, Bob (the message''s own sender) can no longer read it'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array[0::bigint], 'once hidden, Alice (the other member) also can no longer read it'
);
reset role;
reset request.jwt.claim.sub;

-- ---- moderator evidence access is entirely unaffected ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select results_eq(
  format($$select message_body, message_moderation_status from public.list_moderation_reports('resolved'::public.report_status, 50)
    where report_id = %L::uuid$$, :'message_report_id'),
  $$values ('Reportable enforcement message from Bob.'::text, 'removed_by_moderator'::public.moderation_status)$$,
  'the moderation queue still shows the hidden message''s exact body as evidence, plus its current hidden status'
);
reset role;
reset request.jwt.claim.sub;

-- ---- reversible, not destructive: the row itself still exists ----

select results_eq(
  format($$select body from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array['Reportable enforcement message from Bob.'], 'hiding never deletes or alters the message row — the original body is byte-identical, only moderation_status changed'
);

-- ---- hide again while already hidden is rejected (compare-and-swap) ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: message is not currently visible',
  'a second hide_message call while already hidden is rejected, never silently succeeding again'
);
reset role;
reset request.jwt.claim.sub;

-- A rejected compare-and-swap must never leave a phantom ledger row behind:
-- the UPDATE and the INSERT happen in that order inside one function body,
-- so a `not found` on the UPDATE returns before the INSERT statement is
-- ever reached at all — proven directly against the row count, not assumed.
select results_eq(
  format($$select count(*)::bigint from public.moderation_actions where report_id = %L::uuid$$, :'message_report_id'),
  array[1::bigint], 'the rejected duplicate hide_message attempt created no second audit row — exactly the one genuine hide remains'
);

-- ---- the exact compare-and-swap mechanism, proven directly (mirrors moderation_review.test.sql's own review_report() proof) ----

select results_eq(
  format($$with attempt as (
      update public.messages set moderation_status = 'removed_by_moderator'
      where id = %L::uuid and moderation_status = 'visible'
      returning id
    )
    select count(*)::bigint from attempt$$, :'bob_message_id'),
  array[0::bigint],
  'a conditional UPDATE ... WHERE moderation_status = ''visible'' against the already-hidden message affects zero rows — the exact compare-and-swap mechanism a genuinely concurrent second moderate_reported_message() call would hit and safely lose'
);

-- ---- restore succeeds ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000005';
select (public.moderate_reported_message(:'message_report_id'::uuid, 'restore_message'::public.moderation_action_type, 'Reconsidered after appeal outside this system.')).* \gset restore_
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select %L::public.moderation_status$$, :'restore_moderation_status'),
  array['visible'::public.moderation_status], 'restore_message returns the confirmed visible status'
);

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';
select results_eq(
  format($$select count(*)::bigint from public.messages where id = %L::uuid$$, :'bob_message_id'),
  array[1::bigint], 'once restored, Bob can read his own message again'
);
reset role;
reset request.jwt.claim.sub;

-- ---- restore again while already visible is rejected ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'restore_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: message is not currently hidden',
  'a restore_message call while already visible is rejected'
);
reset role;
reset request.jwt.claim.sub;

select results_eq(
  format($$select count(*)::bigint from public.moderation_actions where report_id = %L::uuid$$, :'message_report_id'),
  array[2::bigint], 'the rejected duplicate restore_message attempt created no third audit row either — still exactly hide then restore'
);

-- ---- the append-only ledger has exactly two rows, correctly attributed, in order ----

select results_eq(
  format($$select action from public.moderation_actions where report_id = %L::uuid order by created_at$$, :'message_report_id'),
  array['hide_message'::public.moderation_action_type, 'restore_message'::public.moderation_action_type],
  'moderation_actions has exactly the two actions that occurred, in the order they occurred'
);
select results_eq(
  format($$select moderator_id from public.moderation_actions
    where report_id = %L::uuid and action = 'hide_message'::public.moderation_action_type$$, :'message_report_id'),
  array['f0000000-0000-0000-0000-000000000004'::uuid], 'the hide row is attributed to Dave, the real acting moderator — never a caller-supplied identity'
);
select results_eq(
  format($$select moderator_id from public.moderation_actions
    where report_id = %L::uuid and action = 'restore_message'::public.moderation_action_type$$, :'message_report_id'),
  array['f0000000-0000-0000-0000-000000000005'::uuid], 'the restore row is attributed to Erin — a different moderator may reverse a prior moderator''s action'
);
select results_eq(
  format($$select note from public.moderation_actions
    where report_id = %L::uuid and action = 'restore_message'::public.moderation_action_type$$, :'message_report_id'),
  array['Reconsidered after appeal outside this system.'], 'the restore row''s note is stored exactly as submitted, trimmed'
);

-- ---- the ledger is append-only: raw UPDATE/DELETE is blocked by the trigger, independent of any grant ----

select throws_ok(
  format($$update public.moderation_actions set note = 'tampered' where report_id = %L::uuid$$, :'message_report_id'),
  'P0001', 'moderation_actions: an audit record can never be modified or deleted, only appended to',
  'a raw UPDATE against moderation_actions is rejected by the immutability trigger, even run as the unrestricted connecting role'
);
select throws_ok(
  format($$delete from public.moderation_actions where report_id = %L::uuid$$, :'message_report_id'),
  'P0001', 'moderation_actions: an audit record can never be modified or deleted, only appended to',
  'a raw DELETE against moderation_actions is rejected by the identical trigger'
);

-- ---- ledger RLS: moderator can read it, reporter/reported/unrelated cannot ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select results_eq(
  format($$select count(*)::bigint from public.moderation_actions where report_id = %L::uuid$$, :'message_report_id'),
  array[2::bigint], 'Dave (active moderator) can read both ledger rows'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select results_eq(
  $$select count(*)::bigint from public.moderation_actions$$,
  array[0::bigint], 'Alice (the reporter, not a moderator) cannot select any ledger row'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';
select results_eq(
  $$select count(*)::bigint from public.moderation_actions$$,
  array[0::bigint], 'Bob (the reported/enforced-against party) cannot select any ledger row either'
);
reset role;
reset request.jwt.claim.sub;

-- ---- an authenticated (moderator or not) role also has no direct table-level write privilege ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$insert into public.moderation_actions (report_id, message_id, action, moderator_id)
    values (%L::uuid, %L::uuid, 'hide_message'::public.moderation_action_type, 'f0000000-0000-0000-0000-000000000004'::uuid)$$,
    :'message_report_id', :'bob_message_id'),
  '42501', null, 'even an active moderator has no direct INSERT grant on moderation_actions — moderate_reported_message() is the only write path'
);
reset role;
reset request.jwt.claim.sub;

select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'moderation_actions' and grantee = 'authenticated'
      and privilege_type = 'TRUNCATE'$$,
  array[0::bigint], 'authenticated has no TRUNCATE grant on moderation_actions either'
);

-- ---- a profile-target report can never be cited in the ledger — proven as a direct raw INSERT against the unrestricted connecting role (bypassing grants entirely), isolating the FK mechanism itself rather than merely a permission error ----

select throws_ok(
  format($$insert into public.moderation_actions (report_id, message_id, action, moderator_id)
    values (%L::uuid, %L::uuid, 'hide_message'::public.moderation_action_type, 'f0000000-0000-0000-0000-000000000004'::uuid)$$,
    :'profile_report_id', :'bob_message_id'),
  '23503', null,
  'a ledger row citing a profile-target report is rejected by moderation_actions_report_message_fk itself — the profile report''s own reports.message_id is null, and this table''s message_id is not null, so no message_id value could ever satisfy the FK for it, even naming a real, unrelated message'
);

-- ---- revoked moderator immediately loses enforcement access ----

update public.user_roles set revoked_at = now(), revoked_by = 'f0000000-0000-0000-0000-000000000005'::uuid
where user_id = 'f0000000-0000-0000-0000-000000000004' and role = 'moderator'::public.staff_role;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000004';
select throws_ok(
  format($$select * from public.moderate_reported_message(%L::uuid, 'hide_message'::public.moderation_action_type, null)$$, :'message_report_id'),
  'P0001', 'moderate_reported_message: active moderator access required',
  'Dave can no longer enforce anything once his moderator role is revoked — no caching'
);
reset role;
reset request.jwt.claim.sub;

-- ---- no automatic side effects beyond the message's own moderation_status ----

select results_eq(
  $$select count(*)::bigint from public.blocks$$,
  array[0::bigint], 'no block was ever created — enforcement never creates one automatically'
);
select results_eq(
  format($$select status::text, reviewed_by_user_id, review_note from public.reports where id = %L::uuid$$, :'message_report_id'),
  $$values ('resolved'::text, 'f0000000-0000-0000-0000-000000000004'::uuid, null::text)$$,
  'the report row itself (status/reviewer/note) is completely unchanged by later enforcement — enforcement only ever touches the message and the ledger'
);
select results_eq(
  $$select display_name from public.profiles where id = 'f0000000-0000-0000-0000-000000000002'::uuid$$,
  array['Bob Enforcement Fixture'], 'Bob''s profile is completely unchanged by his message being hidden and restored'
);
select results_eq(
  $$select count(*)::bigint from public.user_roles
    where user_id = 'f0000000-0000-0000-0000-000000000002'::uuid and revoked_at is null and role <> 'user'::public.staff_role$$,
  array[0::bigint], 'Bob has gained no active role beyond his base user role — enforcement never changes account roles automatically'
);

-- ---- Realtime is untouched by this slice ----

select results_eq(
  $$select count(*)::bigint from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moderation_actions'$$,
  array[0::bigint], 'moderation_actions is never added to the supabase_realtime publication'
);
select results_eq(
  $$select count(*)::bigint from pg_publication_tables where pubname = 'supabase_realtime'$$,
  array[1::bigint], 'supabase_realtime still publishes exactly one table (messages) — unchanged by this slice'
);

select * from finish();
rollback;
