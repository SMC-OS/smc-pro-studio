begin;

create extension if not exists pgtap with schema extensions;
select plan(60);

-- ==========================================================================
-- Phase 5 Slice A: materials catalogue foundation — schema/RLS only.
-- Guest-visible, read-only. No pricing/stock/discount/origin/certification/
-- standards/warranty/provenance field exists on this table, no image/storage
-- column, no client write grant, no publishing RPC (deferred to a future
-- slice), and this migration seeds no rows. This file therefore needs no
-- auth.users fixture at all — every assertion below either checks structure
-- directly, or inserts fixture rows as the test's own default (superuser)
-- role, which bypasses RLS/grants the same way every other test file's
-- unqualified fixture inserts already do.
-- ==========================================================================

-- ---- Enum types: exact, locked value lists ----

select has_type('public', 'material_category', 'material_category enum exists');
select enum_has_labels('public', 'material_category',
  array['quartz', 'granite', 'marble', 'porcelain', 'dekton'],
  'material_category has exactly the five locked values, in that order — no "other" or speculative category'
);

select has_type('public', 'material_status', 'material_status enum exists');
select enum_has_labels('public', 'material_status',
  array['draft', 'published', 'archived'],
  'material_status has exactly draft, published, archived, in that order'
);

-- ---- Table and columns ----

select has_table('public', 'materials', 'materials table exists');

select has_column('public', 'materials', 'id', 'materials.id exists');
select has_column('public', 'materials', 'slug', 'materials.slug exists');
select has_column('public', 'materials', 'name', 'materials.name exists');
select has_column('public', 'materials', 'category', 'materials.category exists');
select has_column('public', 'materials', 'summary', 'materials.summary exists');
select has_column('public', 'materials', 'description', 'materials.description exists');
select has_column('public', 'materials', 'applications', 'materials.applications exists');
select has_column('public', 'materials', 'status', 'materials.status exists');
select has_column('public', 'materials', 'created_at', 'materials.created_at exists');
select has_column('public', 'materials', 'updated_at', 'materials.updated_at exists');

-- No pricing/stock/discount/origin/certification/warranty/provenance/image
-- column exists on this table — proven directly, not just absent from the
-- list above.
select hasnt_column('public', 'materials', 'price', 'materials has no price column');
select hasnt_column('public', 'materials', 'stock', 'materials has no stock column');
select hasnt_column('public', 'materials', 'origin', 'materials has no origin column');
select hasnt_column('public', 'materials', 'certification', 'materials has no certification column');
select hasnt_column('public', 'materials', 'image_path', 'materials has no image/storage column');

select col_not_null('public', 'materials', 'slug', 'materials.slug is required');
select col_not_null('public', 'materials', 'name', 'materials.name is required');
select col_not_null('public', 'materials', 'category', 'materials.category is required');
select col_not_null('public', 'materials', 'applications', 'materials.applications is required (defaults to empty array)');
select col_not_null('public', 'materials', 'status', 'materials.status is required');
select col_is_null('public', 'materials', 'summary', 'materials.summary is nullable — no fabricated copy required');
select col_is_null('public', 'materials', 'description', 'materials.description is nullable — no fabricated copy required');

select col_default_is('public', 'materials', 'status', 'draft', 'materials.status defaults to draft — never guest-visible until explicitly published');
select col_default_is('public', 'materials', 'applications', '{}', 'materials.applications defaults to an empty array, never fabricated tags');

select col_is_unique('public', 'materials', array['slug'], 'materials.slug is unique');

-- ---- Index: exactly the one query-aligned index, no speculative ones ----

select has_index('public', 'materials', 'materials_status_category_idx', 'materials_status_category_idx exists');
select results_eq(
  $$select pg_get_indexdef(i.indexrelid) ~ '\(status, category\)'
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where c.relname = 'materials_status_category_idx'$$,
  array[true],
  'materials_status_category_idx covers exactly (status, category), in that order'
);

-- ---- Trigger: updated_at maintenance reuses the existing function ----

select has_trigger('public', 'materials', 'materials_set_updated_at', 'materials_set_updated_at trigger exists');
-- Compared as name = name (not cast to text) to avoid the same pg_catalog
-- "name" collation ambiguity results_eq hit elsewhere in this codebase
-- (see post_type.test.sql's own note on this exact class of Postgres issue).
select ok(
  exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgname = 'materials_set_updated_at'
      and t.tgrelid = 'public.materials'::regclass
      and p.proname = 'set_updated_at'
      and n.nspname = 'private'
  ),
  'materials_set_updated_at reuses the existing private.set_updated_at function, no new function was created'
);

-- ---- RLS and grants ----

select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.materials'::regclass$$,
  array[true], 'RLS is enabled on materials'
);
-- Phase 5 Slice B (20260912020809_materials_catalogue_publishing.sql) adds
-- a second, additive materials_editor_read policy alongside this one — see
-- materials_catalogue_publishing.test.sql for its own coverage. This
-- assertion is updated in place (a test file, not a migration) to reflect
-- that real, intentional change; the policy this file actually tests below
-- (materials_public_read) is otherwise completely unchanged.
select policies_are('public', 'materials', array['materials_editor_read', 'materials_public_read'],
  'materials exposes exactly two policies as of Slice B — the original public-read policy, unchanged, plus Slice B''s new editor-read policy');

