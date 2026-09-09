-- Phase 4 Slice L: read-only moderation-actions history view — database
-- contract only. Additive: no existing table, column, index, or trigger is
-- edited or dropped. Three changes onto the existing objects shipped by
-- 20260831151303_moderation_enforcement.sql:
--   1. The `authenticated` SELECT grant that migration deliberately shipped
--      on public.moderation_actions ("a plain authenticated SELECT,
--      RLS-gated exactly like public.reports already is, is sufficient...
--      no dedicated read RPC or history view was built this slice") is
--      revoked here, now that this slice gives it the dedicated RPC that
--      comment anticipated. RLS and its one policy stay exactly as shipped
--      — untouched, and correct in their own right — but with the grant
--      gone there is nothing left for a client to read directly at all.
--   2. public.list_moderation_actions(...) becomes the sole client-readable
--      boundary onto this table: SECURITY DEFINER, active-moderator-only,
--      keyset-paginated, returning only what an audit trail needs —
--      never moderator_id, reporter identity, reported-user identity,
--      report details, or message content.
--   3. moderation_actions_created_at_id_idx is added to serve that RPC's
--      own global-feed access path (p_report_id omitted) — see its own
--      comment below for why this one is justified by the exact production
--      query rather than speculative, the same bar every other index
--      decision in this schema is already held to.
--
-- Nothing about the ledger's own write path changes: moderate_reported_
-- message() (20260831151303_moderation_enforcement.sql) remains the sole
-- writer, the moderation_actions_immutable trigger still unconditionally
-- blocks UPDATE/DELETE regardless of grants, and no INSERT/UPDATE/DELETE/
-- TRUNCATE grant of any kind is added here for any role. No new
-- enforcement action type, no mutation RPC, no bulk action, no
-- notification, no appeal, no mute, no account-level enforcement, no
-- project-messaging surface — message-only Hide/Restore via a resolved
-- message report remains the entire enforcement capability this schema
-- supports.

-- ==========================================================================
-- 1. Revoke the interim raw SELECT grant — list_moderation_actions() below
-- replaces it as the sole read boundary.
-- ==========================================================================

revoke select on public.moderation_actions from authenticated;

-- ==========================================================================
-- 2. public.list_moderation_actions(p_limit, p_cursor_created_at,
-- p_cursor_id, p_report_id)
--
-- SECURITY DEFINER is required — moderation_actions now grants no client
-- SELECT of any kind (see above), the same justification list_moderation_
-- reports()/moderate_reported_message() already document for their own
-- access to reports/messages. search_path = '' with every reference
-- schema-qualified, bound to auth.uid() internally via private.is_active_
-- moderator() — no p_moderator_id parameter of any kind, and the check is
-- re-run on every call, never trusting a prior check_moderator_access()
-- result.
--
-- Pagination: the identical (created_at desc, id desc) keyset idiom
-- list_moderation_reports()/fetchMessages() already establish, applied here
-- to moderation_actions' own (created_at, id) pair. p_limit is safely
-- clamped even when explicitly passed as NULL (coalesce before the bounds
-- check, not after — a bare `greatest(p_limit, 1)` would itself throw on a
-- null input rather than falling back to the default). The cursor is an
-- all-or-nothing pair, identical to list_moderation_reports()'s own
-- validation. v_limit + 1 rows are fetched so has_more is read directly off
-- whether that extra row exists — never inferred from a separate count(*)
-- window function repeated per row — and both has_more and the caller's
-- own nextCursor are derived from the *last row actually returned* (not the
-- discarded v_limit+1'th row), so a client cursoring off nextCursor can
-- never skip or duplicate a row at a page boundary.
--
-- p_report_id (optional, default null) scopes the result to one report's
-- own action history — e.g. an inline "this report's history" panel —
-- without needing a second RPC; omitted, it is a global feed across every
-- report a moderator has ever acted on.
--
-- Returned fields are deliberately narrow: action_id/report_id/message_id
-- (opaque references a moderator already has via list_moderation_reports()
-- evidence), action, moderator_display_name (accountable audit
-- attribution — the *acting* moderator's own name, resolved the identical
-- coalesce-to-"Profile unavailable" way reviewed_by_display_name already
-- is; never the raw moderator_id), report_category/report_target_kind
-- (already fully exposed to any moderator via list_moderation_reports(),
-- added here purely so a history row is human-readable without a second
-- lookup), the moderator's own note, and created_at. Never returned:
-- moderator_id, reporter_id/reported_user_id or any display name derived
-- from them, reports.details, or messages.body — this is an audit trail of
-- moderator actions, not a second evidence-access surface.
-- ==========================================================================

create or replace function public.list_moderation_actions(
  p_limit integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_report_id uuid default null
)
returns table (
  action_id uuid,
  report_id uuid,
  message_id uuid,
  action public.moderation_action_type,
  moderator_display_name text,
  report_category public.report_category,
  report_target_kind public.report_target_kind,
  note text,
  created_at timestamptz,
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
    raise exception 'list_moderation_actions: active moderator access required';
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'list_moderation_actions: cursor must include both created_at and id, or neither';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 25), 1), 50);

  return query
  with candidates as (
    select
      ma.id,
      ma.report_id,
      ma.message_id,
      ma.action,
      coalesce(mod.display_name, 'Profile unavailable') as moderator_display_name,
      r.category as report_category,
      r.target_kind as report_target_kind,
      ma.note,
      ma.created_at
    from public.moderation_actions ma
    left join public.profiles mod on mod.id = ma.moderator_id
    left join public.reports r on r.id = ma.report_id
    where (p_report_id is null or ma.report_id = p_report_id)
      and (
        p_cursor_created_at is null
        or (ma.created_at, ma.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by ma.created_at desc, ma.id desc
    limit v_limit + 1
  )
  select
    c.id,
    c.report_id,
    c.message_id,
    c.action,
    c.moderator_display_name,
    c.report_category,
    c.report_target_kind,
    c.note,
    c.created_at,
    (count(*) over ()) > v_limit as has_more
  from candidates c
  order by c.created_at desc, c.id desc
  limit v_limit;
end;
$$;

revoke all on function public.list_moderation_actions(integer, timestamptz, uuid, uuid) from public;
grant execute on function public.list_moderation_actions(integer, timestamptz, uuid, uuid) to authenticated;

-- ==========================================================================
-- 3. moderation_actions_created_at_id_idx
--
-- Justified by the exact production query above, not speculative: the
-- global feed (p_report_id omitted — the RPC's own default and the primary
-- "History" tab view) filters by no report_id at all, and orders/keyset-
-- paginates by created_at desc, id desc. Neither existing index on this
-- table serves that access path — moderation_actions_report_id_idx is keyed
-- on report_id (irrelevant once no report_id filter is applied), and
-- moderation_actions_message_id_created_at_idx is keyed on
-- (message_id, created_at desc), whose leading column the global feed never
-- filters on either. Without a covering index, the global feed's ORDER BY
-- would force a full sequential scan plus an explicit sort on every call.
-- Absence of an "unindexed" advisor finding is not proof this query is
-- already served — the advisor only flags unindexed foreign keys and
-- genuinely unused indexes; it does not analyze this RPC's own query shape
-- at all. (created_at, id) — not action_id, the RETURNS TABLE alias — since
-- the underlying physical column moderation_actions.id is what the query
-- planner actually needs to match against this index; action_id is only the
-- external name assigned in the function's own output projection.
create index moderation_actions_created_at_id_idx
  on public.moderation_actions (created_at desc, id desc);
