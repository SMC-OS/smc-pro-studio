begin;

create extension if not exists pgtap with schema extensions;
select plan(33);

-- Function exists with the expected signature.
select has_function(
  'public', 'search_public_professionals',
  array['text', 'public.professional_category', 'text', 'text', 'uuid', 'integer'],
  'search_public_professionals exists with the expected signature'
);

-- SECURITY INVOKER, never DEFINER.
select results_eq(
  $$select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'search_public_professionals'$$,
  array[false],
  'search_public_professionals runs as SECURITY INVOKER, not DEFINER'
);

-- Fixed, empty search_path (matches this repo's private.set_updated_at convention).
select results_eq(
  $$select exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proconfig) as cfg(setting)
      where n.nspname = 'public' and p.proname = 'search_public_professionals'
        and cfg.setting = 'search_path=""'
    )$$,
  array[true],
  'search_public_professionals has a fixed empty search_path'
);

-- Execute privileges: anon and authenticated only, never PUBLIC.
select function_privs_are(
  'public', 'search_public_professionals',
  array['text', 'public.professional_category', 'text', 'text', 'uuid', 'integer'],
  'anon', array['EXECUTE'],
  'anon may call search_public_professionals'
);
select function_privs_are(
  'public', 'search_public_professionals',
  array['text', 'public.professional_category', 'text', 'text', 'uuid', 'integer'],
  'authenticated', array['EXECUTE'],
  'authenticated may call search_public_professionals'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'search_public_professionals'
      and grantee = 'PUBLIC'$$,
  array[0::bigint],
  'search_public_professionals grants no execute privilege to PUBLIC'
);

-- pg_trgm is installed.
select has_extension('pg_trgm', 'pg_trgm extension is installed');

-- Required indexes exist (exactly five, per the approved minimum scope —
-- the optional sixth onboarding-predicate index was deliberately not added).
select has_index('public', 'profiles', 'profiles_display_name_trgm_idx',
  'trigram index on profiles.display_name exists');
select has_index('public', 'professional_profiles', 'professional_profiles_company_name_trgm_idx',
  'trigram index on professional_profiles.company_name exists');
select has_index('public', 'professional_profiles', 'professional_profiles_service_area_trgm_idx',
  'trigram index on professional_profiles.service_area exists');
select has_index('public', 'professional_profiles', 'professional_profiles_category_idx',
  'btree index on professional_profiles.category exists');
select has_index('public', 'profiles', 'profiles_lower_display_name_id_idx',
  'expression index on lower(profiles.display_name), id exists');

-- ==========================================================================
-- Behavioural coverage (Slice E gate).
--
-- Fixtures are inserted into auth.users (never profiles/professional_profiles
-- directly), so private.handle_new_auth_user() — the same trigger every real
-- signup goes through — is what actually creates each fixture's
-- public.profiles/public.professional_profiles row. This whole file already
-- runs inside one outer BEGIN/ROLLBACK (see top/bottom), so every fixture
-- inserted below is rolled back with it; nothing here is ever persisted and
-- no production data is read or written.
--
-- Role discipline: fixture setup (the auth.users inserts and the
-- profiles/professional_profiles updates that shape each scenario) always
-- runs as the connecting role — postgres, the superuser `supabase test db`
-- connects as — which bypasses RLS by design, exactly like the rest of this
-- file's DML. Every actual call to search_public_professionals() below runs
-- under `set local role anon` (or, once, `authenticated` with a real
-- `request.jwt.claim.sub`), which is the same GUC PostgREST itself sets per
-- request — RLS is genuinely enforced for those calls, not bypassed. Each
-- such block closes with `reset role` (and `reset request.jwt.claim.sub`
-- where it was set) before the next fixture-setup section runs as postgres
-- again.
-- ==========================================================================

-- ---- Requirement 1 & 2: onboarding_completed gate ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-000000000001', 'req1-onboard@fixture.test',
  jsonb_build_object('account_type', 'professional', 'display_name', 'Imogen Onboarding Fixture', 'professional_category', 'architect'),
  '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()
);
-- private.handle_new_auth_user() already created profiles/professional_profiles
-- with the real signup defaults: visibility='public', onboarding_completed=false.

