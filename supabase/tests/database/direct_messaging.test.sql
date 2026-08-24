begin;

create extension if not exists pgtap with schema extensions;
select plan(85);

-- ==========================================================================
-- Phase 4 Slice A: direct-messaging schema and RLS foundation
-- (20260824090000_direct_messaging_foundation.sql).
--
-- Fixtures are inserted into auth.users (never profiles directly), so
-- private.handle_new_auth_user() creates each fixture's public.profiles row
-- the same way a real signup does — same convention as
-- network_search.test.sql / post_type.test.sql. This whole file runs inside
-- one outer BEGIN/ROLLBACK, so nothing here is ever persisted.
--
-- Role discipline: fixture setup and unrestricted verification queries run
-- as the connecting superuser role (postgres), which bypasses RLS by
-- design. Every actual policy-sensitive call is wrapped in
-- `set local role ...` (+ `request.jwt.claim.sub` where authenticated),
-- the same GUC PostgREST itself sets per request, so RLS is genuinely
-- enforced for those calls.
-- ==========================================================================

-- ==========================================================================
-- Structural: schema, constraints, indexes, RLS enabled, grants.
-- ==========================================================================

select has_type('public', 'conversation_kind', 'conversation_kind enum exists');
select enum_has_labels('public', 'conversation_kind', array['direct'],
  'conversation_kind has exactly one shipped value: direct');

select has_table('public', 'conversations', 'conversations exists');
select has_table('public', 'conversation_members', 'conversation_members exists');
select has_table('public', 'messages', 'messages exists');

select col_is_pk('public', 'conversations', 'id', 'conversations is keyed by id');
select col_is_pk('public', 'conversation_members', array['conversation_id', 'user_id'],
  'conversation_members is keyed by the (conversation_id, user_id) pair');
select col_is_pk('public', 'messages', 'id', 'messages is keyed by id');

select has_index('public', 'conversations', 'conversations_direct_pair_unique',
  'the canonical-pair uniqueness index on conversations exists');
select has_index('public', 'conversation_members', 'conversation_members_user_idx',
  'conversation_members is indexed by user_id');
select has_index('public', 'messages', 'messages_conversation_created_idx',
  'messages is indexed for chronological conversation reads');

select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.conversations'::regclass$$,
  array[true], 'RLS is enabled on conversations'
);
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.conversation_members'::regclass$$,
  array[true], 'RLS is enabled on conversation_members'
);
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.messages'::regclass$$,
  array[true], 'RLS is enabled on messages'
);

select policies_are('public', 'conversations', array['conversations_member_read'],
  'conversations exposes only a member-read policy — no client insert/update/delete');
select policies_are('public', 'conversation_members', array['conversation_members_member_read'],
  'conversation_members exposes only a member-read policy — no client insert/update/delete');
select policies_are('public', 'messages', array['messages_member_insert', 'messages_member_read'],
  'messages exposes only member-read and member-insert — no client update/delete (append-only)');

-- Grants: anon has zero privileges on any of the three tables — this is
-- authenticated-only functionality, same discipline as follows/connections/blocks.
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'conversations' and grantee = 'anon'$$,
  array[0::bigint], 'anon has no privileges on conversations'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'conversation_members' and grantee = 'anon'$$,
  array[0::bigint], 'anon has no privileges on conversation_members'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'messages' and grantee = 'anon'$$,
  array[0::bigint], 'anon has no privileges on messages'
);

-- authenticated: conversations grants exactly SELECT on id/kind/created_at
-- (direct_member_low/high are an internal uniqueness mechanism, not
-- participant-facing data) and no insert/update/delete at the table level.
select set_eq(
  $$select column_name from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'conversations'
      and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  array['id', 'kind', 'created_at'],
  'authenticated may select exactly id/kind/created_at on conversations (not the internal pair columns)'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'conversations' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no insert/update/delete on conversations'
);

-- authenticated: conversation_members grants exactly SELECT.
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'conversation_members' and grantee = 'authenticated'
      and privilege_type = 'SELECT'$$,
  array[1::bigint], 'authenticated may select conversation_members'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'conversation_members' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no insert/update/delete on conversation_members'
);

