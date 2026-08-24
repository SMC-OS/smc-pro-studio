-- Phase 4 Slice A: direct-messaging schema and RLS foundation.
-- Additive only — no existing migration, table, policy, or grant is modified.
-- Scope: 1:1 ("direct") conversations only. Project/group conversations are
-- deliberately not built here — see conversation_kind below for how this
-- extends additively later without pretending that scope exists now.
--
-- This migration adds no application/route/client code and no report/mute/
-- moderation-queue schema — those remain later Phase 4 slices per
-- tasks/plan.md. MessagesRoute stays the existing honest "coming soon"
-- placeholder; nothing here is wired into it yet.

-- ==========================================================================
-- conversations
-- ==========================================================================

-- Only 'direct' ships in this slice. Adding 'project' or 'group' later is a
-- forward-only enum-label addition (same pattern as public.post_type), not a
-- redesign — direct_member_low/high stay null for any future non-direct kind
-- (see the check constraint below), and real N-party membership already
-- lives in conversation_members, not on this table.
create type public.conversation_kind as enum ('direct');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'direct',
  -- Canonicalized pair (least/greatest of the two participant profile ids),
  -- populated only for kind = 'direct'. This is *not* the source of truth
  -- for membership — conversation_members is — it exists purely so a single
  -- unique index can guarantee "at most one direct conversation per
  -- unordered pair" at the database level, the same least/greatest idiom
  -- already used by connections_pair_unique in 20260819120000_social_core.sql.
  direct_member_low uuid references public.profiles (id) on delete cascade,
  direct_member_high uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_direct_pair_consistent check (
    (kind = 'direct'
      and direct_member_low is not null
      and direct_member_high is not null
      and direct_member_low < direct_member_high)
    or (kind <> 'direct' and direct_member_low is null and direct_member_high is null)
  )
);

-- The uniqueness guarantee reversed-argument/concurrent calls to
-- create_direct_conversation() rely on: at most one direct conversation row
-- can ever exist for a given unordered pair, enforced by Postgres itself,
-- not by application logic.
create unique index conversations_direct_pair_unique
  on public.conversations (direct_member_low, direct_member_high)
  where kind = 'direct';

-- ==========================================================================
-- conversation_members
-- ==========================================================================

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

-- ==========================================================================
-- Helper functions.
--
-- private.is_conversation_member() exists so RLS policies never query
-- conversation_members directly from within a policy defined *on*
-- conversation_members itself (or from another table's policy that then
-- reads conversation_members, whose own SELECT policy would in turn read
-- conversation_members again, forever). A raw self-referencing subquery in
-- conversation_members' own policy causes genuine infinite recursion
-- (Postgres error 42P17), since evaluating the policy for one row requires
-- evaluating the same policy again for the subquery's rows. Routing through
-- a SECURITY DEFINER function — same pattern as private.is_following /
-- private.has_accepted_connection / private.has_blocked above — runs the
-- lookup as the function owner, bypassing RLS entirely, exactly like those
-- helpers already do for their own tables.
--
-- Deliberately single-argument (no p_user_id): both helpers derive the
-- acting user from auth.uid() internally rather than accepting it as a
-- parameter. Unlike is_following/has_accepted_connection/has_blocked above
-- (which compare two *rows'* participants and are read via tables with
-- their own RLS), these two are SECURITY DEFINER functions granted EXECUTE
-- directly to authenticated — callable standalone, not only from within a
-- policy. A p_user_id parameter would let any authenticated caller pass an
-- arbitrary victim id and probe that user's conversation membership or
-- block relationships for a conversation the caller has nothing to do
-- with. Binding to auth.uid() means the only membership/block state a
-- caller can ever learn through these functions is their own.
-- ==========================================================================

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

-- Whether any OTHER member of the conversation has blocked the caller
-- (auth.uid()), or the caller has blocked them, in either direction. Used
-- only by messages_member_insert; SECURITY DEFINER for the same reason as
-- above (this also reads conversation_members).
--
-- Fails closed (returns true, i.e. "treat as blocked") whenever auth.uid()
-- is not itself a member of p_conversation_id, rather than evaluating the
-- block check anyway. Without this, a non-member could call the function
-- directly with an arbitrary conversation id they don't belong to and use
-- the true/false result to learn whether a block exists between its real
-- members — a relationship that is none of their business. A non-member is
-- never allowed to send into the conversation regardless (messages_member_insert
-- also requires is_conversation_member independently), so returning true
-- here changes no legitimate behaviour.
create or replace function private.conversation_has_blocked_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.conversation_members self_member
      where self_member.conversation_id = p_conversation_id
        and self_member.user_id = auth.uid()
    ) then true
    else exists (
      select 1 from public.conversation_members other_member
      where other_member.conversation_id = p_conversation_id
        and other_member.user_id <> auth.uid()
        and (
          private.has_blocked(other_member.user_id, auth.uid())
          or private.has_blocked(auth.uid(), other_member.user_id)
        )
    )
  end;
$$;

revoke all on function private.is_conversation_member(uuid) from public;
revoke all on function private.conversation_has_blocked_participant(uuid) from public;
grant execute on function private.is_conversation_member(uuid) to authenticated;
grant execute on function private.conversation_has_blocked_participant(uuid) to authenticated;

-- ==========================================================================
-- Row level security: conversations and conversation_members.
-- Enabled together, after both tables exist, because conversations'
-- member-read policy is defined in terms of conversation_members.
-- ==========================================================================

