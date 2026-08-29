-- Phase 4 Slice D: authenticated Realtime delivery for direct messages.
--
-- Adds public.messages — and only public.messages — to the pre-existing
-- supabase_realtime publication (confirmed locally: the publication already
-- exists with puballtables = false and zero member tables before this
-- migration) so INSERT events on it can be delivered over Postgres Changes.
-- No other table (conversations, conversation_members, profiles, blocks,
-- posts, etc.) is added — this migration touches nothing else.
--
-- This is additive-only and grants no new read access on its own: Realtime
-- Postgres Changes is RLS-gated per subscriber using the *table's own*
-- existing policies, so a client only ever receives an INSERT payload for a
-- row messages_member_read (20260824090000_direct_messaging_foundation.sql,
-- unmodified here) already lets that same authenticated user SELECT. No RLS
-- policy is created, altered, or dropped by this file, and no
-- SECURITY DEFINER function is introduced.
--
-- Guarded with an existence check so this migration replays safely (e.g. a
-- local `supabase db reset`) even if public.messages were ever already a
-- publication member: an unconditional
-- `alter publication supabase_realtime add table public.messages` raises
-- duplicate_object on a second application, which would otherwise break
-- replay idempotency.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
