begin;

create extension if not exists pgtap with schema extensions;
select plan(168);

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
-- Phase 4 safety-checkpoint audit (2026-09-03): create_direct_conversation()'s
-- own idempotent "return the existing conversation" fast path was never
-- proven to be equally block-gated as the fresh-creation path is above — it
-- runs the identical has_blocked() check unconditionally before the lookup
-- (20260824090000_direct_messaging_foundation.sql), but that guarantee had
-- no direct test. Nor did unblocking-restores-capability have any coverage
-- at all: every existing block-related assertion in this file proves a
-- block *stops* something; none prove that removing it *restores* the
-- identical capability, for either the lookup RPC or raw sends, in either
-- direction. Both gaps are closed here.
--
-- Dedicated new fixtures (Mia/Noah), not the F/G pair above: F/G's own
-- block is still relied on by later sections of this file (the direct-call
-- probing coverage immediately below, and the read-state block-does-not-
-- hide-unread proof much further down) — deleting it here to test unblock
-- would silently corrupt those later, unrelated proofs.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('d0000000-0000-0000-0000-00000000000d', 'dm-mia@fixture.test', jsonb_build_object('display_name', 'Mia Unblock Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-00000000000e', 'dm-noah@fixture.test', jsonb_build_object('display_name', 'Noah Unblock Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000d';
select lives_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-00000000000e'::uuid)$$,
  'Mia and Noah can create a conversation before any block exists between them'
);
reset role;
reset request.jwt.claim.sub;

select id as mn_conversation_id from public.conversations
where kind = 'direct'
  and direct_member_low = least('d0000000-0000-0000-0000-00000000000d'::uuid, 'd0000000-0000-0000-0000-00000000000e'::uuid)
  and direct_member_high = greatest('d0000000-0000-0000-0000-00000000000d'::uuid, 'd0000000-0000-0000-0000-00000000000e'::uuid) \gset

insert into public.blocks (blocker_id, blocked_id)
values ('d0000000-0000-0000-0000-00000000000e', 'd0000000-0000-0000-0000-00000000000d');

-- ---- the idempotent lookup path is not a bypass: re-calling create_direct_conversation() for an *existing* conversation while blocked is rejected identically to fresh creation, in both directions ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000d';
select throws_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-00000000000e'::uuid)$$,
  'P0001', 'create_direct_conversation: this conversation is not available',
  'Mia re-calling create_direct_conversation for the existing Mia/Noah conversation while blocked is rejected — the idempotent lookup fast path cannot be used to route around the block check'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000e';
select throws_ok(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-00000000000d'::uuid)$$,
  'P0001', 'create_direct_conversation: this conversation is not available',
  'Noah re-calling create_direct_conversation for the same existing conversation while blocked is rejected too — symmetric in both directions'
);
reset role;
reset request.jwt.claim.sub;

-- ---- unblocking restores both the lookup RPC and raw sending, in both directions, without creating a second conversation ----
delete from public.blocks
where blocker_id = 'd0000000-0000-0000-0000-00000000000e'::uuid
  and blocked_id = 'd0000000-0000-0000-0000-00000000000d'::uuid;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000d';
select results_eq(
  $$select public.create_direct_conversation('d0000000-0000-0000-0000-00000000000e'::uuid)$$,
  format($$select %L::uuid$$, :'mn_conversation_id'),
  'after the block is removed, create_direct_conversation returns the identical, already-existing conversation id — a genuine restored lookup, never a second/duplicate conversation'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000d';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-00000000000d'::uuid, 'Mia can message Noah again now that the block is gone.')$$, :'mn_conversation_id'),
  'once unblocked, Mia (the formerly-blocked party) can send again'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000e';
select lives_ok(
  format($$insert into public.messages (conversation_id, sender_id, body)
    values (%L::uuid, 'd0000000-0000-0000-0000-00000000000e'::uuid, 'Noah can message Mia again too.')$$, :'mn_conversation_id'),
  'once unblocked, Noah (the former blocker) can send again too — sending is symmetric in both directions'
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

-- ==========================================================================
-- Phase 4 Slice D: enable_messages_realtime migration
-- (20260828174637_enable_messages_realtime.sql).
--
-- Proves exactly the three things that migration is allowed to change: (1)
-- public.messages — and only public.messages — is now a member of the
-- pre-existing supabase_realtime publication, and (2)/(3) messages' RLS
-- remains enabled with the identical policy set as verified structurally
-- above, i.e. enabling Realtime granted no new authorization path of its
-- own — Postgres Changes delivery still rides entirely on
-- messages_member_read.
-- ==========================================================================

select results_eq(
  $$select count(*)::bigint from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'$$,
  array[1::bigint], 'public.messages is a member of the supabase_realtime publication'
);
select results_eq(
  $$select count(*)::bigint from pg_publication_tables where pubname = 'supabase_realtime'$$,
  array[1::bigint],
  'supabase_realtime publishes exactly one table — no unrelated table (conversations, conversation_members, profiles, blocks, etc.) was added by this slice'
);
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.messages'::regclass$$,
  array[true], 'RLS remains enabled on messages after enabling Realtime'
);
select policies_are('public', 'messages', array['messages_member_insert', 'messages_member_read'],
  'messages still exposes only member-read and member-insert after Phase 4 Slice D — enabling Realtime grants no new authorization path');

-- ==========================================================================
-- Phase 4 Slice E: message_read_state, mark_conversation_read(),
-- get_unread_message_counts() (20260829172436_message_read_state.sql).
--
-- Structural: table/columns/constraints/RLS/grants, then both functions'
-- signature/security/volatility/language/search_path/grants.
-- ==========================================================================

select has_table('public', 'message_read_state', 'message_read_state exists');
select col_is_pk('public', 'message_read_state', array['conversation_id', 'user_id'],
  'message_read_state is keyed by the (conversation_id, user_id) pair — at most one read-state row per member per conversation');
select has_pk('public', 'message_read_state', 'message_read_state has a primary key');

select results_eq(
  $$select pg_catalog.format_type(a.atttypid, a.atttypmod)
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_read_state' and a.attname = 'conversation_id'
      and a.attnum > 0 and not a.attisdropped$$,
  array['uuid'], 'message_read_state.conversation_id is typed uuid'
);
select col_not_null('public', 'message_read_state', 'conversation_id', 'message_read_state.conversation_id is not null');
select results_eq(
  $$select pg_catalog.format_type(a.atttypid, a.atttypmod)
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_read_state' and a.attname = 'user_id'
      and a.attnum > 0 and not a.attisdropped$$,
  array['uuid'], 'message_read_state.user_id is typed uuid'
);
select col_not_null('public', 'message_read_state', 'user_id', 'message_read_state.user_id is not null');
select has_column('public', 'message_read_state', 'last_read_message_id', 'message_read_state.last_read_message_id exists');
select results_eq(
  $$select pg_catalog.format_type(a.atttypid, a.atttypmod)
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_read_state' and a.attname = 'last_read_message_id'
      and a.attnum > 0 and not a.attisdropped$$,
  array['uuid'], 'message_read_state.last_read_message_id is typed uuid'
);
select has_column('public', 'message_read_state', 'last_read_message_created_at',
  'message_read_state.last_read_message_created_at exists');
select results_eq(
  $$select pg_catalog.format_type(a.atttypid, a.atttypmod)
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_read_state' and a.attname = 'last_read_message_created_at'
      and a.attnum > 0 and not a.attisdropped$$,
  array['timestamp with time zone'], 'message_read_state.last_read_message_created_at is typed timestamptz'
);
select col_not_null('public', 'message_read_state', 'updated_at', 'message_read_state.updated_at is not null');

-- "The user must genuinely be a member of that conversation" — enforced
-- declaratively by this FK, not only checked once at RPC call time.
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.message_read_state'::regclass and contype = 'f' and conname = 'message_read_state_member_fk'$$,
  array[1::bigint], 'message_read_state_member_fk exists: (conversation_id, user_id) references conversation_members'
);
select results_eq(
  $$select confdeltype::text from pg_constraint
    where conrelid = 'public.message_read_state'::regclass and conname = 'message_read_state_member_fk'$$,
  array['c'], 'message_read_state_member_fk cascades on delete — a removed membership can never leave an orphaned read-state row'
);

