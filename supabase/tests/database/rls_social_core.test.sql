begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

-- Tables exist
select has_table('public', 'follows', 'follows exists');
select has_table('public', 'connections', 'connections exists');
select has_table('public', 'blocks', 'blocks exists');
select has_table('public', 'posts', 'posts exists');
select has_table('public', 'post_media', 'post_media exists');
select has_table('public', 'comments', 'comments exists');
select has_table('public', 'reactions', 'reactions exists');
select has_table('public', 'saved_posts', 'saved_posts exists');

-- Relationships are never readable by anonymous/guest users.
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname = 'public' and tablename = 'follows' and 'anon' = any(roles)$$,
  array[0::bigint],
  'follows has no anonymous-role policy'
);
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname = 'public' and tablename = 'connections' and 'anon' = any(roles)$$,
  array[0::bigint],
  'connections has no anonymous-role policy'
);
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname = 'public' and tablename = 'blocks' and 'anon' = any(roles)$$,
  array[0::bigint],
  'blocks has no anonymous-role policy'
);

-- Posts expose exactly the expected policy set (public read + owner CRUD + relationship read).
select policies_are('public', 'posts', array[
  'posts_owner_delete', 'posts_owner_insert', 'posts_owner_read', 'posts_owner_update',
  'posts_public_read', 'posts_relationship_read'
], 'posts exposes only the expected RLS policies');

-- Connections cannot be self-accepted: the addressee-respond policy must scope to the addressee.
select results_eq(
  $$select count(*)::bigint from pg_policies
    where schemaname = 'public' and tablename = 'connections' and policyname = 'connections_addressee_respond'
      and coalesce(qual, '') like '%addressee_id%'$$,
  array[1::bigint],
  'connection acceptance is scoped to the addressee, not the requester'
);

-- Moderation fields are never client-grantable.
select results_eq(
  $$select count(*)::bigint from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'posts' and column_name = 'moderation_status'
      and grantee in ('anon', 'authenticated') and privilege_type = 'UPDATE'$$,
  array[0::bigint],
  'moderation_status on posts is not client-updatable'
);

-- can_view_post() and relationship helpers exist and are callable by anon/authenticated
-- (SECURITY DEFINER internals stay private; only EXECUTE is exposed).
select has_function('private', 'can_view_post', array['uuid'], 'can_view_post helper exists');
select function_privs_are('private', 'can_view_post', array['uuid'], 'anon', array['EXECUTE'],
  'anon may call can_view_post');
select function_privs_are('private', 'can_view_post', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated may call can_view_post');

select col_is_pk('public', 'follows', array['follower_id', 'followee_id'], 'follow edges are keyed by the pair');

select * from finish();
rollback;
