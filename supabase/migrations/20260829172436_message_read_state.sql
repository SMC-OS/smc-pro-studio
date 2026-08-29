-- Phase 4 Slice E: secure direct-message read-state database foundation only.
-- Additive only — no existing migration, table, policy, grant, or column is
-- modified. No route/component/Realtime/notification/badge code is added —
-- see supabase/tests/database/direct_messaging.test.sql for the behavioural
-- proof this migration is limited to what is described below.
--
-- Adds:
--   1. a supporting uniqueness constraint on public.messages so a message
--      cursor can be declaratively pinned to its own conversation and to
--      that message's real, confirmed timestamp — not just its id;
--   2. public.message_read_state — one authenticated member's high-water
--      read position per direct conversation, never readable by any other
--      participant;
--   3. public.mark_conversation_read(conversation_id, message_id) — the sole
--      client-reachable write path for that state, monotonic and
--      membership/ownership-checked;
--   4. public.get_unread_message_counts() — the sole client-reachable read
--      path for per-conversation unread incoming-message counts.
--
-- Out of scope here (deferred to a later slice): badges, notifications,
-- Realtime read receipts, routes/components, and any client wiring.

-- ==========================================================================
-- 1. Supporting constraint on public.messages.
--
-- public.messages.id is already globally unique (primary key), so
-- (conversation_id, created_at, id) is already unique as a tuple — this
-- constraint only makes that tuple usable as an explicit composite
-- foreign-key target, letting message_read_state's cursor FK below declare
-- "this cursor's (created_at, id) pair is the real, current row for this
-- conversation" at the database level. A two-column (conversation_id, id)
-- target (this migration's original shape) could only prove the id belongs
-- to the conversation — it could not also prove the stored
-- last_read_message_created_at was not falsified, stale, or simply wrong,
-- since a bare FK on id alone never re-checks any other column against the
-- referenced row. Column order — conversation_id, then (created_at, id) —
-- matches the deterministic ordering already used for message sort order
-- everywhere else (messagingClient.ts's MessageCursor / ThreadView's
-- sortChronological) and below in message_read_state_cursor_fk. No existing
-- constraint, index, or column is touched.
-- ==========================================================================

alter table public.messages
  add constraint messages_conversation_id_created_at_id_key
    unique (conversation_id, created_at, id);

-- ==========================================================================
-- 2. message_read_state
--
-- One row per (conversation_id, user_id): the caller's own high-water read
-- cursor for that conversation, expressed as the deterministic
-- (created_at, id) tuple already used for message ordering everywhere else
-- (messagingClient.ts's MessageCursor / ThreadView's sortChronological) —
-- not a bare timestamp, which could tie between two messages sent in the
-- same instant and make "newer" ambiguous. A row is created lazily, only
-- once mark_conversation_read() is first called for that pair (see below);
-- no row existing for a given (conversation_id, user_id) is itself the
-- documented "nothing read yet" first-use state, not a row with null
-- columns — the not-null-together check below is defense in depth for any
-- future write path, not a state this migration's own RPC ever produces.
--
-- Security posture: RLS-enabled, owner-only SELECT, and — deliberately —
-- no INSERT/UPDATE/DELETE grant to any client role at all (see the grants
-- section below). Monotonicity (never move the cursor backwards, even under
-- concurrent calls) cannot be expressed as a static per-row CHECK constraint
-- — it is a transition constraint comparing the new row to the row already
-- committed — so it is enforced by the single atomic
-- INSERT ... ON CONFLICT ... DO UPDATE ... WHERE <newer> statement inside
-- mark_conversation_read() instead, exactly the same reasoning that makes
-- create_direct_conversation() (not raw client inserts) the sole write path
-- for conversations/conversation_members in
-- 20260824090000_direct_messaging_foundation.sql.
-- ==========================================================================

create table public.message_read_state (
  conversation_id uuid not null,
  user_id uuid not null,
  -- Nullable pair: always both-null (no row state is used instead, see
  -- above) or both-set — never a bare timestamp with no id, or an id with
  -- no timestamp. Enforced below by message_read_state_cursor_consistent.
  last_read_message_id uuid,
  last_read_message_created_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id),

  -- "The user must genuinely be a member of that conversation" — enforced
  -- declaratively, not just checked once at RPC call time: this FK makes it
  -- impossible for a row to exist for a (conversation_id, user_id) pair that
  -- is not an actual conversation_members row, and ON DELETE CASCADE means a
  -- future membership/conversation removal path can never leave an orphaned
  -- read-state row behind (conversation_members already cascades from
  -- conversations, so this cascades transitively from a conversation delete
  -- too — today neither deletion path is client-reachable, but the
  -- invariant holds regardless of how a row is ever removed).
  constraint message_read_state_member_fk
    foreign key (conversation_id, user_id)
    references public.conversation_members (conversation_id, user_id)
    on delete cascade,

  -- "A stored message cursor must be the real, current row for this
  -- conversation" — enforced declaratively against
  -- messages_conversation_id_created_at_id_key above as the complete
  -- three-column tuple, not the id alone: a two-column (conversation_id, id)
  -- FK would prove the id belongs to the conversation but would leave
  -- last_read_message_created_at entirely unchecked against the real row,
  -- letting it silently diverge from the message's actual created_at and
  -- corrupt the (created_at, id) ordering both get_unread_message_counts()
  -- and this RPC's own monotonic WHERE rely on. Column order —
  -- (conversation_id, last_read_message_created_at, last_read_message_id) —
  -- matches messages_conversation_id_created_at_id_key's own
  -- (conversation_id, created_at, id) order above, and the same
  -- (created_at, id) ordering convention used everywhere else. No ON DELETE
  -- action is declared (defaults to NO ACTION/restrict): messages are
  -- append-only with no delete grant anywhere in this schema, so this edge
  -- is unreachable today; NO ACTION is chosen defensively over CASCADE/SET
  -- NULL so that if a message-deletion path is ever introduced later, it
  -- cannot silently erase or reset a user's real read position as a side
  -- effect — it would have to be handled explicitly instead.
  constraint message_read_state_cursor_fk
    foreign key (conversation_id, last_read_message_created_at, last_read_message_id)
    references public.messages (conversation_id, created_at, id),

  constraint message_read_state_cursor_consistent check (
    (last_read_message_id is null and last_read_message_created_at is null)
    or (last_read_message_id is not null and last_read_message_created_at is not null)
  )
);