-- "A stored message cursor must be the real, current row for this
-- conversation" — enforced declaratively against
-- messages_conversation_id_created_at_id_key below as the complete
-- (conversation_id, created_at, id) tuple, not the id alone.
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.message_read_state'::regclass and contype = 'f' and conname = 'message_read_state_cursor_fk'$$,
  array[1::bigint], 'message_read_state_cursor_fk exists: (conversation_id, last_read_message_created_at, last_read_message_id) references messages'
);
select results_eq(
  $$select pg_get_constraintdef(c.oid) ~ '\(conversation_id, last_read_message_created_at, last_read_message_id\)'
      and pg_get_constraintdef(c.oid) ~ 'REFERENCES (public\.)?messages\(conversation_id, created_at, id\)'
    from pg_constraint c
    where c.conrelid = 'public.message_read_state'::regclass and c.conname = 'message_read_state_cursor_fk'$$,
  array[true],
  'message_read_state_cursor_fk covers the complete three-column cursor — (conversation_id, last_read_message_created_at, last_read_message_id) — in that exact order, referencing messages(conversation_id, created_at, id) in the same order, not just the id'
);
select results_eq(
  $$select confdeltype::text from pg_constraint
    where conrelid = 'public.message_read_state'::regclass and conname = 'message_read_state_cursor_fk'$$,
  array['a'], 'message_read_state_cursor_fk takes no delete action — messages are append-only/undeletable in this schema, and NO ACTION is the defensive choice if that ever changes'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.messages'::regclass and contype = 'u' and conname = 'messages_conversation_id_created_at_id_key'$$,
  array[1::bigint], 'messages_conversation_id_created_at_id_key unique constraint exists — the complete tuple the cursor FK above requires'
);
select results_eq(
  $$select pg_get_constraintdef(c.oid) ~ '\(conversation_id, created_at, id\)'
    from pg_constraint c
    where c.conrelid = 'public.messages'::regclass and c.conname = 'messages_conversation_id_created_at_id_key' and c.contype = 'u'$$,
  array[true],
  'messages_conversation_id_created_at_id_key is unique on the complete (conversation_id, created_at, id) tuple, in that order — the exact order the cursor FK above references'
);
select results_eq(
  $$select count(*)::bigint from pg_constraint
    where conrelid = 'public.message_read_state'::regclass and contype = 'c' and conname = 'message_read_state_cursor_consistent'$$,
  array[1::bigint], 'message_read_state_cursor_consistent CHECK exists — cursor id/timestamp can never be a partial null combination'
);

