begin;

create extension if not exists pgtap with schema extensions;
select plan(61);

-- ==========================================================================
-- Phase 5 Slice B: secure staff catalogue publishing. Structural coverage
-- first (functions, security, grants, the new policy), then behavioural
-- coverage (role enforcement, validation, status transitions, public
-- visibility preserved, denial of non-staff/revoked access).
-- ==========================================================================

-- ---- Structural: private.is_active_catalogue_editor() ----

select has_function('private', 'is_active_catalogue_editor', array[]::text[], 'private.is_active_catalogue_editor() exists');
select results_eq(
  $$select prosecdef from pg_proc where proname = 'is_active_catalogue_editor' and pronamespace = 'private'::regnamespace$$,
  array[true], 'is_active_catalogue_editor is SECURITY DEFINER'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'private' and routine_name = 'is_active_catalogue_editor' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'is_active_catalogue_editor has no anon or PUBLIC execute grant'
);

-- ---- Structural: public.check_catalogue_editor_access() ----

select has_function('public', 'check_catalogue_editor_access', array[]::text[], 'public.check_catalogue_editor_access() exists');
select results_eq(
  $$select prosecdef from pg_proc where proname = 'check_catalogue_editor_access' and pronamespace = 'public'::regnamespace$$,
  array[true], 'check_catalogue_editor_access is SECURITY DEFINER (required — an INVOKER function referencing private.* would be inlined and fail for a caller lacking private schema USAGE)'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'check_catalogue_editor_access' and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'check_catalogue_editor_access has no anon or PUBLIC execute grant'
);

-- ---- Structural: the four mutation RPCs ----

select has_function('public', 'create_draft_material',
  array['text', 'text', 'material_category', 'text', 'text', '_text'], 'public.create_draft_material(...) exists with the exact signature');
select has_function('public', 'update_draft_material',
  array['uuid', 'text', 'text', 'material_category', 'text', 'text', '_text'], 'public.update_draft_material(...) exists with the exact signature');
select has_function('public', 'publish_material', array['uuid'], 'public.publish_material(uuid) exists');
select has_function('public', 'archive_material', array['uuid'], 'public.archive_material(uuid) exists');

select results_eq(
  $$select bool_and(prosecdef) from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('create_draft_material', 'update_draft_material', 'publish_material', 'archive_material')$$,
  array[true], 'all four mutation RPCs are SECURITY DEFINER'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('create_draft_material', 'update_draft_material', 'publish_material', 'archive_material')
      and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'none of the four mutation RPCs has any anon or PUBLIC execute grant'
);
-- Not "exactly one distinct grantee" — the moment any explicit GRANT/REVOKE
-- touches a function, Postgres materializes its ACL to include the owner's
-- own row alongside the explicit grant (no longer purely "default"), so the
-- owner legitimately appears as a second grantee here. What actually
-- matters — authenticated has execute, anon/PUBLIC do not (already proven
-- above) — is checked directly instead, one row per function, avoiding both
-- that pitfall and a results_eq comparison of the sql_identifier-typed
-- `grantee` column against a plain text array literal (the same class of
-- catalog-type collation ambiguity already documented in
-- materials_catalogue.test.sql / post_type.test.sql).
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('create_draft_material', 'update_draft_material', 'publish_material', 'archive_material')
      and grantee = 'authenticated'$$,
  array[4::bigint], 'all four mutation RPCs grant execute to authenticated, one row each'
);

-- ---- Structural: no new client write grant on public.materials ----

select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'materials'
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'neither anon nor authenticated has any table-level insert/update/delete on materials — unchanged by this slice'
);
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'materials'
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'neither anon nor authenticated has any column-level insert/update/delete on materials either'
);

-- ---- Structural: the new RLS policy ----

select policies_are('public', 'materials', array['materials_editor_read', 'materials_public_read'],
  'materials now exposes exactly two read policies — the historical public-read policy, untouched, plus this slice''s new editor-read policy');
