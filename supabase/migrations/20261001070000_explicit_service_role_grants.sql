-- Explicit Data API grants (no reliance on platform default privileges).
--
-- Supabase no longer grants select/insert/update/delete on new public tables
-- (or usage/select on sequences) to anon, authenticated or service_role
-- automatically: new projects since 30 May 2026, all projects from
-- 30 October 2026, and the pinned CLI's local stack already. Every earlier
-- migration revokes and re-grants anon/authenticated explicitly, but none
-- granted service_role. It silently relied on the old default, so on a fresh
-- project the server-only paths (staff role assignment, SMC Team assignment,
-- catalogue editor grants, verification, admin tooling) are refused.
--
-- Convention (docs/database-grants.md): every public table's migration
--   1. enables RLS,
--   2. revokes all from public, anon and authenticated,
--   3. grants anon/authenticated only what the client needs (column-level
--      where possible), and
--   4. grants service_role select, insert, update, delete.
-- The guard test service_role_grants.test.sql pins the resulting matrix.

-- service_role is the server-held secret key (never shipped to a client).
-- It bypasses RLS, not grants; these are the Data API privileges it needs for
-- server and staff operations. anon and authenticated are not touched here.
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

-- The new platform defaults still auto-grant TRUNCATE, REFERENCES and TRIGGER
-- (and sequence UPDATE). No Data API client needs them, and TRUNCATE ignores
-- RLS, so remove them explicitly for every Data API role.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated, service_role;

-- user_roles.id is GENERATED ALWAYS AS IDENTITY: inserts do not check sequence
-- privileges, so no role needs any privilege on its sequence (UPDATE would
-- allow setval).
revoke all on sequence public.user_roles_id_seq from anon, authenticated, service_role;