select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.message_read_state'::regclass$$,
  array[true], 'RLS is enabled on message_read_state'
);
select policies_are('public', 'message_read_state', array['message_read_state_owner_read'],
  'message_read_state exposes only an owner-read policy — no other member, and no client insert/update/delete, is ever possible');

select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'message_read_state' and grantee = 'anon'$$,
  array[0::bigint], 'anon has no privileges on message_read_state'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'message_read_state' and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  array[1::bigint], 'authenticated may select message_read_state (RLS narrows this to their own row)'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'message_read_state' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no table-level insert/update/delete on message_read_state — mark_conversation_read() is the only write path'
);
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'message_read_state' and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'authenticated has no column-level insert/update/delete on message_read_state either'
);

-- mark_conversation_read(uuid, uuid): SECURITY DEFINER, fixed empty
-- search_path, plpgsql, volatile (it writes), authenticated-only execute, no
-- p_user_id-style overload of any arity that could target another user.
select has_function('public', 'mark_conversation_read', array['uuid', 'uuid'],
  'mark_conversation_read exists with the expected two-argument signature (conversation id, message id — no caller-suppliable user id)');
select hasnt_function('public', 'mark_conversation_read', array['uuid', 'uuid', 'uuid'],
  'mark_conversation_read has no three-argument overload that could accept a caller-supplied user id');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mark_conversation_read'$$,
  array[true], 'mark_conversation_read runs as SECURITY DEFINER (the table it writes grants clients no direct insert/update at all)'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'mark_conversation_read' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'mark_conversation_read has a fixed empty search_path'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = 'public.mark_conversation_read(uuid, uuid)'::regprocedure),
  'plpgsql', 'mark_conversation_read is written in plpgsql'
);
select results_eq(
  $$select p.provolatile::text from pg_proc p
    where p.oid = 'public.mark_conversation_read(uuid, uuid)'::regprocedure$$,
  array['v'], 'mark_conversation_read is volatile (it writes message_read_state)'
);
select function_privs_are('public', 'mark_conversation_read', array['uuid', 'uuid'],
  'authenticated', array['EXECUTE'], 'authenticated may call mark_conversation_read');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'mark_conversation_read' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'mark_conversation_read grants no execute privilege to anon or PUBLIC'
);