set local role anon;
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Onboarding Fixture')$$,
  array[]::uuid[],
  'Requirement 1: a public professional with onboarding_completed=false is excluded'
);
reset role;

update public.profiles set onboarding_completed = true where id = 'a0000000-0000-0000-0000-000000000001';

set local role anon;
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Onboarding Fixture')$$,
  array['a0000000-0000-0000-0000-000000000001'::uuid],
  'Requirement 2: the same professional becomes discoverable once onboarding_completed=true (as anon)'
);
reset role;

-- Same call again as a genuinely different signed-in identity — proves the
-- result is identical for anon and authenticated, since
-- profiles_public_read / professional_profiles_public_read grant both
-- roles the same predicate and the function adds no owner-only logic.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-00000000000f', 'req2-viewer@fixture.test',
  jsonb_build_object('display_name', 'Victor Viewer'),
  '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()
);

set local role authenticated;
set local request.jwt.claim.sub to 'a0000000-0000-0000-0000-00000000000f';
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Onboarding Fixture')$$,
  array['a0000000-0000-0000-0000-000000000001'::uuid],
  'Requirement 2: the same result is visible to a different signed-in user (as authenticated)'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Requirement 3: a private professional remains excluded (as anon) ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-000000000002', 'req3-private@fixture.test',
  jsonb_build_object('account_type', 'professional', 'display_name', 'Priya Private Fixture', 'professional_category', 'interior_designer'),
  '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()
);
update public.profiles set onboarding_completed = true, visibility = 'private'
  where id = 'a0000000-0000-0000-0000-000000000002';

set local role anon;
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Private Fixture')$$,
  array[]::uuid[],
  'Requirement 3: a private professional remains excluded when called as anon'
);
reset role;

-- ---- Requirement 4: literal substring match across all three columns ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a0000000-0000-0000-0000-000000000003', 'req4-name@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Zendra Namematch Quarrystone', 'professional_category', 'stone_fabricator'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000004', 'req4-company@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Oliver Bennett', 'professional_category', 'stone_supplier'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000005', 'req4-area@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Priti Shah', 'professional_category', 'installer'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

update public.profiles set onboarding_completed = true
  where id in ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005');
update public.professional_profiles set company_name = 'Companymatch Graniteworks Ltd'
  where user_id = 'a0000000-0000-0000-0000-000000000004';
update public.professional_profiles set service_area = 'Areamatch Greater Manchester'
  where user_id = 'a0000000-0000-0000-0000-000000000005';

set local role anon;
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Namematch Quarrystone')$$,
  array['a0000000-0000-0000-0000-000000000003'::uuid],
  'Requirement 4: search matches a literal substring in profiles.display_name'
);
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Companymatch Graniteworks')$$,
  array['a0000000-0000-0000-0000-000000000004'::uuid],
  'Requirement 4: search matches a literal substring in professional_profiles.company_name'
);
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Areamatch Greater Manchester')$$,
  array['a0000000-0000-0000-0000-000000000005'::uuid],
  'Requirement 4: search matches a literal substring in professional_profiles.service_area'
);
reset role;

-- ---- Requirement 5: %, _ and \ in user input are treated literally ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-000000000006', 'req5-wildcard@fixture.test',
  jsonb_build_object('account_type', 'professional', 'display_name', 'Percy_100%Stone\Works', 'professional_category', 'contractor'),
  '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()
);
update public.profiles set onboarding_completed = true where id = 'a0000000-0000-0000-0000-000000000006';