alter table public.conversations enable row level security;

-- No client update/delete: conversations are immutable once created (no
-- policy of either kind exists, so both are denied outright).
create policy conversations_member_read
on public.conversations for select
to authenticated
using (private.is_conversation_member(id));

revoke all on public.conversations from anon, authenticated;
-- direct_member_low/high are an internal uniqueness-enforcement mechanism,
-- not participant-facing data (conversation_members is the real membership
-- read path) — deliberately excluded from this select grant.
grant select (id, kind, created_at) on public.conversations to authenticated;

alter table public.conversation_members enable row level security;

-- A member may read every membership row of any conversation they
-- themselves belong to (needed to render "who's in this thread"), not
-- merely their own row. Goes through private.is_conversation_member()
-- rather than a raw self-join — see that function's comment above for why
-- a direct subquery against this same table here would recurse infinitely.
create policy conversation_members_member_read
on public.conversation_members for select
to authenticated
using (private.is_conversation_member(conversation_id));

-- No insert/update/delete policy and no such grant below: clients cannot
-- add, remove, or modify members directly under any circumstance. Only
-- create_direct_conversation() (SECURITY DEFINER, owned by the migration
-- role, which bypasses RLS as the table owner exactly like
-- private.handle_new_auth_user() already does for profiles/user_roles) may
-- write this table.
revoke all on public.conversation_members from anon, authenticated;
grant select on public.conversation_members to authenticated;

-- ==========================================================================
-- messages
-- ==========================================================================

-- public.moderation_status (20260819120000_social_core.sql) is deliberately
-- NOT reused here. It exists to support an owner/moderator removal
-- workflow — but this slice grants no UPDATE/DELETE on messages at all (see
-- below), so a moderation_status column could never actually change value.
-- Adding it now would be unusable schema decoration ahead of the report/
-- removal slice that would give it meaning — the same discipline
-- post_type's rollout already followed for field_update/project_update/
-- opportunity. Revisit when that slice is designed.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  -- Requires the stored value to already be trimmed (body = btrim(body)) —
  -- stronger than posts/comments, which only trim client-side — because
  -- this slice ships no client to trim on its behalf. A whitespace-only
  -- body fails this equality (btrim collapses it to '', which cannot equal
  -- the untrimmed original), and 2000 is a deliberate direct-message-sized
  -- cap distinct from posts' 3000/comments' 1000.
  body text not null check (body = btrim(body) and char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Supports the primary read pattern: a conversation's messages in
-- chronological order.
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy messages_member_read
on public.messages for select
to authenticated
using (private.is_conversation_member(conversation_id));

-- A member may send only as themselves, only into a conversation they
-- belong to, and never while blocked in either direction by the other
-- party — reusing private.has_blocked() unchanged (no edit to
-- 20260819120000_social_core.sql), via the conversation_has_blocked_participant
-- helper above (same RLS-recursion rationale as is_conversation_member).
create policy messages_member_insert
on public.messages for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and private.is_conversation_member(conversation_id)
  and not private.conversation_has_blocked_participant(conversation_id)
);

-- Append-only: no update/delete policy and no such grant — a message can
-- never be edited or removed by a client in this slice.
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (id, conversation_id, sender_id, body) on public.messages to authenticated;

-- ==========================================================================
-- create_direct_conversation: the only client-reachable way to create a
-- direct conversation (or its memberships). Clients have no INSERT grant or
-- RLS policy on conversations/conversation_members at all, so this function
-- is the sole write path — SECURITY DEFINER is required for it to succeed.
-- ==========================================================================

create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_low uuid;
  v_high uuid;
  v_conversation_id uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'create_direct_conversation: authentication required';
  end if;

  if other_user_id is null then
    raise exception 'create_direct_conversation: other_user_id is required';
  end if;

  if other_user_id = v_caller then
    raise exception 'create_direct_conversation: cannot start a conversation with yourself';
  end if;

  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception 'create_direct_conversation: target user does not exist';
  end if;

  -- Generic message in both directions deliberately: it does not reveal
  -- whether the caller blocked the target, the target blocked the caller,
  -- or both.
  if private.has_blocked(v_caller, other_user_id) or private.has_blocked(other_user_id, v_caller) then
    raise exception 'create_direct_conversation: this conversation is not available';
  end if;

  v_low := least(v_caller, other_user_id);
  v_high := greatest(v_caller, other_user_id);

  -- Idempotent fast path: reversed-argument or repeated calls for the same
  -- pair return the same conversation rather than erroring or duplicating.
  select id into v_conversation_id
  from public.conversations
  where kind = 'direct' and direct_member_low = v_low and direct_member_high = v_high;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  -- Concurrency: two simultaneous calls for the same pair can both pass the
  -- lookup above and race to insert. conversations_direct_pair_unique makes
  -- the loser's insert raise unique_violation; caught below and resolved by
  -- reading the winner's row instead of surfacing an error to the loser.
  begin
    insert into public.conversations (kind, direct_member_low, direct_member_high)
    values ('direct', v_low, v_high)
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_caller), (v_conversation_id, other_user_id);
  exception
    when unique_violation then
      select id into v_conversation_id
      from public.conversations
      where kind = 'direct' and direct_member_low = v_low and direct_member_high = v_high;
  end;

  return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public;
grant execute on function public.create_direct_conversation(uuid) to authenticated;