-- get_unread_message_counts(): SECURITY INVOKER (every table it reads is
-- already correctly scoped to the caller by existing RLS), fixed empty
-- search_path, sql, stable (read-only), authenticated-only execute, zero
-- parameters (no probing surface for another user/conversation).
select has_function('public', 'get_unread_message_counts', array[]::text[],
  'get_unread_message_counts exists with zero parameters — no argument could ever target another user or conversation');
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_unread_message_counts'$$,
  array[false], 'get_unread_message_counts runs as SECURITY INVOKER — every table it joins is already correctly RLS-scoped to the caller'
);
select results_eq(
  $$select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'get_unread_message_counts' and cfg.setting = 'search_path=""'
    )$$,
  array[true], 'get_unread_message_counts has a fixed empty search_path'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = 'public.get_unread_message_counts()'::regprocedure),
  'sql', 'get_unread_message_counts is written in sql'
);
select results_eq(
  $$select p.provolatile::text from pg_proc p
    where p.oid = 'public.get_unread_message_counts()'::regprocedure$$,
  array['s'], 'get_unread_message_counts is stable (read-only within one evaluation)'
);
select function_privs_are('public', 'get_unread_message_counts', array[]::text[],
  'authenticated', array['EXECUTE'], 'authenticated may call get_unread_message_counts');
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'get_unread_message_counts' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'get_unread_message_counts grants no execute privilege to anon or PUBLIC'
);

-- ==========================================================================
-- Behavioural coverage.
--
-- Deliberately fresh fixtures (H/I/J/K/L) rather than reusing A-G above:
-- this keeps every ordering/monotonicity assertion below independent of
-- whatever state the Slice A-D sections already left in ab_conversation_id,
-- and lets every message here use an explicit, caller-chosen id (public.
-- messages grants authenticated INSERT on the id column itself — see
-- 20260824090000_direct_messaging_foundation.sql) rather than a random
-- gen_random_uuid() one. That control matters specifically because this
-- whole file runs inside one outer BEGIN — Postgres's now() is frozen for
-- the entire transaction, so messages inserted moments apart here still get
-- an *identical* created_at; only an explicit, deliberately-ordered id makes
-- the (created_at, id) tuple ordering these tests exercise unambiguous.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('d0000000-0000-0000-0000-000000000008', 'dm-henry@fixture.test', jsonb_build_object('display_name', 'Henry ReadState Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000009', 'dm-ivy@fixture.test', jsonb_build_object('display_name', 'Ivy ReadState Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-00000000000a', 'dm-judy@fixture.test', jsonb_build_object('display_name', 'Judy Unrelated ReadState Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-00000000000b', 'dm-kara@fixture.test', jsonb_build_object('display_name', 'Kara ReadState Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('d0000000-0000-0000-0000-00000000000c', 'dm-leo@fixture.test', jsonb_build_object('display_name', 'Leo ReadState Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

-- H <-> I: the main conversation these tests mark/read against.
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000008';
select public.create_direct_conversation('d0000000-0000-0000-0000-000000000009'::uuid) as hi_conversation_id \gset
insert into public.messages (id, conversation_id, sender_id, body)
  values ('e1000000-0000-0000-0000-000000000001'::uuid, :'hi_conversation_id'::uuid, 'd0000000-0000-0000-0000-000000000008', 'Hi Ivy — message one.');
insert into public.messages (id, conversation_id, sender_id, body)
  values ('e1000000-0000-0000-0000-000000000002'::uuid, :'hi_conversation_id'::uuid, 'd0000000-0000-0000-0000-000000000008', 'Hi Ivy — message two.');
reset role;
reset request.jwt.claim.sub;

-- J <-> C (reusing the already-fixtured, unrelated Carol): a wholly separate
-- conversation, used only to prove a cursor from the wrong conversation is
-- rejected.
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000a';
select public.create_direct_conversation('d0000000-0000-0000-0000-000000000003'::uuid) as jc_conversation_id \gset
insert into public.messages (id, conversation_id, sender_id, body)
  values ('e1000000-0000-0000-0000-000000000003'::uuid, :'jc_conversation_id'::uuid, 'd0000000-0000-0000-0000-00000000000a', 'Unrelated conversation message.');
reset role;
reset request.jwt.claim.sub;

-- K <-> L: used only for the "messages before membership" scenario below.
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000b';
select public.create_direct_conversation('d0000000-0000-0000-0000-00000000000c'::uuid) as kl_conversation_id \gset
insert into public.messages (id, conversation_id, sender_id, body)
  values ('e1000000-0000-0000-0000-000000000004'::uuid, :'kl_conversation_id'::uuid, 'd0000000-0000-0000-0000-00000000000b', 'Kara to Leo, before Leo (re)joins.');
reset role;
reset request.jwt.claim.sub;

-- ---- First-use / no-state contract, before anyone ever marks anything ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000009';
select results_eq(
  format($$select count(*)::bigint from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array[0::bigint], 'no message_read_state row exists yet for Ivy — first-use is row absence, not a null-valued row'
);
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 2::bigint)$$, :'hi_conversation_id'),
  'first-use contract: with no read-state row at all, everything sent since joining counts as unread (both of Henry''s messages, for Ivy)'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Sender's own messages are never unread to the sender ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000008';
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 0::bigint)$$, :'hi_conversation_id'),
  'Henry (the sender of both messages) has zero unread in his own conversation'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Unauthenticated mark-read rejected ----
set local role anon;
select throws_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid)$$, :'hi_conversation_id'),
  '42501', null, 'anonymous cannot call mark_conversation_read'
);
reset role;