-- Reuses the existing shared trigger function (private.set_updated_at(),
-- 20260818194558_identity_profiles_roles.sql) rather than duplicating it —
-- same convention already applied to profiles/professional_profiles.
create trigger message_read_state_set_updated_at
before update on public.message_read_state
for each row execute function private.set_updated_at();

alter table public.message_read_state enable row level security;

-- Owner-only read: no policy lets any other conversation member — even a
-- fellow participant in the same conversation — select this table at all.
-- This is the privacy boundary the whole design exists to protect: read
-- position belongs only to the authenticated user who owns it.
create policy message_read_state_owner_read
on public.message_read_state for select
to authenticated
using ((select auth.uid()) = user_id);

-- No insert/update/delete policy of any kind, and (see below) no such grant
-- either: mark_conversation_read() — SECURITY DEFINER, owned by the
-- migration role — is the only way this table is ever written. A per-row
-- RLS WITH CHECK could enforce ownership on a direct client write, but it
-- could not enforce monotonicity (comparing the new row to the previously
-- committed one), so allowing any direct client write path at all would
-- reopen exactly the "move the cursor backwards" hole this table exists to
-- close.
revoke all on public.message_read_state from anon, authenticated;
grant select on public.message_read_state to authenticated;

-- ==========================================================================
-- 3. mark_conversation_read: the sole client-reachable write path.
--
-- SECURITY DEFINER is genuinely necessary here (not a default choice): the
-- table above grants no client INSERT/UPDATE at all (see above), so a
-- SECURITY INVOKER function would have nothing to write through even for a
-- caller updating their own row, and the monotonic
-- INSERT ... ON CONFLICT ... WHERE <newer> statement below has to run with
-- the privilege to write regardless of the caller's own (deliberately
-- absent) table grants — the same justification
-- create_direct_conversation() already documents for conversations/
-- conversation_members.
--
-- No p_user_id parameter exists — the acting user is always auth.uid(),
-- exactly like private.is_conversation_member() — so there is no argument
-- through which a caller could ever write or alter another user's state.
-- ==========================================================================

