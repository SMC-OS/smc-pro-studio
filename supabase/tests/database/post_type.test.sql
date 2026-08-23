begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

-- ==========================================================================
-- Phase 3 Slice G: post_type is presentation metadata only (general |
-- portfolio for this slice — field_update/project_update/opportunity remain
-- deferred). It must not become a new visibility/authorization dimension,
-- so this file checks structure and grants, not RLS row-visibility (the
-- existing posts_* policies in rls_social_core.test.sql are untouched and
-- continue to cover that).
-- ==========================================================================

-- The enum exists with exactly the two shipped values, general first (the
-- default), portfolio second — no field_update/project_update/opportunity.
select has_type('public', 'post_type', 'post_type enum exists');
select enum_has_labels('public', 'post_type', array['general', 'portfolio'],
  'post_type has exactly general and portfolio, in that order');

-- posts.post_type exists, is the enum type, is required, and defaults to
-- 'general' — so a legacy insert that never mentions post_type (every real
-- pre-Slice-G post) is honestly classified as general, never inferred.
select has_column('public', 'posts', 'post_type', 'posts.post_type column exists');
select results_eq(
  $$select pg_catalog.format_type(a.atttypid, a.atttypmod)
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'posts' and a.attname = 'post_type' and a.attnum > 0 and not a.attisdropped$$,
  array['post_type'],
  'posts.post_type is typed as the post_type enum'
);
select col_not_null('public', 'posts', 'post_type', 'posts.post_type is not null');
-- The default itself (post_type defaults to 'general') is proven below by a
-- real insert that omits post_type, rather than by comparing catalog
-- expression text here — pgtap's results_eq hit a Postgres collation
-- ambiguity comparing pg_get_expr()'s output against a plain literal on this
-- Postgres version, unrelated to the migration's correctness.

-- Column-level grants: authenticated may set post_type on insert/update
-- (minimum required for the CreateRoute selector); anon retains no write
-- access at all, matching the moderation_status precedent in
-- rls_social_core.test.sql.
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'posts' and column_name = 'post_type'
      and grantee = 'authenticated' and privilege_type = 'INSERT'$$,
  array[1::bigint],
  'authenticated may set post_type on insert'
);
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'posts' and column_name = 'post_type'
      and grantee = 'authenticated' and privilege_type = 'UPDATE'$$,
  array[1::bigint],
  'authenticated may set post_type on update'
);
-- anon legitimately has SELECT on post_type (guests read posts too, and
-- post_type is part of every post row) — only INSERT/UPDATE are checked
-- here, since those are the write privileges that must stay authenticated-only.
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'posts' and column_name = 'post_type'
      and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE')$$,
  array[0::bigint],
  'anon has no insert/update privilege on post_type'
);

-- Adding post_type must not touch the existing RLS policy set on posts —
-- it is presentation metadata, not a new visibility/authorization axis.
select policies_are('public', 'posts', array[
  'posts_owner_delete', 'posts_owner_insert', 'posts_owner_read', 'posts_owner_update',
  'posts_public_read', 'posts_relationship_read'
], 'posts still exposes only the pre-existing RLS policies after adding post_type');

-- Behavioural: a real insert that never mentions post_type (exactly what
-- every pre-Slice-G post looked like, and what an author still does when
-- posting "General") lands as 'general' — proving the default applies to
-- real rows, not just the catalog metadata above.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  'b0000000-0000-0000-0000-000000000001', 'post-type-author@fixture.test',
  jsonb_build_object('display_name', 'Post Type Fixture Author'),
  '{}'::jsonb, 'authenticated', 'authenticated', 'not-a-real-password', now(), now(), now()
);

set local role authenticated;
set local request.jwt.claim.sub to 'b0000000-0000-0000-0000-000000000001';
insert into public.posts (author_id, body, visibility)
values ('b0000000-0000-0000-0000-000000000001', 'A legacy-style post with no post_type given.', 'public');
select results_eq(
  $$select post_type::text from public.posts where author_id = 'b0000000-0000-0000-0000-000000000001'::uuid$$,
  array['general'],
  'a post created without specifying post_type is honestly classified as general, never inferred as portfolio'
);
reset role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
