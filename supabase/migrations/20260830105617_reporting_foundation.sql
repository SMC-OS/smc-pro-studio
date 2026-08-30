-- Phase 4 Slice H: secure user/message reporting database foundation only.
-- Additive only — no existing migration, table, policy, grant, or column is
-- modified. No route/component/client/moderation-dashboard/notification code
-- is added; see supabase/tests/database/reporting.test.sql for the
-- behavioural proof this migration is limited to what is described below.
--
-- Adds:
--   1. public.report_category / public.report_target_kind / public.report_status
--      — the smallest stable reporting vocabulary;
--   2. public.report_receipt — a lightweight composite return shape (not a
--      table) so a submission function can return exactly the minimal
--      confirmed fields a reporter is allowed to see, never the full row;
--   3. a supporting composite unique constraint on public.messages so a
--      report row can be declaratively proven to reference a real message
--      that belongs to its stored conversation and was actually sent by the
--      stored reported user — in one constraint, not three application checks;
--   4. public.reports — one normalized table for both profile and message
--      reports, RLS-enabled, readable only by an active moderator
--      (private.is_active_moderator(), new — see below), writable only
--      through the two SECURITY DEFINER functions below;
--   5. private.is_active_moderator() — the authorization boundary this slice
--      was told to find, not invent: public.staff_role already ships a
--      'moderator' value (20260818194558_identity_profiles_roles.sql), and
--      public.moderation_status already ties the identical word to a content
--      -removal outcome ('removed_by_moderator', 20260819120000_social_core.sql)
--      — this function is the first thing in the schema that actually checks
--      for it, via the pre-existing, fully audited public.user_roles table
--      (RLS-locked to nobody but the server since Slice-1; a client can
--      neither read nor write it). No new role is created here.
--   6. public.submit_profile_report(reported_user_id, category, details) and
--      public.submit_message_report(message_id, category, details) — the
--      only two client-reachable write paths onto public.reports.
--
-- Out of scope here (deferred to a later slice): reporting UI, moderation
-- dashboard, review-mutation API (status transitions are proven below via
-- direct fixture manipulation, not a client-reachable function — see the
-- test file), notifications, mute, automatic enforcement of any kind, and a
-- reporter-facing "my reports" read API (not required for this slice; see
-- tasks/plan.md's original Safety-domain table for that eventual intent).

-- ==========================================================================
-- 1. Reporting vocabulary.
--
-- report_category: the smallest stable set covering both profile and
-- message reports without inventing platform-specific taxonomy the product
-- has not defined anywhere else in this schema (no existing authoritative
-- category vocabulary was found in profiles/posts/messages — this is a new,
-- deliberately generic list).
--
-- report_status: exactly three values — 'pending' (the only status a client
-- can ever produce; the sole "active" status the duplicate-prevention
-- indexes below key on), and two terminal outcomes, 'resolved'/'dismissed',
-- that a future moderation-dashboard slice will transition to. No
-- 'under_review' intermediate state is added — this slice ships no mutation
-- API to ever set one, and the same "don't add schema decoration ahead of
-- the slice that gives it meaning" discipline social_core.sql's own
-- moderation_status comment already applies to messages is applied here:
-- only what this slice's own duplicate-lifecycle mechanism actually needs.
-- ==========================================================================

create type public.report_category as enum (
  'spam',
  'harassment',
  'hate_or_abuse',
  'threat_or_violence',
  'sexual_content',
  'impersonation',
  'scam_or_fraud',
  'other'
);

create type public.report_target_kind as enum ('profile', 'message');

create type public.report_status as enum ('pending', 'resolved', 'dismissed');

-- A composite return shape, not a table: it carries no RLS/grants of its own
-- to manage, and its very existence is the enforcement mechanism for
-- "reporter visibility" below — a submission function can only ever return
-- exactly these four fields, so there is no return-value path through which
-- reporter_id, reported_user_id, message_id, conversation_id, details, or
-- status could leak to the caller, regardless of anything else in the
-- function body.
create type public.report_receipt as (
  id uuid,
  target_kind public.report_target_kind,
  category public.report_category,
  created_at timestamptz
);

-- ==========================================================================
-- 2. Supporting constraint on public.messages.
--
-- public.messages.id is already globally unique (primary key), so
-- (id, conversation_id, sender_id) is already unique as a tuple — this
-- constraint only makes that tuple usable as an explicit composite foreign
-- key target below (reports_message_reference_fk), the same "prove the
-- complete real row, not just its id" idiom
-- messages_conversation_id_created_at_id_key
-- (20260829172436_message_read_state.sql) already established for exactly
-- this reason. No existing constraint, index, or column on messages is
-- touched — this is a second, independent supporting unique constraint
-- alongside that one, not a replacement for it.
-- ==========================================================================

alter table public.messages
  add constraint messages_id_conversation_id_sender_id_key
    unique (id, conversation_id, sender_id);

-- ==========================================================================
-- 3. public.reports
--
-- One normalized structure for both target types (target_kind), rather than
-- two separate tables, so the single pair of duplicate-prevention indexes
-- and the single moderator-read policy below cover both without
-- duplication. Every invariant the task requires is enforced declaratively,
-- not left to application discipline alone:
--
--   * reporter_id <> reported_user_id                — reports_no_self_report
--   * exactly one valid target shape                  — reports_target_shape_consistent
--   * a profile report has no message/conversation ref — reports_target_shape_consistent
--   * a message report references a real message,
--     belonging to the stored conversation, whose
--     real sender is the stored reported_user_id      — reports_message_reference_fk
--   * category is database constrained                — the enum type itself
--   * status is database constrained, server-controlled — the enum type,
--     plus no client grant of any kind on this column (see grants below)
--   * details bounded/trimmed/non-whitespace-only       — reports_details_bounded
--   * 'other' requires meaningful details                — reports_other_requires_details
--
-- Retention (task-required, explicit, deliberate): reporter_id and
-- reported_user_id reference public.profiles(id) with NO ON DELETE ACTION
-- (Postgres's default, "NO ACTION" — evaluated at end-of-statement,
-- functionally RESTRICT here since nothing in this migration or any earlier
-- one ever deletes a profiles row directly). This is a deliberate departure
-- from follows/connections/blocks/conversation_members, which all cascade
-- from profiles — those rows are the relationship itself and have no
-- independent evidentiary value once either party is gone; a report is
-- audit evidence about conduct, and "someone reported, or was reported,
-- for X" must not silently vanish because a profile was later removed.
-- message_id/conversation_id reference messages/conversations the same
-- (default, no ON DELETE clause) way, for the identical reason, mirroring
-- message_read_state_cursor_fk's own established "NO ACTION... so it cannot
-- silently erase... a future deletion path would have to be handled
-- explicitly instead" rationale (20260829172436_message_read_state.sql) —
-- neither table has any client-reachable delete path today regardless, so
-- this is forward-looking, not a change in present behavior. No backfill:
-- this migration inserts no report rows of its own.
--
-- No reviewer_id/reviewed_at/review_notes columns: this slice ships no
-- review-mutation API (see the file header), and adding those columns now
-- would be exactly the "unusable schema decoration ahead of the slice that
-- would give it meaning" social_core.sql's own moderation_status comment
-- already warns against for an analogous case. `status` alone is included
-- because — unlike reviewer identity/notes — it is genuinely load-bearing
-- for this slice's own duplicate-lifecycle mechanism below, not decoration.
-- ==========================================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  reported_user_id uuid not null references public.profiles (id),
  target_kind public.report_target_kind not null,
  message_id uuid references public.messages (id),
  conversation_id uuid references public.conversations (id),
  category public.report_category not null,
  -- Optional for every category except 'other' (reports_other_requires_details
  -- below); when present, must already be trimmed (no leading/trailing
  -- whitespace — a whitespace-only value normalizes to '' under btrim, which
  -- the length bound below then rejects) and 1..1000 characters. This column
  -- stores only what the reporter typed about the report itself — never
  -- message body text, display names, or any other mutable profile/message
  -- content; see reports_message_reference_fk above for why the real message
  -- is instead referenced by id, not copied.
  details text,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),

  constraint reports_no_self_report check (reporter_id <> reported_user_id),

  constraint reports_target_shape_consistent check (
    (target_kind = 'profile' and message_id is null and conversation_id is null)
    or (target_kind = 'message' and message_id is not null and conversation_id is not null)
  ),

  constraint reports_details_bounded check (
    details is null or (details = btrim(details) and char_length(details) between 1 and 1000)
  ),

  constraint reports_other_requires_details check (
    category <> 'other' or details is not null
  ),

  -- Proves, in one declarative constraint, everything the task requires
  -- about a message report's evidentiary integrity: the message exists,
  -- belongs to conversation_id as stored, and its real sender_id equals
  -- reported_user_id as stored. Postgres's default MATCH SIMPLE means this
  -- constraint is skipped entirely whenever any of its three columns is
  -- null — which is exactly every target_kind = 'profile' row (message_id
  -- and conversation_id are both null there, enforced by
  -- reports_target_shape_consistent above), so this FK is only ever live
  -- for target_kind = 'message' rows, where all three columns are required
  -- non-null by that same constraint. There is no code path — client
  -- function or otherwise — that can insert a message report whose stored
  -- reported_user_id does not match the message's real sender, because this
  -- is checked by Postgres itself on every insert, not merely by
  -- submit_message_report()'s own logic.
  constraint reports_message_reference_fk
    foreign key (message_id, conversation_id, reported_user_id)
    references public.messages (id, conversation_id, sender_id)
);