-- Every fixture inserted above deliberately contains no literal %, _ or \
-- character in display_name/company_name/service_area, so each query below
-- is a genuine discriminator: if the query text were (mis)treated as an
-- ILIKE pattern instead of literal text, '_' and '%' alone would each match
-- virtually every fixture row above (any-single-char / any-sequence
-- wildcards), not just this one.
set local role anon;
select results_eq(
  $$select user_id from public.search_public_professionals(q := '_')$$,
  array['a0000000-0000-0000-0000-000000000006'::uuid],
  'Requirement 5: a literal underscore in the query is not treated as a single-char wildcard'
);
select results_eq(
  $$select user_id from public.search_public_professionals(q := '%')$$,
  array['a0000000-0000-0000-0000-000000000006'::uuid],
  'Requirement 5: a literal percent sign in the query is not treated as a multi-char wildcard'
);
select results_eq(
  $$select user_id from public.search_public_professionals(q := '\')$$,
  array['a0000000-0000-0000-0000-000000000006'::uuid],
  'Requirement 5: a literal backslash in the query is not treated as an escape-control character'
);
reset role;

-- ---- Requirement 6: category and service-area filters narrow correctly ----
-- category values ('developer', 'construction_professional') and the
-- 'Bristol'/'Leeds' service areas are not reused by any other fixture in
-- this file, so these filter calls (deliberately run with no q) can't pick
-- up cross-contamination from fixtures inserted earlier or later.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a0000000-0000-0000-0000-000000000007', 'req6-a@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Freya Category Filter', 'professional_category', 'developer'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000008', 'req6-b@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Gareth Category Filter', 'professional_category', 'construction_professional'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000009', 'req6-c@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Priya Category Filter', 'professional_category', 'developer'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

update public.profiles set onboarding_completed = true
  where id in ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000009');
update public.professional_profiles set service_area = 'Bristol Filter Zone'
  where user_id in ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008');
update public.professional_profiles set service_area = 'Leeds Filter Zone'
  where user_id = 'a0000000-0000-0000-0000-000000000009';

set local role anon;
select set_eq(
  $$select user_id from public.search_public_professionals(category_filter := 'developer'::public.professional_category)$$,
  array['a0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000009'::uuid],
  'Requirement 6: category_filter narrows to matching professionals only'
);
select set_eq(
  $$select user_id from public.search_public_professionals(service_area_filter := 'Bristol')$$,
  array['a0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000008'::uuid],
  'Requirement 6: service_area_filter narrows to matching professionals only'
);
select results_eq(
  $$select user_id from public.search_public_professionals(
      category_filter := 'developer'::public.professional_category, service_area_filter := 'Bristol'
    )$$,
  array['a0000000-0000-0000-0000-000000000007'::uuid],
  'Requirement 6: category_filter and service_area_filter combine with AND, not OR'
);
reset role;

-- ---- Requirement 7: deterministic keyset pagination for a tied display_name ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a0000000-0000-0000-0000-00000000000a', 'req7-a@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Casey Stoneworth', 'professional_category', 'architect'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-00000000000b', 'req7-b@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'CASEY STONEWORTH', 'professional_category', 'architect'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

update public.profiles set onboarding_completed = true
  where id in ('a0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000b');

set local role anon;

-- Page 1: page_size=1 against exactly 2 real matches. The function's
-- one-row overfetch (limit + 1) means both rows come back from this single
-- call, in (lower(display_name), user_id) order — same lowercased name on
-- both, so the tiebreak is purely user_id ascending: ...a before ...b. This
-- also demonstrates Requirement 9's hasMore=true case (2 rows returned for
-- page_size=1 signals "there is a next page").
select results_eq(
  $$select user_id from public.search_public_professionals(q := 'Stoneworth', page_size := 1)$$,
  array['a0000000-0000-0000-0000-00000000000a'::uuid, 'a0000000-0000-0000-0000-00000000000b'::uuid],
  'Requirement 7/9: page_size=1 overfetches to 2 rows when 2 matches tie on display_name (user_id tiebreak)'
);

-- Page 2: the cursor is built the way the real client builds it — from row
-- 1 of page 1 (...a), never from the overfetched 2nd row. No duplication
-- of ...a, no omission of ...b.
select results_eq(
  $$select user_id from public.search_public_professionals(
      q := 'Stoneworth', page_size := 1,
      after_display_name := 'Casey Stoneworth', after_user_id := 'a0000000-0000-0000-0000-00000000000a'::uuid
    )$$,
  array['a0000000-0000-0000-0000-00000000000b'::uuid],
  'Requirement 7: the next page starts exactly at ...b — no duplicate of ...a, no gap'
);
reset role;

