begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

-- ==========================================================================
-- Phase 5 Slice C: catalogue imagery and secure media storage. Structural
-- coverage (bucket, storage policies, column, functions), then behavioural
-- coverage (role-gated storage writes, path/existence validation on
-- set_material_image, status-independence, and that guest visibility of
-- image_path is governed by the same materials_public_read policy as
-- everything else — no separate leak path).
-- ==========================================================================

-- ---- Structural: bucket ----

select results_eq(
  $$select public::text, file_size_limit::text from storage.buckets where id = 'materials-media'$$,
  $$values ('true', '8388608')$$,
  'materials-media bucket is public with an 8MB limit'
);
select results_eq(
  $$select allowed_mime_types from storage.buckets where id = 'materials-media'$$,
  $$values (array['image/jpeg', 'image/png', 'image/webp']::text[])$$,
  'materials-media allows exactly image/jpeg, image/png, image/webp'
);

-- ---- Structural: storage RLS ----

select results_eq(
  $$select count(*)::bigint from pg_policy where polname in (
      'storage_materials_media_editor_insert', 'storage_materials_media_editor_update', 'storage_materials_media_editor_delete',
      'storage_materials_media_editor_read'
    ) and polrelid = 'storage.objects'::regclass$$,
  array[4::bigint], 'all four materials-media storage policies exist on storage.objects'
);
select results_eq(
  $$select bool_and(pg_get_expr(polqual, polrelid) ~ 'is_active_catalogue_editor' or pg_get_expr(polwithcheck, polrelid) ~ 'is_active_catalogue_editor')
    from pg_policy where polname in (
      'storage_materials_media_editor_insert', 'storage_materials_media_editor_update', 'storage_materials_media_editor_delete',
      'storage_materials_media_editor_read'
    ) and polrelid = 'storage.objects'::regclass$$,
  array[true], 'all four materials-media storage policies gate on is_active_catalogue_editor()'
);
select results_eq(
  $$select exists (
      select 1 from pg_policy p join pg_roles r on r.oid = any(p.polroles)
      where p.polname = 'storage_materials_media_editor_insert' and r.rolname = 'anon'
    )$$,
  array[false], 'the materials-media insert policy never applies to anon'
);
select results_eq(
  $$select exists (
      select 1 from pg_policy p join pg_roles r on r.oid = any(p.polroles)
      where p.polname = 'storage_materials_media_editor_read' and r.rolname = 'anon'
    )$$,
  array[false], 'the materials-media editor read policy never applies to anon (guests use the public URL only)'
);

-- ---- Structural: materials.image_path ----

select has_column('public', 'materials', 'image_path', 'materials.image_path exists');
select col_is_null('public', 'materials', 'image_path', 'materials.image_path is nullable');

-- ---- Structural: the two new RPCs ----

select has_function('public', 'set_material_image', array['uuid', 'text'], 'public.set_material_image(uuid, text) exists');
select has_function('public', 'clear_material_image', array['uuid'], 'public.clear_material_image(uuid) exists');
select results_eq(
  $$select bool_and(prosecdef) from pg_proc
    where pronamespace = 'public'::regnamespace and proname in ('set_material_image', 'clear_material_image')$$,
  array[true], 'both image RPCs are SECURITY DEFINER'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name in ('set_material_image', 'clear_material_image')
      and grantee in ('anon', 'PUBLIC')$$,
  array[0::bigint], 'neither image RPC has any anon or PUBLIC execute grant'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name in ('set_material_image', 'clear_material_image')
      and grantee = 'authenticated'$$,
  array[2::bigint], 'both image RPCs grant execute to authenticated, one row each'
);