-- ==========================================================================
-- 4. Active-duplicate prevention.
--
-- Two separate partial unique indexes (one per target_kind), each scoped
-- `where status = 'pending'` (the sole "active" status — see the vocabulary
-- comment above), rather than one polymorphic index across both target
-- shapes. This sidesteps the "NULL-safe uniqueness" pitfall the task warns
-- about entirely, rather than working around it with coalesce()/NULLS NOT
-- DISTINCT: within reports_profile_active_duplicate_unique's own predicate
-- (target_kind = 'profile'), reported_user_id is never null
-- (reports_target_shape_consistent guarantees it); within
-- reports_message_active_duplicate_unique's own predicate
-- (target_kind = 'message'), message_id is never null for the identical
-- reason. Neither index's indexed columns can ever contain a null within
-- their own predicate's scope, so ordinary UNIQUE semantics (which only
-- mis-behave when the indexed columns themselves may be null) are already
-- exactly correct here — no special null handling is needed or added.
--
-- Scope matches the task's definition of "exact target" precisely:
-- (reporter_id, reported_user_id, category) for a profile report — the same
-- reporter reporting the same person for the same category twice while the
-- first is still pending is the identical active report, not a new one —
-- and (reporter_id, message_id, category) for a message report — scoped to
-- the specific message, not merely its sender, so two different messages
-- from the same sender are two different targets, exactly as the task
-- requires ("Message and message... need correct... uniqueness"). A
-- different category against the same target is, by construction, a
-- distinct row (category is part of both indexes' key) — an intentionally
-- allowed distinct report, per the task's own "different category may
-- create a distinct report if intended."
--
-- details is deliberately NOT part of either index's key: a repeat
-- submission for the same (reporter, target, category) while still pending
-- is the same active report regardless of what details text accompanies the
-- second attempt — submit_profile_report()/submit_message_report() below
-- return the original row's receipt in that case, silently ignoring the
-- second call's own details, rather than creating a second row or
-- overwriting the first row's details.
--
-- Lifecycle: once a status transitions away from 'pending' (a future
-- moderation-dashboard slice's job — proven directly against these indexes
-- via fixture-level status manipulation in the test file, since no
-- client-reachable transition function ships in this slice), that row no
-- longer participates in either index, so a genuinely new report for the
-- same (reporter, target, category) becomes insertable again — exactly the
-- "a later genuinely new report may be allowed" requirement.
-- ==========================================================================

create unique index reports_profile_active_duplicate_unique
  on public.reports (reporter_id, reported_user_id, category)
  where target_kind = 'profile' and status = 'pending';

create unique index reports_message_active_duplicate_unique
  on public.reports (reporter_id, message_id, category)
  where target_kind = 'message' and status = 'pending';

-- ==========================================================================
-- 5. private.is_active_moderator()
--
-- The privileged-role helper this slice was told to find, not invent.
-- public.staff_role (20260818194558_identity_profiles_roles.sql) already
-- ships a 'moderator' value, assigned/revoked exclusively through
-- public.user_roles (fully RLS-locked — `revoke all on public.user_roles
-- from anon, authenticated`, no client of any kind can read or write it;
-- every assignment/revocation is itself audited into
-- private.role_assignment_audit by the pre-existing trigger). No new role,
-- table, or assignment mechanism is created here — only the first
-- authorization check that actually reads what already exists.
--
-- Deliberately checks exactly `role = 'moderator'` — not admin/owner/
-- smc_staff/any implied hierarchy the schema does not itself express. There
-- is no existing helper or documented precedent in this codebase for "admin
-- implies moderator" or any other role-hierarchy relationship; inventing
-- one here would itself be inventing authorization logic the task
-- explicitly warns against. Widening this to include other staff_role
-- values, if the product owner decides moderation should also be available
-- to admin/owner, is a forward-only, narrowly-scoped follow-up — the same
-- "additive, narrow now, extend later" discipline conversation_kind/
-- post_type/moderation_status already establish throughout this schema.
--
-- Zero-argument, bound to auth.uid() internally — exactly like
-- private.is_conversation_member()/private.conversation_has_blocked_participant()
-- (20260824090000_direct_messaging_foundation.sql) — so there is no
-- parameter through which a caller could ask whether some *other* user is a
-- moderator; the only privileged state any caller can ever learn through
-- this function is their own.
-- ==========================================================================

create or replace function private.is_active_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'moderator'::public.staff_role
      and ur.revoked_at is null
  );
