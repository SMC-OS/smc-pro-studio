-- Phase 4 Slice K: secure manual message moderation enforcement — database
-- transition contract only. Additive only — no existing migration, table,
-- policy, grant, or column is edited; every change below either adds a new
-- object or replaces an existing policy/function via DROP+CREATE inside this
-- new file (the established technique — Slice J's own migration already
-- documents this distinction between "editing a historical migration" and
-- "a later migration altering a live object"). No existing RLS predicate on
-- reports, and no existing behaviour of check_moderator_access()/
-- review_report(), changes.
--
-- Scope, per the approved product decisions for this slice:
--   1. Hiding a message removes it from BOTH conversation members —
--      including its own sender — never just "other" viewers. Moderator
--      evidence access is untouched (list_moderation_reports() below reads
--      the message directly, never through this RLS policy).
--   2. Message enforcement only — no profile/post/comment enforcement
--      objects of any kind exist after this migration.
--   3. Nothing here pre-creates schema for a future action this slice does
--      not implement — the same "don't decorate ahead of the slice that
--      gives it meaning" discipline moderation_status/post_type/
--      conversation_kind already established.
--   4. Every hide/restore is manual (moderator-initiated only, no
--      automatic/report-count/AI trigger of any kind), reversible (restore
--      is a first-class, equally-audited action, never a destructive
--      delete), and append-only audited (moderation_actions is a pure
--      insert-only ledger — no UPDATE/DELETE grant or policy exists for any
--      role, and a trigger independently blocks it regardless of grants).
--   5. No punishment beyond the message-visibility change itself — no
--      block/role-change/notification/deletion of any kind is written by
--      this migration's own function.
--
-- Adds:
--   1. public.messages.moderation_status — reuses the existing
--      public.moderation_status enum (already shipped for posts/comments in
--      20260819120000_social_core.sql; deliberately not reused for messages
--      at the time, per that migration's own comment: "Adding it now would
--      be unusable schema decoration ahead of the report/removal slice that
--      would give it meaning... Revisit when that slice is designed." This
--      is that slice.) — no dedicated index (deliberately: see the column's
--      own comment below for why one is not justified without a proven
--      query plan).
--   2. A replaced messages_member_read RLS policy (drop+recreate) adding
--      `and moderation_status = 'visible'` — the only RLS change in this
--      migration; every other existing messages policy is untouched.
--   3. reports_id_message_id_key — a supporting composite unique constraint
--      on the existing public.reports table, the same "prove the complete
--      real row, not just its id" idiom messages_id_conversation_id_
--      sender_id_key (20260830105617_reporting_foundation.sql) and
--      messages_conversation_id_created_at_id_key
--      (20260829172436_message_read_state.sql) already established —
--      technically redundant as a uniqueness guarantee (reports.id is
--      already the primary key) but required to make (id, message_id) a
--      valid composite foreign-key target below.
--   4. public.moderation_action_type — a two-value enum ('hide_message',
--      'restore_message'); no other value exists, per decision 2/3 above.
--   5. public.moderation_actions — a new, append-only, moderator-only-
--      readable audit ledger, the exact table tasks/plan.md's own original
--      Phase-1 Safety-domain table already named ("reports,
--      moderation_actions, notifications... actions append-only/audited")
--      but never built until now. private.moderation_actions_prevent_
--      modification() + a BEFORE UPDATE OR DELETE trigger makes "this table
--      is never modified, only appended to" a database invariant, not
--      merely something true because the one function that writes it today
--      happens to only INSERT.
--   6. public.moderate_reported_message(report_id, action, note) — the sole
--      client-reachable write path onto both messages.moderation_status and
--      moderation_actions: one atomic, conflict-of-interest-checked,
--      compare-and-swap transition per call, exactly mirroring
--      review_report()'s own atomicity/conflict-of-interest/note-validation
--      discipline. Only reachable for a report that is target_kind =
--      'message' and status = 'resolved' — a pending, dismissed, or
--      profile-target report is never enforceable, and the reporter/
--      reported party can never enforce their own report, the same rule
--      review_report() already established for reviewing one.
--   7. list_moderation_reports() is replaced (drop+recreate — its own
--      RETURNS TABLE shape is changing, which Postgres does not allow via a
--      plain CREATE OR REPLACE) to add one new output column,
--      message_moderation_status, so the moderation UI can tell whether the
--      exact reported message is currently hidden or visible without a
--      second round trip. Every other column, and the function's own
--      authorization/evidence-shape/pagination logic, is byte-for-byte
--      unchanged from 20260830193342_moderation_review.sql.
--
-- Out of scope here (deliberately, per the approved decisions): any
-- profile/post/comment enforcement action or column; account-level
-- warnings/suspensions/bans; appeals; notifications of any kind; automatic
-- or report-count-triggered enforcement; reassignment between moderators; a
-- history-of-actions read API beyond moderation_actions' own standard
-- moderator-only SELECT grant (no dedicated RPC is added for it — a plain
-- authenticated SELECT, RLS-gated exactly like public.reports already is,
-- is sufficient and consistent with that precedent).

-- ==========================================================================
-- 1. public.messages.moderation_status
-- ==========================================================================

alter table public.messages
  add column moderation_status public.moderation_status not null default 'visible';

-- Deliberately no dedicated index on this column. The approved spec
-- prohibits a standalone moderation-status index unless an actual query
-- plan proves it useful, and none was produced: every read this column
-- participates in is already conversation-scoped first (messages_member_read
-- below narrows on conversation_id via private.is_conversation_member(),
-- and the existing messages_conversation_created_idx already covers that
-- access path), so moderation_status is evaluated as a cheap row filter
-- against a handful of already-narrowed rows, never as a scan key on its
-- own. Add one later only if a real EXPLAIN on a real query proves it
-- pays for its own write/storage overhead.
--
-- Replaces messages_member_read (20260824090000_direct_messaging_foundation.sql)
-- with the identical predicate plus one added clause. Per decision 1 above,
-- this is deliberately a single unconditional clause — no sender-exception
-- carve-out (unlike posts_owner_read's own author-can-still-see-their-own-
-- removed-post precedent) — a hidden message is invisible to every
-- conversation member, including whoever sent it. Moderator evidence access
-- is entirely unaffected: list_moderation_reports() below reads the message
-- directly via its own SECURITY DEFINER join, never through this policy.
drop policy messages_member_read on public.messages;

create policy messages_member_read
on public.messages for select
to authenticated
using (private.is_conversation_member(conversation_id) and moderation_status = 'visible');

-- ==========================================================================
-- 2. Supporting composite unique constraint on the existing reports table —
-- makes (id, message_id) a valid foreign-key target below, the same
-- "declaratively prove the complete real row" idiom this schema already
-- uses twice for an analogous reason.
-- ==========================================================================

alter table public.reports
  add constraint reports_id_message_id_key unique (id, message_id);

-- ==========================================================================
-- 3. public.moderation_action_type / public.moderation_actions
--
-- Exactly two action values — hide_message / restore_message — because this
-- slice supports message enforcement only (decision 2) and must not
-- pre-create an action type for anything else (decision 3).
--
-- moderation_actions_report_message_fk — a composite FK on
-- (report_id, message_id) referencing reports_id_message_id_key above — has
-- a genuinely useful side effect beyond "the message_id matches this
-- report's own message_id": since reports.message_id is NOT NULL only for
-- target_kind = 'message' rows (reports_target_shape_consistent,
-- 20260830105617_reporting_foundation.sql, unchanged), and this table's own
-- message_id column is NOT NULL, no row here can ever reference a
-- profile-target report at all — the FK alone makes that structurally
-- impossible, not merely something moderate_reported_message()'s own logic
-- happens to check today.
-- ==========================================================================

create type public.moderation_action_type as enum ('hide_message', 'restore_message');

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id),
  message_id uuid not null references public.messages (id),
  action public.moderation_action_type not null,
  moderator_id uuid not null references public.profiles (id) on delete restrict,
  -- Same trimmed/bounded discipline as reports.review_note — null (no note
  -- supplied) is always fine.
  note text check (note is null or (note = btrim(note) and char_length(note) between 1 and 1000)),
  created_at timestamptz not null default now(),

  constraint moderation_actions_report_message_fk
    foreign key (report_id, message_id) references public.reports (id, message_id)
);

