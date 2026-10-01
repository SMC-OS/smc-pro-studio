begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select policies_are('public', 'profiles', array[
  'profiles_owner_insert', 'profiles_owner_read', 'profiles_owner_update', 'profiles_public_read'
], 'profiles exposes only the expected RLS policies');

select policies_are('public', 'professional_profiles', array[
  'professional_profiles_owner_insert', 'professional_profiles_owner_read',
  'professional_profiles_owner_update', 'professional_profiles_public_read'
], 'professional profiles exposes only the expected RLS policies');

select policies_are('public', 'user_roles', array[]::text[],
  'staff role assignments are deny-by-default to API users');

-- V1 launch gate: requests and cancellations now go only through the
-- request_account_deletion()/cancel_account_deletion() RPCs; owners keep read.
select policies_are('public', 'account_deletion_requests', array[
  'account_deletion_owner_read'
], 'account deletion exposes only the owner read policy (mutations are RPC-only)');

select policies_are('storage', 'objects', array[
  'storage_private_user_owner_delete', 'storage_private_user_owner_insert',
  'storage_private_user_owner_read', 'storage_private_user_owner_update',
  'storage_public_media_owner_delete', 'storage_public_media_owner_insert',
  'storage_public_media_owner_update',
  -- Phase 5 Slice C: role-gated (catalogue editor) write policies on materials-media.
  'storage_materials_media_editor_delete', 'storage_materials_media_editor_insert',
  'storage_materials_media_editor_update', 'storage_materials_media_editor_read'
], 'storage exposes only owner-scoped Phase 2 policies plus Slice C catalogue-editor media policies');

select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname = 'storage' and tablename = 'objects' and coalesce(qual, '') like '%private-project-media%'$$,
  array[0::bigint],
  'private project media has no read policy before project membership exists'
);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'professional_profiles', 'professional profiles exists');
select has_table('public', 'user_roles', 'server-controlled roles exists');
select has_table('private', 'role_assignment_audit', 'private role audit exists');
select has_table('public', 'account_deletion_requests', 'account deletion foundation exists');
select col_is_pk('public', 'profiles', 'id', 'profile identity is the auth user id');

select * from finish();
rollback;