$$;

revoke all on function private.is_active_moderator() from public;
grant execute on function private.is_active_moderator() to authenticated;

-- ==========================================================================
-- Row level security and grants on public.reports.
--
-- Same "broad table-level SELECT grant, narrow RLS predicate does the real
-- work" pattern already established for every other privacy-sensitive table
-- in this schema (message_read_state_owner_read, blocks_owner_read,
-- saved_posts_owner_read, account_deletion_owner_read): `grant select` to
-- `authenticated` is necessary for PostgREST to even attempt the query, but
-- reports_moderator_read means every row is filtered out for anyone who is
-- not currently an active moderator — a non-moderator's own SELECT always
-- returns zero rows, never another user's data and never their own
-- submissions (see the file header on why a reporter-visible "my reports"
-- read is deliberately not added this slice). anon gets no grant of any
-- kind. No insert/update/delete policy or grant exists for any client
-- role — submit_profile_report()/submit_message_report() (SECURITY
-- DEFINER, below) are the sole write path, so no reporter can ever set
-- their own status, reference another user's identity as reporter, or
-- update/delete any report — mirroring conversation_members/messages(insert
-- only)/message_read_state's identical "no direct client write grant"
-- discipline.
-- ==========================================================================

alter table public.reports enable row level security;

create policy reports_moderator_read
on public.reports for select
to authenticated
using (private.is_active_moderator());

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