select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'materials' and grantee = 'anon' and privilege_type = 'SELECT'$$,
  array[1::bigint], 'anon may select materials at the grant level (RLS narrows this to published rows)'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'materials' and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  array[1::bigint], 'authenticated may select materials at the grant level (RLS narrows this to published rows)'
);
select results_eq(
  $$select count(*)::bigint from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'materials'
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'neither anon nor authenticated has any table-level insert/update/delete on materials — no client write grant and no publishing RPC exist this slice'
);
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'materials'
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE')$$,
  array[0::bigint], 'neither anon nor authenticated has any column-level insert/update/delete on materials either'
);

-- ---- Check constraints ----

select throws_ok(
  $$insert into public.materials (slug, name, category) values ('', 'Empty Slug', 'quartz')$$,
  '23514', null, 'an empty slug is rejected'
);
select throws_ok(
  $$insert into public.materials (slug, name, category) values ('Bad Slug', 'Bad Slug Material', 'quartz')$$,
  '23514', null, 'a slug containing a space or uppercase letters is rejected'
);
select throws_ok(
  $$insert into public.materials (slug, name, category) values ('valid-slug-1', '', 'quartz')$$,
  '23514', null, 'an empty name is rejected'
);
select throws_ok(
  format($$insert into public.materials (slug, name, category) values ('valid-slug-2', %L, 'quartz')$$, repeat('x', 151)),
  '23514', null, 'a name longer than 150 characters is rejected'
);
select throws_ok(
  $$insert into public.materials (slug, name, category) values ('valid-slug-3', 'Sandstone Sample', 'sandstone')$$,
  '22P02', null, 'a category outside the five locked values is rejected — no "other" or speculative category can be inserted'
);

-- ---- Real rows: slug uniqueness, defaults, updated_at trigger ----

insert into public.materials (slug, name, category, summary, applications)
values ('calacatta-quartz', 'Calacatta Quartz', 'quartz', 'A fixture summary for testing.', array['Kitchen Worktops']);

select throws_ok(
  $$insert into public.materials (slug, name, category) values ('calacatta-quartz', 'Duplicate Slug Material', 'granite')$$,
  '23505', null, 'a duplicate slug is rejected'
);

select results_eq(
  $$select status::text from public.materials where slug = 'calacatta-quartz'$$,
  array['draft'], 'a newly inserted material defaults to draft, never published, without an explicit status'
);

-- now() is frozen for the whole pgTAP test transaction, so created_at and a
-- trigger-set updated_at can be genuinely equal — "advances past created_at"
-- is not a valid proof here. Instead, the caller explicitly tries to set a
-- stale updated_at in the same statement; the BEFORE UPDATE trigger must
-- overwrite it regardless, which is a stronger proof that it actually fires.
select lives_ok(
  $$update public.materials set summary = 'Updated fixture summary.', updated_at = '2000-01-01'::timestamptz where slug = 'calacatta-quartz'$$,
  'updating a material row succeeds as the unrestricted test role'
);
select results_eq(
  $$select (updated_at <> '2000-01-01'::timestamptz and updated_at = now()) from public.materials where slug = 'calacatta-quartz'$$,
  array[true],
  'the updated_at trigger overrides even a caller-supplied stale timestamp, proving it actually fires'
);

update public.materials set status = 'published' where slug = 'calacatta-quartz';
insert into public.materials (slug, name, category, status)
values ('unpublished-granite', 'Unpublished Granite Sample', 'granite', 'draft');
insert into public.materials (slug, name, category, status)
values ('retired-marble', 'Retired Marble Sample', 'marble', 'archived');

-- ---- Behavioural RLS: guest and authenticated read published-only ----

set local role anon;
select results_eq(
  $$select slug from public.materials where slug = 'calacatta-quartz'$$,
  array['calacatta-quartz'], 'anon can read a published material'
);
select is_empty(
  $$select slug from public.materials where slug = 'unpublished-granite'$$,
  'anon cannot read a draft material'
);
select is_empty(
  $$select slug from public.materials where slug = 'retired-marble'$$,
  'anon cannot read an archived material'
);
select throws_ok(
  $$insert into public.materials (slug, name, category) values ('anon-attempt', 'Anon Attempt', 'quartz')$$,
  '42501', null, 'anon cannot insert into materials — no grant exists'
);
select throws_ok(
  $$update public.materials set status = 'published' where slug = 'unpublished-granite'$$,
  '42501', null, 'anon cannot update materials — no grant exists'
);
select throws_ok(
  $$delete from public.materials where slug = 'calacatta-quartz'$$,
  '42501', null, 'anon cannot delete materials — no grant exists'
);
reset role;

set local role authenticated;
select results_eq(
  $$select slug from public.materials where slug = 'calacatta-quartz'$$,
  array['calacatta-quartz'], 'a signed-in user can read a published material, identically to a guest'
);
select is_empty(
  $$select slug from public.materials where slug = 'unpublished-granite'$$,
  'a signed-in user (with no staff role of any kind) cannot read a draft material — staff publishing/draft access is a deferred future slice'
);
select throws_ok(
  $$insert into public.materials (slug, name, category) values ('authenticated-attempt', 'Authenticated Attempt', 'quartz')$$,
  '42501', null, 'an authenticated user cannot insert into materials — no client write grant or publishing RPC exists this slice'
);
select throws_ok(
  $$update public.materials set status = 'published' where slug = 'unpublished-granite'$$,
  '42501', null, 'an authenticated user cannot update materials'
);
select throws_ok(
  $$delete from public.materials where slug = 'calacatta-quartz'$$,
  '42501', null, 'an authenticated user cannot delete materials'
);
reset role;

select * from finish();
rollback;