-- authenticated: messages grants SELECT plus INSERT on exactly the four
-- writable columns, and no update/delete (append-only).
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'messages' and grantee = 'authenticated'
      and privilege_type = 'SELECT'$$,
  array[1::bigint], 'authenticated may select messages'
);
select set_eq(
  $$select column_name from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'messages'
      and grantee = 'authenticated' and privilege_type = 'INSERT'$$,
  array['id', 'conversation_id', 'sender_id', 'body'],
  'authenticated may insert exactly id/conversation_id/sender_id/body on messages'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'messages' and grantee = 'authenticated'
      and privilege_type in ('UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no update/delete on messages (append-only)'
);

-- create_direct_conversation: exists, SECURITY DEFINER, fixed empty
-- search_path, authenticated-only execute.
select has_function('public', 'create_direct_conversation', array['uuid'],
  'create_direct_conversation exists with the expected signature');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_direct_conversation'$$,
  array[true], 'create_direct_conversation runs as SECURITY DEFINER'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'create_direct_conversation'
        and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'create_direct_conversation has a fixed empty search_path'
);
select function_privs_are('public', 'create_direct_conversation', array['uuid'],
  'authenticated', array['EXECUTE'], 'authenticated may call create_direct_conversation');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'create_direct_conversation'
      and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'create_direct_conversation grants no execute privilege to anon or PUBLIC'
);

-- ==========================================================================
-- private.is_conversation_member / private.conversation_has_blocked_participant:
-- single-argument (no p_user_id — the acting user is always auth.uid()),
-- SECURITY DEFINER, fixed empty search_path, authenticated-only execute.
-- The single-argument signature is itself the security fix: with no
-- p_user_id parameter, there is no way for a caller to ask the function
-- about anyone but themselves, so the hasnt_function checks below (proving
-- the old two-argument overload is gone) are as load-bearing as the
-- structural checks on the remaining one.
-- ==========================================================================

select has_function('private', 'is_conversation_member', array['uuid'],
  'is_conversation_member exists with a single-argument signature (conversation id only)');
select hasnt_function('private', 'is_conversation_member', array['uuid', 'uuid'],
  'is_conversation_member no longer accepts an arbitrary p_user_id argument');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'is_conversation_member'$$,
  array[true], 'is_conversation_member runs as SECURITY DEFINER'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'private' and p.proname = 'is_conversation_member'
        and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'is_conversation_member has a fixed empty search_path'
);
select function_privs_are('private', 'is_conversation_member', array['uuid'],
  'authenticated', array['EXECUTE'], 'authenticated may call is_conversation_member');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'private' and routine_name = 'is_conversation_member'
      and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'is_conversation_member grants no execute privilege to anon or PUBLIC'
);

select has_function('private', 'conversation_has_blocked_participant', array['uuid'],
  'conversation_has_blocked_participant exists with a single-argument signature (conversation id only)');
select hasnt_function('private', 'conversation_has_blocked_participant', array['uuid', 'uuid'],
  'conversation_has_blocked_participant no longer accepts an arbitrary p_user_id argument');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'conversation_has_blocked_participant'$$,
  array[true], 'conversation_has_blocked_participant runs as SECURITY DEFINER'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'private' and p.proname = 'conversation_has_blocked_participant'
        and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'conversation_has_blocked_participant has a fixed empty search_path'
);
select function_privs_are('private', 'conversation_has_blocked_participant', array['uuid'],
  'authenticated', array['EXECUTE'], 'authenticated may call conversation_has_blocked_participant');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'private' and routine_name = 'conversation_has_blocked_participant'
      and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'conversation_has_blocked_participant grants no execute privilege to anon or PUBLIC'
);