-- ---- Non-member mark-read rejected ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000a';
select throws_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid)$$, :'hi_conversation_id'),
  'P0001', 'mark_conversation_read: not a member of this conversation',
  'a non-member (Judy) cannot mark a conversation she does not belong to as read'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Nonexistent message rejected ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000008';
select throws_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'ffffffff-0000-0000-0000-000000000099'::uuid)$$, :'hi_conversation_id'),
  'P0001', 'mark_conversation_read: message not found in this conversation',
  'a nonexistent message id is rejected'
);
reset role;
reset request.jwt.claim.sub;

-- ---- A cursor from a different conversation is rejected identically to a
-- nonexistent one — never distinguishable, and never confirms the other
-- conversation's message to a real member of this one. ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000008';
select throws_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000003'::uuid)$$, :'hi_conversation_id'),
  'P0001', 'mark_conversation_read: message not found in this conversation',
  'a message belonging to a different conversation (jc_conversation_id) is rejected the same way as a nonexistent one'
);
reset role;
reset request.jwt.claim.sub;

-- ---- The complete three-column cursor FK proves the stored timestamp
-- against the real message row, not just the id: a genuine
-- conversation_id/message_id pair with a falsified
-- last_read_message_created_at is rejected outright, never silently
-- accepted or corrected. Run as the connecting superuser role (bypasses
-- grants, exactly like every other unrestricted verification query in this
-- file — see the Role discipline note above) so this proves the database
-- constraint itself, independent of the RPC's own (already-correct)
-- lookup. ----
select throws_ok(
  format($$insert into public.message_read_state
      (conversation_id, user_id, last_read_message_id, last_read_message_created_at)
    values (%L::uuid, 'd0000000-0000-0000-0000-00000000000a'::uuid,
      'e1000000-0000-0000-0000-000000000003'::uuid, '2000-01-01T00:00:00+00'::timestamptz)$$,
    :'jc_conversation_id'),
  '23503', null,
  'a read-state row with a genuine conversation_id and message_id but a falsified last_read_message_created_at is rejected by message_read_state_cursor_fk'
);

-- ---- The same FK also rejects a cursor whose id and timestamp are both
-- entirely real — but for a different conversation — proving the check is
-- against the exact (conversation_id, created_at, id) tuple, not merely
-- that the timestamp happens to match some message somewhere ----
select throws_ok(
  format($$insert into public.message_read_state
      (conversation_id, user_id, last_read_message_id, last_read_message_created_at)
    values (%L::uuid, 'd0000000-0000-0000-0000-000000000008'::uuid,
      'e1000000-0000-0000-0000-000000000003'::uuid,
      (select created_at from public.messages where id = 'e1000000-0000-0000-0000-000000000003'::uuid))$$,
    :'hi_conversation_id'),
  '23503', null,
  'a read-state row whose message id/timestamp genuinely belong to a different conversation (jc_conversation_id) is rejected when claimed under hi_conversation_id'
);