-- ==========================================================================
-- 6. submit_profile_report / submit_message_report — the only two
-- client-reachable write paths onto public.reports.
--
-- Both: SECURITY DEFINER (genuinely necessary — public.reports grants no
-- client INSERT of any kind, so a SECURITY INVOKER function would have
-- nothing to write through, the same justification
-- create_direct_conversation()/mark_conversation_read() already document
-- for their own tables), search_path = '' with every reference fully
-- schema-qualified, bound to auth.uid() with no p_reporter_id/p_status
-- parameter of any kind (so there is no argument through which a caller
-- could inject a different reporter, a non-'pending' initial status, or any
-- review field), REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated
-- only (no anon grant), and return exactly public.report_receipt — never
-- the full row, so a reporter can never learn their own report's internal
-- id-adjacent fields (reporter_id itself is already known to the caller by
-- construction, but reported_user_id/message_id/conversation_id/details/
-- status are never echoed back beyond what the receipt shape allows, and
-- the receipt shape has no such fields at all).
--
-- Idempotency/concurrency: both wrap their insert in a plain
-- begin/exception/when unique_violation block — the exact same pattern
-- create_direct_conversation() already uses for its own
-- conversations_direct_pair_unique race — rather than ON CONFLICT, so a
-- second call for the same (reporter, target, category) while the first is
-- still 'pending' (including two genuinely concurrent calls racing on the
-- same partial unique index) never raises to the caller and never creates
-- a second active row: the loser's insert hits the index, is caught, and
-- the winner's already-committed row is selected and returned as the
-- receipt instead.
-- ==========================================================================