select results_eq(
  $$select pg_get_expr(polqual, polrelid) ~ 'is_active_catalogue_editor'
    from pg_policy where polname = 'materials_editor_read'$$,
  array[true], 'materials_editor_read''s USING clause calls is_active_catalogue_editor()'
);
-- Two boolean/bigint checks rather than one text-array comparison — avoids
-- the same pg_catalog "name" collation ambiguity already worked around
-- above and in materials_catalogue.test.sql (comparing r.rolname inline
-- inside an exists()/where clause, never returning it as a results_eq
-- output column).
select results_eq(
  $$select count(*)::bigint from pg_policy p
    join pg_roles r on r.oid = any(p.polroles)
    where p.polname = 'materials_editor_read'$$,
  array[1::bigint], 'materials_editor_read applies to exactly one role'
);
select results_eq(
  $$select exists (
      select 1 from pg_policy p join pg_roles r on r.oid = any(p.polroles)
      where p.polname = 'materials_editor_read' and r.rolname = 'authenticated'
    )$$,
  array[true], 'that one role is authenticated, never anon'
);

-- ==========================================================================
-- Behavioural coverage.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('f0000000-0000-0000-0000-000000000001', 'mcat-alice@fixture.test', jsonb_build_object('display_name', 'Alice Catalogue Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f0000000-0000-0000-0000-000000000002', 'mcat-bob@fixture.test', jsonb_build_object('display_name', 'Bob Catalogue Editor Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f0000000-0000-0000-0000-000000000003', 'mcat-carol@fixture.test', jsonb_build_object('display_name', 'Carol Revoked Editor Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

-- Bob is an active catalogue editor; Alice has no special role at all.
insert into public.user_roles (user_id, role, assignment_reason)
values ('f0000000-0000-0000-0000-000000000002', 'catalogue_editor', 'materials_catalogue_publishing.test.sql fixture');

-- ---- anon: no execute grant on anything, proven directly ----

set local role anon;
select throws_ok(
  $$select public.check_catalogue_editor_access()$$,
  '42501', null, 'anon cannot call check_catalogue_editor_access — no execute grant'
);
select throws_ok(
  $$select * from public.create_draft_material('anon-attempt', 'Anon Attempt', 'quartz'::public.material_category)$$,
  '42501', null, 'anon cannot call create_draft_material — no execute grant'
);
select throws_ok(
  $$select * from public.update_draft_material(gen_random_uuid(), 'anon-attempt', 'Anon Attempt', 'quartz'::public.material_category)$$,
  '42501', null, 'anon cannot call update_draft_material — no execute grant'
);
select throws_ok(
  $$select * from public.publish_material(gen_random_uuid())$$,
  '42501', null, 'anon cannot call publish_material — no execute grant'
);
select throws_ok(
  $$select * from public.archive_material(gen_random_uuid())$$,
  '42501', null, 'anon cannot call archive_material — no execute grant'
);
reset role;

-- ---- authenticated, no session (auth.uid() is null) ----

set local role authenticated;
select throws_ok(
  $$select * from public.create_draft_material('no-session', 'No Session', 'quartz'::public.material_category)$$,
  'P0001', 'create_draft_material: authentication required',
  'authenticated role with no session is rejected by create_draft_material before any authorization or validation check'
);
select is(
  (select public.check_catalogue_editor_access()), false,
  'check_catalogue_editor_access() with no session returns false, not an error — auth.uid() is null, so the exists() check simply finds nothing'
);
reset role;

-- ---- Alice: authenticated, but not a catalogue editor ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select is((select public.check_catalogue_editor_access()), false, 'Alice, with no catalogue_editor role, is confirmed not an editor');
select throws_ok(
  $$select * from public.create_draft_material('alice-attempt', 'Alice Attempt', 'quartz'::public.material_category)$$,
  'P0001', 'create_draft_material: catalogue editor access required',
  'Alice cannot create a draft material'
);
select throws_ok(
  $$select * from public.publish_material(gen_random_uuid())$$,
  'P0001', 'publish_material: catalogue editor access required',
  'Alice cannot publish a material'
);
select throws_ok(
  $$select * from public.archive_material(gen_random_uuid())$$,
  'P0001', 'archive_material: catalogue editor access required',
  'Alice cannot archive a material'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Bob: an active catalogue editor ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000002';

select is((select public.check_catalogue_editor_access()), true, 'Bob, an active catalogue editor, is confirmed');

-- Validation, each checked against create_draft_material directly.
select throws_ok(
  $$select * from public.create_draft_material('Bad Slug', 'Bad Slug Material', 'quartz'::public.material_category)$$,
  'P0001', 'create_draft_material: slug must be lowercase letters, numbers, and single hyphens only',
  'a slug with a space or uppercase letters is rejected'
);
select throws_ok(
  format($$select * from public.create_draft_material(%L, 'Too Long Slug', 'quartz'::public.material_category)$$, repeat('a', 81)),
  'P0001', 'create_draft_material: slug must be 80 characters or fewer',
  'a slug over 80 characters is rejected'
);
select throws_ok(
  $$select * from public.create_draft_material('empty-name', '', 'quartz'::public.material_category)$$,
  'P0001', 'create_draft_material: name must be between 1 and 150 characters',
  'an empty name is rejected'
);
select throws_ok(
  format($$select * from public.create_draft_material('long-name', %L, 'quartz'::public.material_category)$$, repeat('x', 151)),
  'P0001', 'create_draft_material: name must be between 1 and 150 characters',
  'a name over 150 characters is rejected'
);
select throws_ok(
  format($$select * from public.create_draft_material('long-summary', 'Long Summary', 'quartz'::public.material_category, %L)$$, repeat('x', 241)),
  'P0001', 'create_draft_material: summary must be 240 characters or fewer',
  'a summary over 240 characters is rejected'
);
select throws_ok(
  format($$select * from public.create_draft_material('long-description', 'Long Description', 'quartz'::public.material_category, null, %L)$$, repeat('x', 4001)),
  'P0001', 'create_draft_material: description must be 4000 characters or fewer',
  'a description over 4000 characters is rejected'
);
select throws_ok(
  $$select * from public.create_draft_material('too-many-apps', 'Too Many Apps', 'quartz'::public.material_category, null, null,
    array['a','b','c','d','e','f','g','h','i','j','k','l','m'])$$,
  'P0001', 'create_draft_material: applications must be 12 items or fewer',
  'more than 12 applications is rejected'
);
select throws_ok(
  $$select * from public.create_draft_material('blank-app', 'Blank App', 'quartz'::public.material_category, null, null, array['  '])$$,
  'P0001', 'create_draft_material: applications entries cannot be blank',
  'a whitespace-only application entry is rejected'
);
select throws_ok(
  format($$select * from public.create_draft_material('long-app', 'Long App', 'quartz'::public.material_category, null, null, array[%L])$$, repeat('x', 61)),
  'P0001', 'create_draft_material: each application must be 60 characters or fewer',
  'an application entry over 60 characters is rejected'
);

-- A real, valid draft — always lands as status = draft regardless of what
-- was supplied (there is no status parameter at all).
select id as draft_id, slug, status::text as status from public.create_draft_material(
  'calacatta-quartz', 'Calacatta Quartz', 'quartz'::public.material_category,
  'A fixture summary.', 'A fixture description.', array['Kitchen Worktops']
) \gset

select is(:'status'::text, 'draft'::text, 'a freshly created material is always a draft, never any other status');

select throws_ok(
  $$select * from public.create_draft_material('calacatta-quartz', 'Duplicate Slug', 'granite'::public.material_category)$$,
  'P0001', 'create_draft_material: slug is already in use',
  'a duplicate slug is rejected with a clear message, not a raw constraint violation'
);

-- update_draft_material: succeeds while draft.
select id as updated_id, name, summary from public.update_draft_material(
  :'draft_id'::uuid, 'calacatta-quartz', 'Calacatta Quartz (Updated)', 'quartz'::public.material_category,
  'An updated fixture summary.', 'A fixture description.', array['Kitchen Worktops', 'Bathroom Vanities']
) \gset

select is(:'name'::text, 'Calacatta Quartz (Updated)'::text, 'update_draft_material genuinely updates the row while it is still a draft');

select throws_ok(
  $$select * from public.update_draft_material(gen_random_uuid(), 'nonexistent', 'Nonexistent', 'quartz'::public.material_category)$$,
  'P0001', 'update_draft_material: material not found',
  'updating a nonexistent id is rejected'
);

-- publish_material: fails without a summary.
select id as no_summary_id from public.create_draft_material(
  'no-summary-yet', 'No Summary Yet', 'granite'::public.material_category
) \gset
select throws_ok(
  format($$select * from public.publish_material(%L::uuid)$$, :'no_summary_id'),
  'P0001', 'publish_material: a summary is required before publishing',
  'a draft with no summary cannot be published'
);

-- publish_material: succeeds once a summary exists.
select id, status::text as status from public.publish_material(:'draft_id'::uuid) \gset
select is(:'status'::text, 'published'::text, 'publish_material transitions a complete draft to published');

select throws_ok(
  format($$select * from public.publish_material(%L::uuid)$$, :'draft_id'),
  'P0001', 'publish_material: only a draft material can be published',
  'publishing an already-published material is rejected'
);

-- update_draft_material can no longer touch a published material.
select throws_ok(
  format($$select * from public.update_draft_material(%L::uuid, 'calacatta-quartz-v2', 'Should Not Apply', 'quartz'::public.material_category)$$, :'draft_id'),
  'P0001', 'update_draft_material: only a draft material can be edited',
  'a published material can no longer be edited via update_draft_material'
);

-- archive_material: succeeds from published. Uses a second, separate
-- material (not draft_id/calacatta-quartz) so calacatta-quartz remains
-- published for the guest-visibility regression check further below.
select id as to_archive_id from public.create_draft_material(
  'polished-granite', 'Polished Granite', 'granite'::public.material_category, 'A fixture summary.'
) \gset
select status::text as prep_status from public.publish_material(:'to_archive_id'::uuid) \gset

select id, status::text as status from public.archive_material(:'to_archive_id'::uuid) \gset
select is(:'status'::text, 'archived'::text, 'archive_material transitions a published material to archived');

select throws_ok(
  format($$select * from public.archive_material(%L::uuid)$$, :'to_archive_id'),
  'P0001', 'archive_material: material is already archived',
  'archiving an already-archived material is rejected'
);

-- archive_material: also succeeds directly from draft (discarding an
-- unwanted draft without ever publishing it).
select id as discard_id, status::text as status from public.create_draft_material(
  'discarded-draft', 'Discarded Draft', 'marble'::public.material_category, 'A fixture summary.'
) \gset
select id, status::text as status from public.archive_material(:'discard_id'::uuid) \gset
select is(:'status'::text, 'archived'::text, 'archive_material can discard a draft directly, without ever publishing it');

-- Bob, an active editor, can see every status directly via plain select —
-- proving materials_editor_read itself, independent of the RPCs above.
select results_eq(
  $$select count(*)::bigint from public.materials where slug = 'no-summary-yet'$$,
  array[1::bigint], 'Bob can directly select a draft material via materials_editor_read'
);
select results_eq(
  $$select count(*)::bigint from public.materials where slug = 'discarded-draft' and status = 'archived'$$,
  array[1::bigint], 'Bob can directly select an archived material via materials_editor_read'
);

reset role;
reset request.jwt.claim.sub;

-- ---- Alice again: still cannot see non-published rows via plain select ----

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000001';
select is_empty(
  $$select slug from public.materials where slug = 'no-summary-yet'$$,
  'Alice, not a catalogue editor, cannot see a draft material via plain select'
);
reset role;
reset request.jwt.claim.sub;

-- ---- Guest visibility is fully preserved: anon still sees only published rows ----

set local role anon;
select results_eq(
  $$select slug from public.materials where slug = 'calacatta-quartz'$$,
  array['calacatta-quartz'], 'anon can still read the one published material — Slice A behaviour is unaffected'
);
select is_empty(
  $$select slug from public.materials where slug = 'no-summary-yet'$$,
  'anon still cannot read a draft material'
);
select is_empty(
  $$select slug from public.materials where slug = 'discarded-draft'$$,
  'anon still cannot read an archived material'
);
reset role;

-- ---- Carol: a catalogue editor whose role is then revoked ----

insert into public.user_roles (user_id, role, assignment_reason)
values ('f0000000-0000-0000-0000-000000000003', 'catalogue_editor', 'materials_catalogue_publishing.test.sql revoked-fixture');

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000003';
select is((select public.check_catalogue_editor_access()), true, 'Carol, freshly assigned, is confirmed an active editor before revocation');
reset role;
reset request.jwt.claim.sub;

update public.user_roles set revoked_at = now(), revoked_by = 'f0000000-0000-0000-0000-000000000002'::uuid
where user_id = 'f0000000-0000-0000-0000-000000000003' and role = 'catalogue_editor'::public.staff_role;

set local role authenticated;
set local request.jwt.claim.sub to 'f0000000-0000-0000-0000-000000000003';
select is((select public.check_catalogue_editor_access()), false, 'Carol, immediately after revocation, is no longer an active editor — revocation is honoured live, in the same session, with no re-login needed');
select throws_ok(
  $$select * from public.create_draft_material('carol-revoked-attempt', 'Carol Revoked Attempt', 'quartz'::public.material_category)$$,
  'P0001', 'create_draft_material: catalogue editor access required',
  'a revoked editor is denied exactly like a user who was never an editor'
);
select is_empty(
  $$select slug from public.materials where slug = 'no-summary-yet'$$,
  'a revoked editor also loses materials_editor_read visibility into non-published rows'
);
reset role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
