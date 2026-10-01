-- Explicit Data API grants for service_role.
--
-- Supabase no longer grants select/insert/update/delete on new public tables
-- (or usage/select on sequences) to anon, authenticated or service_role
-- automatically: new projects since 30 May 2026, all projects from
-- 30 October 2026, and the pinned CLI's local stack already. Every earlier
-- migration revokes and re-grants anon/authenticated explicitly, but none
-- granted service_role. It silently relied on the old default, so on a fresh
-- project the server-only paths (staff role assignment, catalogue editor
-- grants, the account-deletion processor, admin tooling) are refused.
--
-- service_role is the server-held key: it bypasses RLS but not grants. This
-- restores exactly the table privileges it had under the old default, as
-- explicit statements. anon and authenticated are not touched. Future tables
-- must grant service_role in their own migration; the pgTAP guard
-- service_role_grants.test.sql fails if one does not.

grant select, insert, update, delete on table
  public.account_deletion_requests,
  public.blocks,
  public.comments,
  public.connections,
  public.conversation_members,
  public.conversations,
  public.follows,
  public.materials,
  public.message_read_state,
  public.messages,
  public.moderation_actions,
  public.post_media,
  public.posts,
  public.professional_profiles,
  public.profiles,
  public.reactions,
  public.reports,
  public.saved_posts,
  public.user_roles
to service_role;

grant usage, select on sequence public.user_roles_id_seq to service_role;
