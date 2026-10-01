-- Phase 5 hardening: revoke anon EXECUTE on every signed-in-only RPC.
-- Additive only. No already-merged migration file is modified.
--
-- Why: every earlier migration secures its RPCs with
--   revoke all on function ... from public;
--   grant execute on function ... to authenticated;
-- That is sufficient on a vanilla Postgres, but NOT on a default Supabase
-- project: Supabase's platform init grants EXECUTE on new functions in the
-- public schema directly to anon, authenticated and service_role via
-- ALTER DEFAULT PRIVILEGES (see the Supabase Database Advisor lint
-- 0028_anon_security_definer_function_executable). Revoking from PUBLIC
-- does not remove that explicit anon grant, so on a hosted project these
-- SECURITY DEFINER functions would be callable with only the public anon key.
--
-- Each function already re-checks auth.uid() and raises
-- "authentication required" for a caller without a session, so this is a
-- defence-in-depth correction rather than a confirmed data exposure — but
-- the merged pgTAP suite already asserts "no anon or PUBLIC execute grant"
-- for every one of these functions, and that assertion must hold on the
-- real platform, not just on a particular local image.
--
-- Deliberately NOT revoked: public.search_public_professionals — guest
-- professional discovery is an approved anon capability (SECURITY INVOKER,
-- RLS-scoped).

revoke execute on function public.archive_material(uuid) from anon, public;
revoke execute on function public.check_catalogue_editor_access() from anon, public;
revoke execute on function public.check_moderator_access() from anon, public;
revoke execute on function public.create_direct_conversation(uuid) from anon, public;
revoke execute on function public.create_draft_material(text, text, public.material_category, text, text, text[]) from anon, public;
revoke execute on function public.get_unread_message_counts() from anon, public;
revoke execute on function public.list_moderation_actions(integer, timestamptz, uuid, uuid) from anon, public;
revoke execute on function public.list_moderation_reports(public.report_status, integer, timestamptz, uuid) from anon, public;
revoke execute on function public.mark_conversation_read(uuid, uuid) from anon, public;
revoke execute on function public.moderate_reported_message(uuid, public.moderation_action_type, text) from anon, public;
revoke execute on function public.publish_material(uuid) from anon, public;
revoke execute on function public.review_report(uuid, public.report_status, text) from anon, public;
revoke execute on function public.submit_message_report(uuid, public.report_category, text) from anon, public;
revoke execute on function public.submit_profile_report(uuid, public.report_category, text) from anon, public;
revoke execute on function public.update_draft_material(uuid, text, text, public.material_category, text, text, text[]) from anon, public;

-- Future RPCs: this migration does not change default privileges (Postgres
-- also grants EXECUTE to PUBLIC by default, and private helper functions used
-- inside RLS policies rely on that). Instead, every new signed-in-only RPC must
-- revoke from both anon and public explicitly, and
-- supabase/tests/database/rpc_execute_grants.test.sql fails if any public
-- function other than the approved guest RPC is executable by anon.