-- Returns SETOF the real table row (not RETURNS TABLE(...)): RETURNS
-- TABLE's column list is implicitly declared as PL/pgSQL OUT-parameter
-- variables in scope for the whole function body, which would collide with
-- and shadow the identically-named columns referenced below in
-- `on conflict (conversation_id, user_id)` (bare column references there
-- cannot be schema/alias-qualified) — confirmed by hitting Postgres's own
-- "column reference is ambiguous" error while first writing this function.
-- SETOF a real table's row type introduces no such implicit variables.
create or replace function public.mark_conversation_read(
  p_conversation_id uuid,
  p_message_id uuid
)
returns setof public.message_read_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_message_created_at timestamptz;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'mark_conversation_read: authentication required';
  end if;

  if p_conversation_id is null or p_message_id is null then
    raise exception 'mark_conversation_read: conversation_id and message_id are required';
  end if;

  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = v_caller
  ) then
    raise exception 'mark_conversation_read: not a member of this conversation';
  end if;

  -- Scoped by conversation_id in the same lookup, not just id: a message
  -- that exists but belongs to a different conversation is indistinguishable
  -- from a message that does not exist at all — both raise the identical
  -- exception below, so this never confirms or denies another
  -- conversation's message ids to a real member of this one.
  select m.created_at into v_message_created_at
  from public.messages m
  where m.id = p_message_id and m.conversation_id = p_conversation_id;

  if v_message_created_at is null then
    raise exception 'mark_conversation_read: message not found in this conversation';
  end if;

  -- Atomic, race-safe upsert: two concurrent calls (the same message marked
  -- repeatedly, an older request arriving after a newer one, or two tabs
  -- marking different messages at once) serialize on the row lock ON
  -- CONFLICT takes, so whichever commits first sets the row, and every
  -- later call's WHERE re-evaluates against that already-committed state —
  -- an equal or older (created_at, id) tuple always fails the WHERE and
  -- becomes a safe no-op; only a genuinely newer tuple ever advances it.
  -- First-ever call for this (conversation_id, user_id) hits no conflict at
  -- all and inserts unconditionally (the WHERE only gates the update arm).
  insert into public.message_read_state
    (conversation_id, user_id, last_read_message_id, last_read_message_created_at)
  values
    (p_conversation_id, v_caller, p_message_id, v_message_created_at)
  on conflict (conversation_id, user_id) do update
  set last_read_message_id = excluded.last_read_message_id,
      last_read_message_created_at = excluded.last_read_message_created_at
  where (excluded.last_read_message_created_at, excluded.last_read_message_id)
      > (public.message_read_state.last_read_message_created_at, public.message_read_state.last_read_message_id);

  return query
  select mrs.*
  from public.message_read_state mrs
  where mrs.conversation_id = p_conversation_id and mrs.user_id = v_caller;
end;
$$;

revoke all on function public.mark_conversation_read(uuid, uuid) from public;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;

-- ==========================================================================
-- 4. get_unread_message_counts: the sole client-reachable read path for
-- unread incoming-message counts.
--
-- SECURITY INVOKER (not DEFINER) deliberately: every table this reads is
-- already scoped correctly for the calling authenticated role under its own
-- existing RLS — conversation_members via `cm.user_id = (select auth.uid())`
-- (a subset of what conversation_members_member_read already allows),
-- message_read_state via the owner-only policy above (the join's own
-- `rs.user_id = cm.user_id` condition already forces this to the caller's
-- own row), and messages via the unchanged messages_member_read policy
-- (the caller is, by construction of the first join, a genuine member of
-- every m.conversation_id this query ever touches). Nothing here needs to
-- run with elevated privilege, so it does not.
--
-- Deliberately zero parameters: there is no argument through which a caller
-- could ask about any conversation or user other than themselves, so there
-- is no probing surface to fail closed against beyond the join conditions
-- themselves.
--
-- First-use contract: a conversation with no message_read_state row yet
-- (rs.last_read_message_created_at is null) counts every qualifying message
-- as unread — i.e. "never read" means "everything since joining is
-- unread," not zero.
-- ==========================================================================

create or replace function public.get_unread_message_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    cm.conversation_id,
    count(m.id)::bigint as unread_count
  from public.conversation_members cm
  left join public.message_read_state rs
    on rs.conversation_id = cm.conversation_id
    and rs.user_id = cm.user_id
  left join public.messages m
    on m.conversation_id = cm.conversation_id
    -- Sender's own messages are never unread to themselves.
    and m.sender_id <> cm.user_id
    -- "Never count messages predating the caller's membership": bounded by
    -- the caller's own joined_at, not just conversation creation, so a
    -- future membership model where a member is added after messages
    -- already exist stays correct without further change here.
    and m.created_at >= cm.joined_at
    and (
      rs.last_read_message_created_at is null
      or (m.created_at, m.id) > (rs.last_read_message_created_at, rs.last_read_message_id)
    )
  where cm.user_id = (select auth.uid())
  group by cm.conversation_id
  order by cm.conversation_id;
$$;

revoke all on function public.get_unread_message_counts() from public;
grant execute on function public.get_unread_message_counts() to authenticated;