create or replace function public.submit_profile_report(
  p_reported_user_id uuid,
  p_category public.report_category,
  p_details text default null
)
returns public.report_receipt
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_details text;
  v_report public.reports;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'submit_profile_report: authentication required';
  end if;

  if p_reported_user_id is null then
    raise exception 'submit_profile_report: reported_user_id is required';
  end if;

  if p_category is null then
    raise exception 'submit_profile_report: category is required';
  end if;

  if p_reported_user_id = v_caller then
    raise exception 'submit_profile_report: cannot report yourself';
  end if;

  -- A flat existence check, the same generic-message discipline
  -- create_direct_conversation() already uses for "target user does not
  -- exist" — reveals nothing about the target beyond "this id is/is not a
  -- real profile," the same level of information that function already
  -- exposes for messaging targets.
  if not exists (select 1 from public.profiles where id = p_reported_user_id) then
    raise exception 'submit_profile_report: reported user does not exist';
  end if;

  -- NULL/omitted details is always fine (unless category = 'other', checked
  -- below) — that means "no details provided." A *non-null* value that
  -- trims to empty is a different, invalid case — a caller who explicitly
  -- sent whitespace — and is rejected outright, never silently coerced into
  -- the same "no details" state omitting the parameter would have produced;
  -- reports_details_bounded below is the authoritative backstop regardless
  -- (it independently rejects any stored value that is not already trimmed
  -- or is empty), so this is defense in depth, not the only enforcement.
  if p_details is not null then
    v_details := btrim(p_details);
    if v_details = '' then
      raise exception 'submit_profile_report: details cannot be whitespace-only';
    end if;
    if char_length(v_details) > 1000 then
      raise exception 'submit_profile_report: details must be 1000 characters or fewer';
    end if;
  else
    v_details := null;
  end if;
  if p_category = 'other' and v_details is null then
    raise exception 'submit_profile_report: details are required for category other';
  end if;

  begin
    insert into public.reports (reporter_id, reported_user_id, target_kind, category, details)
    values (v_caller, p_reported_user_id, 'profile', p_category, v_details)
    returning * into v_report;
  exception
    when unique_violation then
      select r.* into v_report
      from public.reports r
      where r.reporter_id = v_caller
        and r.reported_user_id = p_reported_user_id
        and r.category = p_category
        and r.target_kind = 'profile'
        and r.status = 'pending';
  end;

  return (v_report.id, v_report.target_kind, v_report.category, v_report.created_at)::public.report_receipt;
end;
$$;

revoke all on function public.submit_profile_report(uuid, public.report_category, text) from public;
grant execute on function public.submit_profile_report(uuid, public.report_category, text) to authenticated;

create or replace function public.submit_message_report(
  p_message_id uuid,
  p_category public.report_category,
  p_details text default null
)
returns public.report_receipt
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_details text;
  v_conversation_id uuid;
  v_sender_id uuid;
  v_report public.reports;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'submit_message_report: authentication required';
  end if;

  if p_message_id is null then
    raise exception 'submit_message_report: message_id is required';
  end if;

  if p_category is null then
    raise exception 'submit_message_report: category is required';
  end if;

  -- No p_conversation_id/p_sender_id/p_reported_user_id parameter exists
  -- anywhere on this function — conversation_id and sender_id are derived
  -- here, from the real message row, and nowhere else. The membership check
  -- is folded into the same lookup (not a separate query) so a message that
  -- genuinely does not exist and a message that exists but belongs to a
  -- conversation the caller is not a member of are indistinguishable to the
  -- caller — both fall through to the identical exception below — the same
  -- "never confirm or deny another conversation's contents" discipline
  -- mark_conversation_read() already established for "message not found in
  -- this conversation." This function does not check private.has_blocked()
  -- in either direction at all: reporting must remain possible regardless
  -- of block state in either direction, and must never let a caller infer
  -- block state from whether this call succeeds or fails.
  select m.conversation_id, m.sender_id into v_conversation_id, v_sender_id
  from public.messages m
  where m.id = p_message_id
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = m.conversation_id and cm.user_id = v_caller
    );

  if v_conversation_id is null then
    raise exception 'submit_message_report: message not found in an accessible conversation';
  end if;

  if v_sender_id = v_caller then
    raise exception 'submit_message_report: cannot report your own message';
  end if;

  -- Same "reject whitespace-only, never silently coerce it into omitted"
  -- discipline as submit_profile_report() — see that function's own comment.
  if p_details is not null then
    v_details := btrim(p_details);
    if v_details = '' then
      raise exception 'submit_message_report: details cannot be whitespace-only';
    end if;
    if char_length(v_details) > 1000 then
      raise exception 'submit_message_report: details must be 1000 characters or fewer';
    end if;
  else
    v_details := null;
  end if;
  if p_category = 'other' and v_details is null then
    raise exception 'submit_message_report: details are required for category other';
  end if;

  begin
    insert into public.reports (reporter_id, reported_user_id, target_kind, message_id, conversation_id, category, details)
    values (v_caller, v_sender_id, 'message', p_message_id, v_conversation_id, p_category, v_details)
    returning * into v_report;
  exception
    when unique_violation then
      select r.* into v_report
      from public.reports r
      where r.reporter_id = v_caller
        and r.message_id = p_message_id
        and r.category = p_category
        and r.target_kind = 'message'
        and r.status = 'pending';
  end;

  return (v_report.id, v_report.target_kind, v_report.category, v_report.created_at)::public.report_receipt;
end;
$$;

revoke all on function public.submit_message_report(uuid, public.report_category, text) from public;
grant execute on function public.submit_message_report(uuid, public.report_category, text) to authenticated;