-- ==========================================================================
-- Behavioural coverage.
--
-- Note on psql variables: \gset captures a value into a client-side psql
-- variable. A captured id is spliced into test SQL using format(...%L..., :'name')
-- rather than plain string concatenation: `:'name'` expands to a quoted SQL
-- literal in the *source*, and format()'s %L is what turns its value back
-- into a properly quoted literal *inside the resulting text* — plain `||`
-- concatenation of a string literal only yields its bare value, which is not
-- itself valid SQL when that resulting string is later executed as a query.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'dm-alice@fixture.test', jsonb_build_object('display_name', 'Alice Messaging Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000002', 'dm-bob@fixture.test', jsonb_build_object('display_name', 'Bob Messaging Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000003', 'dm-carol@fixture.test', jsonb_build_object('display_name', 'Carol Unrelated Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000004', 'dm-dave@fixture.test', jsonb_build_object('display_name', 'Dave Blocker Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000005', 'dm-erin@fixture.test', jsonb_build_object('display_name', 'Erin Blocked Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000006', 'dm-frank@fixture.test', jsonb_build_object('display_name', 'Frank Sender Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000007', 'dm-grace@fixture.test', jsonb_build_object('display_name', 'Grace Blocker Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

-- ---- A creates a direct conversation with B ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000002'::uuid)$$,
  'authenticated user A can create a direct conversation with valid user B'
);
reset role;
reset request.jwt.claim.sub;

select results_eq(
  $$select count(*)::bigint from public.conversations
    where kind = 'direct'
      and direct_member_low = least('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)
      and direct_member_high = greatest('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)$$,
  array[1::bigint], 'exactly one direct conversation row exists for the A/B pair'
);
select results_eq(
  $$select count(*)::bigint from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where c.kind = 'direct'
      and c.direct_member_low = least('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)
      and c.direct_member_high = greatest('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)$$,
  array[2::bigint], 'exactly two memberships are created'
);
select set_eq(
  $$select cm.user_id from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where c.kind = 'direct'
      and c.direct_member_low = least('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)
      and c.direct_member_high = greatest('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)$$,
  array['d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid],
  'the two memberships created are exactly A and B'
);

-- Captured once as the unrestricted connecting role so later role-switched
-- blocks (including an unrelated/non-member user) can reference the real id
-- directly, without themselves needing an RLS-restricted SELECT to resolve
-- it first — a non-member must never be able to discover it via their own
-- query, so the test harness learns it here instead.
select id as ab_conversation_id from public.conversations
where kind = 'direct'
  and direct_member_low = least('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)
  and direct_member_high = greatest('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid) \gset

-- ---- Reverse and repeated creation return the same conversation ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000002';
select results_eq(
  format($$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000001'::uuid) = %L::uuid$$, :'ab_conversation_id'),
  array[true], 'reversed-argument creation (B->A) returns the same existing conversation'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select results_eq(
  format($$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000002'::uuid) = %L::uuid$$, :'ab_conversation_id'),
  array[true], 'repeated creation (A->B again) returns the same existing conversation'
);
reset role;
reset request.jwt.claim.sub;

select results_eq(
  $$select count(*)::bigint from public.conversations where kind = 'direct'
      and direct_member_low = least('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)
      and direct_member_high = greatest('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid)$$,
  array[1::bigint], 'still exactly one conversation row after the reversed and repeated calls'
);
select results_eq(
  format($$select count(*)::bigint from public.conversation_members where conversation_id = %L::uuid$$, :'ab_conversation_id'),
  array[2::bigint], 'still exactly two memberships after the reversed and repeated calls'
);

-- ---- Clients cannot bypass create_direct_conversation() with a direct table insert ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000003';
select throws_ok(
  $$insert into public.conversations (kind, direct_member_low, direct_member_high)
    values ('direct', least('d0000000-0000-0000-0000-000000000003'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid),
                       greatest('d0000000-0000-0000-0000-000000000003'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid))$$,
  '42501', null, 'a client cannot bypass create_direct_conversation() by inserting into conversations directly'
);
select throws_ok(
  format($$insert into public.conversation_members (conversation_id, user_id)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000003'::uuid)$$, :'ab_conversation_id'),
  '42501', null, 'a client cannot bypass create_direct_conversation() by inserting into conversation_members directly'
);
reset role;
reset request.jwt.claim.sub;

-- ---- A sends a real message to B (member send with sender_id = auth.uid()) ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Hello Bob, this is Alice.')$$, :'ab_conversation_id'),
  'a member may send a message with sender_id = auth.uid()'
);
reset role;
reset request.jwt.claim.sub;

select id as ab_message_id from public.messages
where conversation_id = :'ab_conversation_id'::uuid and body = 'Hello Bob, this is Alice.' \gset

-- ---- Anonymous cannot create, read, or send ----
set local role anon;
select throws_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000001'::uuid)$$,
  '42501', null, 'anonymous cannot call create_direct_conversation'
);
select throws_ok(
  format($$select * from public.conversations where id = %L::uuid$$, :'ab_conversation_id'),
  '42501', null, 'anonymous cannot read conversations'
);
select throws_ok(
  format($$select * from public.messages where id = %L::uuid$$, :'ab_message_id'),
  '42501', null, 'anonymous cannot read messages'
);
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Anonymous attempt')$$, :'ab_conversation_id'),
  '42501', null, 'anonymous cannot send a message'
);
reset role;

-- ---- Member B can read the conversation, memberships, and messages ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000002';
select results_eq(
  format($$select count(*)::bigint from public.conversations where id = %L::uuid$$, :'ab_conversation_id'),
  array[1::bigint], 'member B can read the conversation row'
);
select results_eq(
  format($$select count(*)::bigint from public.conversation_members where conversation_id = %L::uuid$$, :'ab_conversation_id'),
  array[2::bigint], 'member B can read both memberships'
);
select results_eq(
  format($$select count(*)::bigint from public.messages where conversation_id = %L::uuid$$, :'ab_conversation_id'),
  array[1::bigint], 'member B can read the message A sent'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Unrelated authenticated user C cannot read them ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000003';
select results_eq(
  format($$select count(*)::bigint from public.conversations where id = %L::uuid$$, :'ab_conversation_id'),
  array[0::bigint], 'unrelated C cannot read the conversation row'
);
select results_eq(
  format($$select count(*)::bigint from public.conversation_members where conversation_id = %L::uuid$$, :'ab_conversation_id'),
  array[0::bigint], 'unrelated C cannot read the memberships'
);
select results_eq(
  format($$select count(*)::bigint from public.messages where conversation_id = %L::uuid$$, :'ab_conversation_id'),
  array[0::bigint], 'unrelated C cannot read the messages'
);

-- ---- Sender spoofing and non-member send are rejected ----
reset role;
reset request.jwt.claim.sub;
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000002';
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Spoofed as Alice')$$, :'ab_conversation_id'),
  '42501', null, 'sender_id spoofing (inserting a message as another user) is rejected'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000003';
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000003'::uuid, 'I am not a member')$$, :'ab_conversation_id'),
  '42501', null, 'a non-member cannot send into a conversation they do not belong to'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Empty, whitespace-only, and oversized bodies are rejected ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, '')$$, :'ab_conversation_id'),
  '23514', null, 'an empty body is rejected'
);
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, '   ')$$, :'ab_conversation_id'),
  '23514', null, 'a whitespace-only body is rejected'
);
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, repeat('x', 2001))$$, :'ab_conversation_id'),
  '23514', null, 'a body exceeding the 2000-character maximum is rejected'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Messages are append-only: update/delete rejected, even by the sender ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$update public.messages set body = 'edited' where id = %L::uuid$$, :'ab_message_id'),
  '42501', null, 'even the sender cannot update a sent message'
);
select throws_ok(
  format($$delete from public.messages where id = %L::uuid$$, :'ab_message_id'),
  '42501', null, 'even the sender cannot delete a sent message'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Blocked pairs cannot create a conversation, in either calling direction ----
insert into public.blocks (blocker_id, blocked_id)
values ('d0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005');

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000004';
select throws_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000005'::uuid)$$,
  'P0001', 'create_direct_conversation: this conversation is not available',
  'the blocker cannot create a conversation with the user they blocked'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000005';
select throws_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000004'::uuid)$$,
  'P0001', 'create_direct_conversation: this conversation is not available',
  'the blocked user cannot create a conversation with the user who blocked them'
);
reset role;
reset request.jwt.claim.sub;

-- ---- A block imposed after a conversation exists still stops sending, in either direction ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000006';
select lives_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-000000000007'::uuid)$$,
  'F and G can create a conversation before any block exists between them'
);
reset role;
reset request.jwt.claim.sub;

select id as fg_conversation_id from public.conversations
where kind = 'direct'
  and direct_member_low = least('d0000000-0000-0000-0000-000000000006'::uuid, 'd0000000-0000-0000-0000-000000000007'::uuid)
  and direct_member_high = greatest('d0000000-0000-0000-0000-000000000006'::uuid, 'd0000000-0000-0000-0000-000000000007'::uuid) \gset

insert into public.blocks (blocker_id, blocked_id)
values ('d0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000006');

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000006';
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000006'::uuid, 'Can F still message G?')$$, :'fg_conversation_id'),
  '42501', null, 'the blocked party (F) cannot send after G blocks them'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000007';
select throws_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000007'::uuid, 'Can G still message F?')$$, :'fg_conversation_id'),
  '42501', null, 'the blocker (G) also cannot send once they have blocked the other party'
);
reset role;
reset request.jwt.claim.sub;

-- ==========================================================================
-- Direct-call probing coverage.
--
-- Layer 1 (already in force before this slice, unchanged here):
-- 20260818194558_identity_profiles_roles.sql revokes all privileges —
-- including USAGE — on schema private from public/anon/authenticated. Name
-- resolution for a schema-qualified call like `private.foo(...)` requires
-- USAGE on the containing schema, checked at parse time, so the
-- 'authenticated' role cannot even reference either helper in an ad hoc
-- query or RPC call — it fails before EXECUTE on the function is ever
-- considered. RLS policies are unaffected because their function calls are
-- resolved to fixed OIDs once, when the policy is created by a privileged
-- role, not re-resolved per query.
--
-- Layer 2 (the fix in this migration): even if schema access were ever
-- opened up, neither helper accepts a p_user_id, and
-- conversation_has_blocked_participant fails closed for non-members — so
-- the acting user (auth.uid()) can never learn more than their own
-- membership/block state. That logic is exercised below via the
-- unrestricted connecting role plus a request.jwt.claim.sub GUC (the same
-- input auth.uid() reads regardless of role), since the connecting role is
-- not subject to the schema revoke and can therefore call the functions
-- directly to check their return values.
-- ==========================================================================

set local role authenticated;
select throws_ok(
  format($$select private.is_conversation_member(%L::uuid)$$, :'ab_conversation_id'),
  '42501', null,
  'authenticated cannot invoke is_conversation_member directly at all (no USAGE on schema private) — not even a real member'
);
select throws_ok(
  format($$select private.conversation_has_blocked_participant(%L::uuid)$$, :'ab_conversation_id'),
  '42501', null,
  'authenticated cannot invoke conversation_has_blocked_participant directly at all (no USAGE on schema private)'
);
reset role;

set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000001';
select results_eq(
  format($$select private.is_conversation_member(%L::uuid)$$, :'ab_conversation_id'),
  array[true], 'is_conversation_member correctly reports true for a real member of their own conversation'
);
select results_eq(
  format($$select private.conversation_has_blocked_participant(%L::uuid)$$, :'ab_conversation_id'),
  array[false], 'conversation_has_blocked_participant correctly reports false for a real member with no block in play'
);
reset request.jwt.claim.sub;

set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000003';
select results_eq(
  format($$select private.is_conversation_member(%L::uuid)$$, :'ab_conversation_id'),
  array[false], 'is_conversation_member reports false — never true — for an unrelated caller (C) probing A/B''s conversation'
);
select results_eq(
  format($$select private.conversation_has_blocked_participant(%L::uuid)$$, :'ab_conversation_id'),
  array[true], 'conversation_has_blocked_participant fails closed (true) for an unrelated caller (C) probing a conversation they do not belong to, never revealing A/B''s real block state'
);
reset request.jwt.claim.sub;

set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000006';
select results_eq(
  format($$select private.conversation_has_blocked_participant(%L::uuid)$$, :'fg_conversation_id'),
  array[true], 'conversation_has_blocked_participant correctly reports true for the blocked party (F), a real member, once a block exists'
);
reset request.jwt.claim.sub;

-- ==========================================================================
-- The concurrent unique_violation handler in create_direct_conversation can
-- only ever resolve to a row matching (direct_member_low, direct_member_high)
-- = (least(caller, other), greatest(caller, other)) — values derived from
-- the caller's own auth.uid(), never from client input — so the row it
-- returns always has the caller as one of its two canonical participants
-- by construction, regardless of which racing transaction wins the insert.
-- This confirms the uniqueness guarantee the exception handler leans on:
-- conversations_direct_pair_unique makes a second concurrent insert for the
-- same pair impossible, which is exactly what forces the losing transaction
-- into that handler in the first place.
-- ==========================================================================

select throws_ok(
  $$insert into public.conversations (kind, direct_member_low, direct_member_high)
    values ('direct', least('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid),
                       greatest('d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid))$$,
  '23505', null,
  'conversations_direct_pair_unique rejects a second row for an already-canonicalized pair — the exact race the unique_violation handler resolves'
);

select * from finish();
rollback;