-- ==========================================================================
-- Behavioural coverage.
-- ==========================================================================

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('f1000000-0000-0000-0000-000000000001', 'mimg-alice@fixture.test', jsonb_build_object('display_name', 'Alice Imagery Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()),
  ('f1000000-0000-0000-0000-000000000002', 'mimg-bob@fixture.test', jsonb_build_object('display_name', 'Bob Imagery Editor Fixture'), '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now());

insert into public.user_roles (user_id, role, assignment_reason)
values ('f1000000-0000-0000-0000-000000000002', 'catalogue_editor', 'materials_catalogue_imagery.test.sql fixture');

-- Fixture material creation must run as Bob (the active editor) — the
-- unrestricted connecting role has no session, so auth.uid() is null and
-- create_draft_material fails closed with "authentication required" for it,
-- exactly as it should for any caller with no session.
set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000002';
select id as material_id from public.create_draft_material(
  'travertine-classico', 'Travertine Classico', 'granite'::public.material_category, 'A fixture summary.'
) \gset
select id as other_material_id from public.create_draft_material(
  'other-material', 'Other Material', 'marble'::public.material_category, 'Another fixture summary.'
) \gset
reset role;
reset request.jwt.claim.sub;

-- ---- Storage RLS: only an active editor may write to materials-media ----

set local role anon;
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('materials-media', 'materials/%s/anon.jpg')$$, :'material_id'),
  '42501', null, 'anon cannot insert into storage.objects for materials-media — no RLS grant of any kind matches'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('materials-media', 'materials/%s/alice.jpg')$$, :'material_id'),
  '42501', null, 'a signed-in non-editor cannot insert into storage.objects for materials-media'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000002';
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('materials-media', 'materials/%s/photo.jpg')$$, :'material_id'),
  'Bob, an active editor, can insert into storage.objects for materials-media'
);
reset role;
reset request.jwt.claim.sub;

-- ---- set_material_image: access control ----

set local role anon;
select throws_ok(
  format($$select * from public.set_material_image(%L::uuid, 'materials/%s/photo.jpg')$$, :'material_id', :'material_id'),
  '42501', null, 'anon cannot call set_material_image — no execute grant'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$select * from public.set_material_image(%L::uuid, 'materials/%s/photo.jpg')$$, :'material_id', :'material_id'),
  'P0001', 'set_material_image: catalogue editor access required',
  'Alice, not an editor, cannot call set_material_image'
);
reset role;
reset request.jwt.claim.sub;

-- ---- set_material_image: validation, as Bob (the active editor) ----

set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000002';

select throws_ok(
  $$select * from public.set_material_image(gen_random_uuid(), 'materials/00000000-0000-0000-0000-000000000000/x.jpg')$$,
  'P0001', 'set_material_image: material not found',
  'set_material_image rejects a nonexistent material id'
);

select throws_ok(
  format($$select * from public.set_material_image(%L::uuid, 'materials/%s/photo.jpg')$$, :'material_id', :'other_material_id'),
  'P0001', 'set_material_image: image_path must belong to this material',
  'set_material_image rejects a path prefixed with a different material''s id'
);

select throws_ok(
  format($$select * from public.set_material_image(%L::uuid, %L)$$, :'material_id', 'not-a-valid-path.jpg'),
  'P0001', 'set_material_image: image_path must belong to this material',
  'set_material_image rejects a path with no valid material-id prefix at all'
);

select throws_ok(
  format($$select * from public.set_material_image(%L::uuid, 'materials/%s/never-uploaded.jpg')$$, :'material_id', :'material_id'),
  'P0001', 'set_material_image: the uploaded file could not be found',
  'set_material_image rejects a well-formed path with no matching storage.objects row'
);

select id, image_path from public.set_material_image(
  :'material_id'::uuid,
  format('materials/%s/photo.jpg', :'material_id')
) \gset

select is(:'image_path'::text, format('materials/%s/photo.jpg', :'material_id')::text, 'set_material_image genuinely sets image_path once the object exists and the path is valid');

-- ---- image works regardless of publish status ----

select status::text as pub_status from public.publish_material(:'material_id'::uuid) \gset
select is(:'pub_status'::text, 'published'::text, 'the material publishes normally with an image already set');
select results_eq(
  $$select image_path from public.materials where id = $$ || quote_literal(:'material_id') || $$::uuid$$,
  array[format('materials/%s/photo.jpg', :'material_id')],
  'image_path survives the draft-to-published transition untouched'
);