-- ---- A real member can mark a message in their own conversation ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000009';
select lives_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid)$$, :'hi_conversation_id'),
  'Ivy, a real member, can mark the first message read'
);
select results_eq(
  format($$select last_read_message_id from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array['e1000000-0000-0000-0000-000000000001'::uuid], 'Ivy''s stored cursor is now message one'
);
select results_eq(
  format($$select rs.last_read_message_created_at = m.created_at
    from public.message_read_state rs, public.messages m
    where rs.conversation_id = %L::uuid and rs.user_id = 'd0000000-0000-0000-0000-000000000009'::uuid
      and m.id = 'e1000000-0000-0000-0000-000000000001'::uuid$$, :'hi_conversation_id'),
  array[true],
  'mark_conversation_read stores message one''s actual confirmed created_at — the RPC has no caller-suppliable timestamp parameter at all'
);
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 1::bigint)$$, :'hi_conversation_id'),
  'after marking message one read, message two (newer, still unread) is the only one counted — messages at/before the cursor are not counted'
);

-- ---- A newer cursor advances the stored state ----
select lives_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000002'::uuid)$$, :'hi_conversation_id'),
  'Ivy marks the newer message two as read'
);
select results_eq(
  format($$select last_read_message_id from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array['e1000000-0000-0000-0000-000000000002'::uuid], 'Ivy''s cursor advanced to message two'
);
select results_eq(
  format($$select rs.last_read_message_created_at = m.created_at
    from public.message_read_state rs, public.messages m
    where rs.conversation_id = %L::uuid and rs.user_id = 'd0000000-0000-0000-0000-000000000009'::uuid
      and m.id = 'e1000000-0000-0000-0000-000000000002'::uuid$$, :'hi_conversation_id'),
  array[true],
  'the advanced cursor also stores message two''s actual confirmed created_at, not a value carried over or derived any other way'
);
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 0::bigint)$$, :'hi_conversation_id'),
  'nothing remains unread for Ivy once she has read the newest message'
);