create index moderation_actions_report_id_idx on public.moderation_actions (report_id);
create index moderation_actions_message_id_created_at_idx on public.moderation_actions (message_id, created_at desc);

-- Append-only, unconditionally — unlike reports_prevent_immutable_field_changes
-- (which only freezes a report once it leaves 'pending'), no row in this
-- ledger is ever mutable at any time: a "reversal" is always a new row, never
-- an edit of an old one. No elevated privilege is needed (only OLD/NEW on the
-- row already being touched), so no SECURITY DEFINER; search_path is still
-- pinned regardless, matching the advisor-caught precedent already recorded
-- in 20260830193342_moderation_review.sql for the identical reasoning.
create or replace function private.moderation_actions_prevent_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'moderation_actions: an audit record can never be modified or deleted, only appended to';
end;
$$;

revoke all on function private.moderation_actions_prevent_modification() from public;

create trigger moderation_actions_immutable
before update or delete on public.moderation_actions
for each row execute function private.moderation_actions_prevent_modification();

alter table public.moderation_actions enable row level security;

-- Same "broad table-level SELECT grant, narrow RLS predicate does the real
-- work" pattern reports_moderator_read already established.
create policy moderation_actions_moderator_read
on public.moderation_actions for select
to authenticated
using (private.is_active_moderator());

revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;
-- Deliberately no insert/update/delete grant to any client role at all —
-- moderate_reported_message() below (SECURITY DEFINER, table owner) is the
-- sole writer, and the trigger above independently blocks any future
-- UPDATE/DELETE regardless of privilege.

-- ==========================================================================
-- 4. public.moderate_reported_message(report_id, action, note)
--
-- SECURITY DEFINER is genuinely required — messages.moderation_status and
-- moderation_actions both grant no client write of any kind, the same
-- justification review_report() already documents for reports' own three
-- new columns. search_path = '' with every reference schema-qualified,
-- bound to auth.uid() with no p_moderator_id parameter of any kind.
--
-- Authorization is re-checked here independently (never trusting that a
-- prior check_moderator_access() call is still valid).
--
-- Conflict-of-interest: identical comparison to review_report() — a
-- moderator can never enforce a report they themselves submitted, or a
-- report about themselves.
--
-- Gate on report shape/status: only a target_kind = 'message', status =
-- 'resolved' report is ever enforceable — a pending or dismissed report has
-- not been decided as warranting action, and a profile-target report is
-- structurally excluded by moderation_actions_report_message_fk above
-- regardless. This never bypasses review_report()'s own review step; it can
-- only ever act on its outcome.
--
-- Atomicity ("two concurrent moderators cannot both win", "repeated calls
-- do not silently succeed", "only a message in the expected state can
-- transition"): one UPDATE ... WHERE moderation_status = <expected> ...
-- RETURNING per action — the identical compare-and-swap idiom review_report()
-- already established for reports.status, applied here to
-- messages.moderation_status instead. hide_message requires the message to
-- currently be 'visible'; restore_message requires it to currently be
-- 'removed_by_moderator'. A losing concurrent call's WHERE clause matches
-- nothing once the winner has committed, so NOT FOUND is reached and it
-- raises rather than silently reporting success a second time.
--
-- Reversal: restore_message is a fully equal, independently-audited action —
-- never an UPDATE or deletion of the original hide_message ledger row. A
-- message can be hidden, restored, and hidden again any number of times;
-- every transition is its own permanent moderation_actions row.
--
-- Returns only the minimal server-confirmed result the UI needs: the new
-- ledger row's id, the affected message's id, its new moderation_status, and
-- the ledger row's own database-generated created_at. The note text and
-- acting moderator identity are not echoed back — the caller already knows
-- both.
-- ==========================================================================

create or replace function public.moderate_reported_message(
  p_report_id uuid,
  p_action public.moderation_action_type,
  p_note text default null
)
returns table (
  action_id uuid,
  message_id uuid,
  moderation_status public.moderation_status,
  acted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_note text;
  v_report public.reports;
  v_expected_prior public.moderation_status;
  v_new_status public.moderation_status;
  v_updated_message public.messages;
  v_action_id uuid;
  v_action_created_at timestamptz;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'moderate_reported_message: authentication required';
  end if;

  if not private.is_active_moderator() then
    raise exception 'moderate_reported_message: active moderator access required';
  end if;

  if p_report_id is null then
    raise exception 'moderate_reported_message: report_id is required';
  end if;

  if p_action is null then
    raise exception 'moderate_reported_message: action is required';
  end if;

  if p_note is not null then
    v_note := btrim(p_note);
    if v_note = '' then
      raise exception 'moderate_reported_message: note cannot be whitespace-only';
    end if;
    if char_length(v_note) > 1000 then
      raise exception 'moderate_reported_message: note must be 1000 characters or fewer';
    end if;
  else
    v_note := null;
  end if;

  select r.* into v_report from public.reports r where r.id = p_report_id;
  if v_report.id is null then
    raise exception 'moderate_reported_message: report not found';
  end if;
  if v_report.target_kind <> 'message' then
    raise exception 'moderate_reported_message: report is not a message report';
  end if;
  if v_report.status <> 'resolved' then
    raise exception 'moderate_reported_message: report must be resolved before enforcement';
  end if;
  if v_report.reporter_id = v_caller then
    raise exception 'moderate_reported_message: cannot enforce a report you submitted';
  end if;
  if v_report.reported_user_id = v_caller then
    raise exception 'moderate_reported_message: cannot enforce a report about yourself';
  end if;

  if p_action = 'hide_message' then
    v_expected_prior := 'visible';
    v_new_status := 'removed_by_moderator';
  elsif p_action = 'restore_message' then
    v_expected_prior := 'removed_by_moderator';
    v_new_status := 'visible';
  else
    raise exception 'moderate_reported_message: unrecognized action';
  end if;

  update public.messages as m
  set moderation_status = v_new_status
  where m.id = v_report.message_id and m.moderation_status = v_expected_prior
  returning m.* into v_updated_message;

  if not found then
    if p_action = 'hide_message' then
      raise exception 'moderate_reported_message: message is not currently visible';
    else
      raise exception 'moderate_reported_message: message is not currently hidden';
    end if;
  end if;

  insert into public.moderation_actions (report_id, message_id, action, moderator_id, note)
  values (p_report_id, v_report.message_id, p_action, v_caller, v_note)
  returning id, created_at into v_action_id, v_action_created_at;

  return query select v_action_id, v_updated_message.id, v_updated_message.moderation_status, v_action_created_at;
end;
$$;

revoke all on function public.moderate_reported_message(uuid, public.moderation_action_type, text) from public;
grant execute on function public.moderate_reported_message(uuid, public.moderation_action_type, text) to authenticated;

-- ==========================================================================
-- 5. list_moderation_reports() — replaced (drop+recreate; RETURNS TABLE
-- shape is changing, which plain CREATE OR REPLACE cannot do) to add
-- message_moderation_status, so the moderation UI can render Hide vs.
-- Restore without a second call. Everything else — parameters, pagination,
-- evidence shape, authorization — is byte-for-byte unchanged from
-- 20260830193342_moderation_review.sql.
-- ==========================================================================

drop function public.list_moderation_reports(public.report_status, integer, timestamptz, uuid);

create or replace function public.list_moderation_reports(
  p_status public.report_status,
  p_limit integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  report_id uuid,
  target_kind public.report_target_kind,
  category public.report_category,
  details text,
  created_at timestamptz,
  status public.report_status,
  reviewed_at timestamptz,
  reviewed_by_display_name text,
  review_note text,
  reporter_display_name text,
  reported_display_name text,
  message_body text,
  message_created_at timestamptz,
  message_moderation_status public.moderation_status,
  has_more boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if not private.is_active_moderator() then
    raise exception 'list_moderation_reports: active moderator access required';
  end if;

  if p_status is null then
    raise exception 'list_moderation_reports: status is required';
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'list_moderation_reports: cursor must include both created_at and id, or neither';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 25), 1), 50);

  return query
  with candidates as (
    select
      r.id,
      r.target_kind,
      r.category,
      r.details,
      r.created_at,
      r.status,
      r.reviewed_at,
      case when r.reviewed_by_user_id is not null then coalesce(reviewer.display_name, 'Profile unavailable') else null end as reviewed_by_display_name,
      r.review_note,
      coalesce(reporter.display_name, 'Profile unavailable') as reporter_display_name,
      coalesce(reported.display_name, 'Profile unavailable') as reported_display_name,
      m.body as message_body,
      m.created_at as message_created_at,
      m.moderation_status as message_moderation_status
    from public.reports r
    left join public.profiles reporter on reporter.id = r.reporter_id
    left join public.profiles reported on reported.id = r.reported_user_id
    left join public.profiles reviewer on reviewer.id = r.reviewed_by_user_id
    left join public.messages m on m.id = r.message_id
    where r.status = p_status
      and (
        p_cursor_created_at is null
        or (r.created_at, r.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by r.created_at desc, r.id desc
    limit v_limit + 1
  )
  select
    c.id,
    c.target_kind,
    c.category,
    c.details,
    c.created_at,
    c.status,
    c.reviewed_at,
    c.reviewed_by_display_name,
    c.review_note,
    c.reporter_display_name,
    c.reported_display_name,
    c.message_body,
    c.message_created_at,
    c.message_moderation_status,
    (count(*) over ()) > v_limit as has_more
  from candidates c
  order by c.created_at desc, c.id desc
  limit v_limit;
end;
$$;

revoke all on function public.list_moderation_reports(public.report_status, integer, timestamptz, uuid) from public;
grant execute on function public.list_moderation_reports(public.report_status, integer, timestamptz, uuid) to authenticated;