-- archive_material's own return shape (20260912020809_materials_catalogue_
-- publishing.sql, already merged) has no image_path column at all — proven
-- by re-selecting the row directly afterward instead of trusting \gset
-- against that function's result.
select status::text as archived_status from public.archive_material(:'material_id'::uuid) \gset
select is(:'archived_status'::text, 'archived'::text, 'archive_material transitions the material to archived');
select results_eq(
  $$select image_path from public.materials where id = $$ || quote_literal(:'material_id') || $$::uuid$$,
  array[format('materials/%s/photo.jpg', :'material_id')],
  'image_path also survives the published-to-archived transition'
);

-- ---- clear_material_image ----

set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000001';
select throws_ok(
  format($$select * from public.clear_material_image(%L::uuid)$$, :'material_id'),
  'P0001', 'clear_material_image: catalogue editor access required',
  'Alice, not an editor, cannot call clear_material_image'
);
reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub to 'f1000000-0000-0000-0000-000000000002';
-- \gset of a NULL leaves the psql variable unset (so :'image_path' would
-- stay a literal and be a syntax error) — assert directly on the call's
-- own returned value instead.
select ok(
  (select c.image_path from public.clear_material_image(:'material_id'::uuid) as c) is null,
  'clear_material_image genuinely nulls image_path'
);

select throws_ok(
  $$select * from public.clear_material_image(gen_random_uuid())$$,
  'P0001', 'clear_material_image: material not found',
  'clear_material_image rejects a nonexistent material id'
);
reset role;
reset request.jwt.claim.sub;

-- ---- image_path check constraint: defense in depth, proven by direct insert ----

select throws_ok(
  format($$update public.materials set image_path = 'materials/%s/x.exe' where id = %L::uuid$$, :'other_material_id', :'other_material_id'),
  '23514', null, 'the check constraint rejects a disallowed file extension'
);
select throws_ok(
  format($$update public.materials set image_path = 'materials/%s/../../etc/passwd.jpg' where id = %L::uuid$$, :'other_material_id', :'other_material_id'),
  '23514', null, 'the check constraint rejects a path-traversal attempt'
);
select throws_ok(
  format($$update public.materials set image_path = 'materials/%s/photo.jpg' where id = %L::uuid$$, :'material_id', :'other_material_id'),
  '23514', null, 'the check constraint rejects a path prefixed with a different material''s id, even via a raw update'
);
select lives_ok(
  format($$update public.materials set image_path = 'materials/%s/valid-name_1.png' where id = %L::uuid$$, :'other_material_id', :'other_material_id'),
  'a genuinely well-formed, correctly-prefixed path is accepted'
);
update public.materials set image_path = null where id = :'other_material_id'::uuid;

-- ---- Guest visibility of image_path is unaffected — same RLS as everything else ----

-- other_material_id has never had an image set; published now purely to
-- prove anon sees a genuine null, never a fabricated placeholder value, at
-- the raw data layer (the honest-placeholder *UI* itself lives client-side).
-- Fixture setup as the unrestricted test role (publish_material itself
-- needs an editor session, which this section deliberately doesn't hold —
-- the RPC's own transitions are already covered above and in
-- materials_catalogue_publishing.test.sql).
update public.materials set status = 'published' where id = :'other_material_id'::uuid;
select is(
  (select status::text from public.materials where id = :'other_material_id'::uuid),
  'published'::text,
  'the second fixture material is published, with no image set'
);

set local role anon;
select results_eq(
  format($$select image_path from public.materials where id = %L::uuid$$, :'other_material_id'),
  array[null::text], 'anon reading a published material with no image sees a genuine null, never a fabricated placeholder value'
);
select is_empty(
  format($$select id from public.materials where id = %L::uuid and status <> 'published'$$, :'material_id'),
  'the earlier archived material is correctly invisible to anon at all — archiving removed it from guest visibility entirely, image_path included'
);
reset role;

select * from finish();
rollback;