-- ---- An older cursor arriving after a newer one is a safe no-op — the
-- cursor never moves backwards ----
select lives_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid)$$, :'hi_conversation_id'),
  're-marking the older message one (after message two was already marked) does not error'
);
select results_eq(
  format($$select last_read_message_id from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array['e1000000-0000-0000-0000-000000000002'::uuid],
  'Ivy''s cursor is still message two — the older resubmission never moved it backwards'
);

-- ---- An equal cursor is idempotent ----
select lives_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000002'::uuid)$$, :'hi_conversation_id'),
  're-marking the same already-current message two does not error'
);
select results_eq(
  format($$select last_read_message_id from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array['e1000000-0000-0000-0000-000000000002'::uuid],
  'Ivy''s cursor is unchanged — marking the identical already-current message is a safe no-op'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Genuine two-session concurrency (the same message marked repeatedly,
-- an older request literally racing a newer one, two tabs marking different
-- messages at once) cannot be reproduced inside this file's single
-- transaction — every call above necessarily runs sequentially. What *is*
-- provable here, directly, is the exact predicate mark_conversation_read's
-- `on conflict ... do update ... where (excluded.last_read_message_created_at,
-- excluded.last_read_message_id) > (message_read_state.last_read_message_created_at,
-- message_read_state.last_read_message_id)` relies on: that Postgres's own
-- row-constructor comparison orders message two strictly after message one,
-- and never the reverse, for the exact two rows every sequential test above
-- already exercised. Because ON CONFLICT DO UPDATE takes the row's lock
-- before evaluating that WHERE clause, any two real concurrent callers for
-- the same (conversation_id, user_id) serialize on this exact comparison —
-- the second to commit re-evaluates it against the first's already-committed
-- row — so this predicate being correct is what makes the sequential
-- evidence above generalize to true concurrent races, not just to the
-- ordering this transaction happened to run them in.
select results_eq(
  $$select (m2.created_at, m2.id) > (m1.created_at, m1.id)
    from public.messages m1, public.messages m2
    where m1.id = 'e1000000-0000-0000-0000-000000000001'::uuid
      and m2.id = 'e1000000-0000-0000-0000-000000000002'::uuid$$,
  array[true],
  'the monotonicity predicate correctly orders message two as strictly newer than message one'
);
select results_eq(
  $$select (m1.created_at, m1.id) > (m2.created_at, m2.id)
    from public.messages m1, public.messages m2
    where m1.id = 'e1000000-0000-0000-0000-000000000001'::uuid
      and m2.id = 'e1000000-0000-0000-0000-000000000002'::uuid$$,
  array[false],
  'and never the reverse — message one is never newer than message two'
);

-- ---- The caller can only ever write their own row — Henry (the other real
-- member) calling mark_conversation_read never touches Ivy's row, and ends
-- up with an independent row of his own ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000008';
select lives_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000002'::uuid)$$, :'hi_conversation_id'),
  'Henry (sender of both messages) may also call mark_conversation_read for his own conversation'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000009';
select results_eq(
  format($$select last_read_message_id from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array['e1000000-0000-0000-0000-000000000002'::uuid],
  'Ivy''s own row is untouched by Henry''s call — there is no parameter through which a caller can ever write another user''s state'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000008';
select results_eq(
  format($$select last_read_message_id from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000008'::uuid$$, :'hi_conversation_id'),
  array['e1000000-0000-0000-0000-000000000002'::uuid],
  'Henry has his own independent read-state row, separate from Ivy''s'
);

-- ---- One member cannot read or infer another member's cursor ----
select results_eq(
  format($$select count(*)::bigint from public.message_read_state
    where conversation_id = %L::uuid and user_id = 'd0000000-0000-0000-0000-000000000009'::uuid$$, :'hi_conversation_id'),
  array[0::bigint], 'Henry cannot select Ivy''s read-state row at all — RLS scopes select to the owner only'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Non-members receive no unread data for conversations they don't
-- belong to (Judy belongs only to jc_conversation_id) ----
set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000a';
select results_eq(
  format($$select count(*)::bigint from public.get_unread_message_counts()
    where conversation_id in (%L::uuid, %L::uuid)$$, :'hi_conversation_id', :'kl_conversation_id'),
  array[0::bigint], 'Judy (a non-member of both) gets no unread data for hi_conversation_id or kl_conversation_id'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Blocked status does not fabricate read access or bypass membership:
-- reusing the already-blocked Frank/Grace pair and fg_conversation_id from
-- the Slice A section above. A message is inserted directly as the
-- unrestricted connecting role (the same fixture-setup convention used
-- throughout this file) rather than through Grace's own now-blocked send
-- path, purely so there is something real for the still-genuine membership
-- to read. ----
insert into public.messages (id, conversation_id, sender_id, body)
  values ('e1000000-0000-0000-0000-000000000005'::uuid, :'fg_conversation_id'::uuid, 'd0000000-0000-0000-0000-000000000007', 'Grace to Frank, after the block.');

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-000000000006';
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 1::bigint)$$, :'fg_conversation_id'),
  'the block between Frank and Grace does not hide Frank''s genuinely unread message — membership, not block status, governs read access'
);
select lives_ok(
  format($$select public.mark_conversation_read(%L::uuid, 'e1000000-0000-0000-0000-000000000005'::uuid)$$, :'fg_conversation_id'),
  'Frank, though blocked from sending, can still mark his own conversation as read — the block never revokes his membership'
);
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 0::bigint)$$, :'fg_conversation_id'),
  'and the count correctly drops to zero afterward, identical to an unblocked conversation'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Messages predating the caller's membership are never counted, even
-- though the message itself is otherwise unread — simulated by moving
-- Leo's own joined_at after Kara's message, since no membership path in
-- this schema currently allows joining a conversation after messages
-- already exist; this defends a future membership model where that becomes
-- possible ----
update public.conversation_members
set joined_at = now() + interval '1 hour'
where conversation_id = :'kl_conversation_id'::uuid and user_id = 'd0000000-0000-0000-0000-00000000000c'::uuid;

set local role authenticated;
set local request.jwt.claim.sub to 'd0000000-0000-0000-0000-00000000000c';
select set_eq(
  $$select conversation_id, unread_count from public.get_unread_message_counts()$$,
  format($$values (%L::uuid, 0::bigint)$$, :'kl_conversation_id'),
  'Kara''s message, sent before Leo''s (adjusted) membership began, is never counted as unread for Leo'
);
reset role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