-- ---- Requirement 8: a partial cursor raises the intended safe error ----
set local role anon;
select throws_ok(
  $$select * from public.search_public_professionals(after_display_name := 'Someone', after_user_id := null)$$,
  'P0001',
  'search_public_professionals: after_display_name and after_user_id must both be null (first page) or both be provided (subsequent page)',
  'Requirement 8: a display_name-only cursor (missing user_id) raises the intended safe error'
);
select throws_ok(
  $$select * from public.search_public_professionals(after_display_name := null, after_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid)$$,
  'P0001',
  'search_public_professionals: after_display_name and after_user_id must both be null (first page) or both be provided (subsequent page)',
  'Requirement 8: a user_id-only cursor (missing display_name) raises the intended safe error'
);
reset role;

-- ---- Requirement 9: page_size is bounded; the overfetch drives accurate hasMore ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a0000000-0000-0000-0000-00000000000c', 'req9-a@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Bound One', 'professional_category', 'other'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-00000000000d', 'req9-b@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Bound Two', 'professional_category', 'other'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('a0000000-0000-0000-0000-00000000000e', 'req9-c@fixture.test',
   jsonb_build_object('account_type', 'professional', 'display_name', 'Bound Three', 'professional_category', 'other'),
   '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

update public.profiles set onboarding_completed = true
  where id in ('a0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-00000000000e');
update public.professional_profiles set service_area = 'Boundstest Region'
  where user_id in ('a0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-00000000000e');

set local role anon;

-- An oversized page_size does not error and does not return more than
-- actually match (3 real matches, not 1001 requested).
select results_eq(
  $$select count(*)::bigint from public.search_public_professionals(q := 'Boundstest', page_size := 1000)$$,
  array[3::bigint],
  'Requirement 9: an oversized page_size is handled safely and returns only the real matches'
);

-- page_size <= 0 clamps to a minimum of 1, so the +1 overfetch against 3
-- available matches returns exactly 2 rows.
select results_eq(
  $$select count(*)::bigint from public.search_public_professionals(q := 'Boundstest', page_size := 0)$$,
  array[2::bigint],
  'Requirement 9: page_size=0 clamps to the minimum of 1 (limit+1 overfetch = 2 of 3 matches)'
);
select results_eq(
  $$select count(*)::bigint from public.search_public_professionals(q := 'Boundstest', page_size := -5)$$,
  array[2::bigint],
  'Requirement 9: a negative page_size also clamps to the minimum of 1'
);

-- When page_size already covers every match, no phantom overfetch row is
-- fabricated — the caller can tell hasMore=false because the row count
-- returned is not page_size+1.
select results_eq(
  $$select count(*)::bigint from public.search_public_professionals(q := 'Boundstest', page_size := 5)$$,
  array[3::bigint],
  'Requirement 9: no phantom overfetch row when page_size already exceeds the available matches (hasMore=false)'
);
reset role;

select * from finish();
rollback;

-- NOT covered here (documented gap, not an oversight):
-- - The literal upper clamp of 50 (page_size := 1000 above proves the
--   function stays safe and returns only real matches, but proving the
--   count is capped at exactly 50 would need 51+ onboarded fixture rows —
--   deliberately not added just to pin one constant).
-- - Whether `anon`/`authenticated` have EXECUTE on the pgtap comparison
--   functions themselves (results_eq/set_eq/throws_ok) in this project's
--   actual local extension install — this is pgtap's own standard
--   PUBLIC-grant behavior and the same role-switch pattern Supabase's own
--   pgTAP testing docs use, but it has not been run against a live
--   database from this session (no local Postgres/Docker available here —
--   see AGENTS.md/tasks/todo.md). If `npm run test:db` reports a
--   permission-denied error inside any Requirement 1–9 assertion rather
--   than a real pass/fail, that is what to look at first.
