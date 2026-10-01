begin;

create extension if not exists pgtap with schema extensions;
select plan(48);

-- V1 launch gate: 20261001060000_v1_smc_team_and_account_deletion.sql
-- Fixtures run as the connecting superuser; every authorization-sensitive
-- call runs under `set local role` (+ request.jwt.claim.sub), exactly as
-- PostgREST does per request.

-- ==========================================================================
-- Fixtures
-- ==========================================================================
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('e1000000-0000-0000-0000-000000000001', 'v1-impostor@fixture.test', jsonb_build_object('display_name', 'Impostor', 'account_type', 'professional', 'professional_category', 'smc_team'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000002', 'v1-pro@fixture.test', jsonb_build_object('display_name', 'Pro Fixture', 'account_type', 'professional', 'professional_category', 'installer'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000003', 'v1-staff@fixture.test', jsonb_build_object('display_name', 'Staff Fixture', 'account_type', 'professional', 'professional_category', 'installer'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000004', 'v1-leaver@fixture.test', jsonb_build_object('display_name', 'Leaver Fixture', 'account_type', 'professional', 'professional_category', 'stone_fabricator'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000005', 'v1-friend@fixture.test', jsonb_build_object('display_name', 'Friend Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000006', 'v1-later@fixture.test', jsonb_build_object('display_name', 'Later Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000007', 'v1-redact@fixture.test', jsonb_build_object('display_name', 'Redact Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'x', now(), now(), now());

-- ==========================================================================
-- Part 1 — SMC Team is staff-assigned only
-- ==========================================================================
select is(
  (select category::text from public.professional_profiles where user_id = 'e1000000-0000-0000-0000-000000000001'),
  'other',
  'sign-up metadata asking for smc_team is treated as an unknown value (other)'
);

select has_trigger('public', 'professional_profiles', 'professional_profiles_smc_team_staff_only',
  'the staff-only SMC Team trigger exists');

set local role authenticated;
set local request.jwt.claim.sub to 'e1000000-0000-0000-0000-000000000002';
select throws_ok(
  $$update public.professional_profiles set category = 'smc_team' where user_id = 'e1000000-0000-0000-0000-000000000002'$$,
  '42501', 'The SMC Team category is assigned by SMC staff only',
  'a professional cannot switch themselves to SMC Team'
);
select lives_ok(
  $$update public.professional_profiles set category = 'contractor' where user_id = 'e1000000-0000-0000-0000-000000000002'$$,
  'a professional can still change to any other category'
);
reset role;

set local role service_role;
select lives_ok(
  $$update public.professional_profiles set category = 'smc_team' where user_id = 'e1000000-0000-0000-0000-000000000003'$$,
  'the service role (staff/server path) can assign SMC Team'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to 'e1000000-0000-0000-0000-000000000003';
select lives_ok(
  $$update public.professional_profiles set company_name = 'SMC' where user_id = 'e1000000-0000-0000-0000-000000000003'$$,
  'a staff-assigned SMC Team member can still edit their other details'
);
reset role;
select is(
  (select category::text from public.professional_profiles where user_id = 'e1000000-0000-0000-0000-000000000003'),
  'smc_team', 'the staff-assigned category is unchanged by that edit'
);

-- ==========================================================================
-- Part 2 — Account deletion: structure and grants
-- ==========================================================================
select has_table('private', 'account_deletion_policy', 'the deletion policy table exists in the private schema');
select is((select count(*)::int from private.account_deletion_policy), 1, 'exactly one policy row');
select is((select cancellation_window from private.account_deletion_policy), interval '14 days', 'default cancellation window is 14 days (owner-configurable)');
select is((select reported_message_handling from private.account_deletion_policy), 'retain', 'default reported-message handling is retain (owner/legal-configurable)');
select ok(not has_table_privilege('authenticated', 'private.account_deletion_policy', 'select'), 'members cannot read the policy table');

select policies_are('public', 'account_deletion_requests', array['account_deletion_owner_read'],
  'only the owner read policy remains');
select ok(not has_table_privilege('authenticated', 'public.account_deletion_requests', 'insert'), 'no direct insert');
select ok(not has_column_privilege('authenticated', 'public.account_deletion_requests', 'cancellation_requested_at', 'update'), 'no direct cancellation update');

select ok(not has_function_privilege('anon', 'public.request_account_deletion()', 'execute'), 'anon cannot request deletion');
select ok(not has_function_privilege('anon', 'public.cancel_account_deletion()', 'execute'), 'anon cannot cancel deletion');
select ok(has_function_privilege('authenticated', 'public.request_account_deletion()', 'execute'), 'members can request deletion');
select ok(not has_function_privilege('authenticated', 'public.process_due_account_deletions(integer)', 'execute'), 'members cannot run deletion processing');
select ok(not has_function_privilege('authenticated', 'public.mark_account_deletion_identity_removed(uuid)', 'execute'), 'members cannot mark identity removal');
select ok(has_function_privilege('service_role', 'public.process_due_account_deletions(integer)', 'execute'), 'the service role can run deletion processing');

-- ==========================================================================
-- Request / cancel
-- ==========================================================================
set local role authenticated;
set local request.jwt.claim.sub to 'e1000000-0000-0000-0000-000000000006';
select throws_ok(
  $$insert into public.account_deletion_requests (user_id) values ('e1000000-0000-0000-0000-000000000006')$$,
  '42501', null, 'a direct insert is refused'
);
create temporary table later_first on commit drop as select * from public.request_account_deletion();
select is((select status::text from later_first), 'requested', 'a request starts as requested');
select ok(
  (select scheduled_for between now() + interval '14 days' - interval '1 minute' and now() + interval '14 days' + interval '1 minute' from later_first),
  'it is scheduled for now + the cancellation window'
);
select is((select id from public.request_account_deletion()), (select id from later_first), 'requesting again returns the same active request');
select is((select status::text from public.cancel_account_deletion()), 'cancelled', 'the member can cancel within the window');
select throws_ok($$select * from public.cancel_account_deletion()$$, 'P0002', null, 'there is nothing left to cancel');
select isnt((select id from public.request_account_deletion()), (select id from later_first), 'after cancelling, a new request can be made');
reset role;

-- The new request's window has passed: cancellation is no longer possible.
update public.account_deletion_requests set scheduled_for = now() - interval '1 second'
where user_id = 'e1000000-0000-0000-0000-000000000006' and status = 'requested';
set local role authenticated;
set local request.jwt.claim.sub to 'e1000000-0000-0000-0000-000000000006';
select throws_ok($$select * from public.cancel_account_deletion()$$, 'P0002', null, 'cancellation is refused once the window has passed');
reset role;
set local role anon;
select throws_ok($$select * from public.request_account_deletion()$$, '42501', null, 'anon is refused at the grant');
reset role;

-- ==========================================================================
-- Processing (anonymisation in place)
-- ==========================================================================
-- Leaver (…04) has a profile, professional details, a post, a follow, a
-- conversation with Friend (…05) holding one reported and one ordinary
-- message, and a staff role. Friend has a post that Leaver commented on.
insert into public.posts (id, author_id, body, visibility) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004', 'Leaver post', 'public'),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000005', 'Friend post', 'public');
insert into public.comments (post_id, author_id, body) values
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000004', 'Leaver comment');
insert into public.follows (follower_id, followee_id) values ('e1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000004');
insert into public.conversations (id, kind, direct_member_low, direct_member_high) values
  ('e3000000-0000-0000-0000-000000000001', 'direct', 'e1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000005');
insert into public.conversation_members (conversation_id, user_id) values
  ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004'),
  ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005');
insert into public.messages (id, conversation_id, sender_id, body) values
  ('e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004', 'Reported text'),
  ('e4000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004', 'Ordinary text'),
  ('e4000000-0000-0000-0000-000000000003', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005', 'Friend text');
insert into public.reports (reporter_id, reported_user_id, target_kind, message_id, conversation_id, category) values
  ('e1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000004', 'message', 'e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'spam');
insert into public.user_roles (user_id, role, assignment_reason, assigned_by) values
  ('e1000000-0000-0000-0000-000000000004', 'moderator', 'fixture', 'e1000000-0000-0000-0000-000000000005');
insert into public.account_deletion_requests (user_id, scheduled_for) values
  ('e1000000-0000-0000-0000-000000000004', now() - interval '1 minute'),
  ('e1000000-0000-0000-0000-000000000005', now() + interval '10 days');

set local role service_role;
create temporary table processed on commit drop as select * from public.process_due_account_deletions(50);
reset role;

select set_eq(
  $$select user_id from processed$$,
  array['e1000000-0000-0000-0000-000000000004'::uuid, 'e1000000-0000-0000-0000-000000000006'::uuid],
  'exactly the due requests are processed; a request still inside its window is not'
);
select is(
  (select status::text from public.account_deletion_requests where user_id = 'e1000000-0000-0000-0000-000000000005'),
  'requested', 'the not-yet-due request is untouched'
);
select results_eq(
  $$select display_name, username, bio, visibility::text, onboarding_completed, account_type::text
    from public.profiles where id = 'e1000000-0000-0000-0000-000000000004'$$,
  $$values ('Deleted member'::text, null::text, null::text, 'private'::text, false, 'customer'::text)$$,
  'the profile becomes a hidden, de-identified tombstone'
);
select is((select count(*)::int from public.professional_profiles where user_id = 'e1000000-0000-0000-0000-000000000004'), 0, 'professional details are deleted');
select is((select count(*)::int from public.posts where author_id = 'e1000000-0000-0000-0000-000000000004'), 0, 'their posts are deleted');
select is((select count(*)::int from public.comments where author_id = 'e1000000-0000-0000-0000-000000000004'), 0, 'their comments are deleted');
select is((select count(*)::int from public.follows where followee_id = 'e1000000-0000-0000-0000-000000000004'), 0, 'follows involving them are deleted');
select is((select body from public.messages where id = 'e4000000-0000-0000-0000-000000000002'), 'This message was deleted.', 'an unreported message is redacted');
select is((select body from public.messages where id = 'e4000000-0000-0000-0000-000000000001'), 'Reported text', 'with policy retain, a reported message keeps its text as safety evidence');
select is((select body from public.messages where id = 'e4000000-0000-0000-0000-000000000003'), 'Friend text', 'the other member''s messages are untouched');
select is((select count(*)::int from public.conversation_members where user_id = 'e1000000-0000-0000-0000-000000000004'), 0, 'they leave every conversation');
select is((select count(*)::int from public.user_roles where user_id = 'e1000000-0000-0000-0000-000000000004' and revoked_at is null), 0, 'every staff role is revoked');
select is((select count(*)::int from public.reports where reported_user_id = 'e1000000-0000-0000-0000-000000000004'), 1, 'the safety report survives, pointing at the tombstone');

-- Policy 'redact': reported messages lose their text too.
update private.account_deletion_policy set reported_message_handling = 'redact';
insert into public.conversation_members (conversation_id, user_id) values ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000007');
insert into public.messages (id, conversation_id, sender_id, body) values
  ('e4000000-0000-0000-0000-000000000004', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000007', 'Reported under redact');
insert into public.reports (reporter_id, reported_user_id, target_kind, message_id, conversation_id, category) values
  ('e1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000007', 'message', 'e4000000-0000-0000-0000-000000000004', 'e3000000-0000-0000-0000-000000000001', 'spam');
insert into public.account_deletion_requests (user_id, scheduled_for) values ('e1000000-0000-0000-0000-000000000007', now() - interval '1 minute');
set local role service_role;
select lives_ok($$select * from public.process_due_account_deletions(50)$$, 'processing runs under the redact policy');
reset role;
select is((select body from public.messages where id = 'e4000000-0000-0000-0000-000000000004'), 'This message was deleted.', 'with policy redact, reported messages are redacted too');

-- Identity-removal bookkeeping for the server job.
set local role service_role;
select ok(
  'e1000000-0000-0000-0000-000000000004'::uuid in (select user_id from public.list_account_deletions_pending_identity_removal(50)),
  'a completed request awaits identity removal'
);
select lives_ok(
  format($$select public.mark_account_deletion_identity_removed(%L)$$,
    (select id from public.account_deletion_requests where user_id = 'e1000000-0000-0000-0000-000000000004')),
  'the server job can mark identity removal'
);
select throws_ok(
  format($$select public.mark_account_deletion_identity_removed(%L)$$,
    (select id from public.account_deletion_requests where user_id = 'e1000000-0000-0000-0000-000000000004')),
  'P0002', null, 'marking twice is refused'
);
reset role;

select * from finish();
rollback;
