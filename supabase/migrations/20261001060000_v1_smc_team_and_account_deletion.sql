-- V1 launch gate: SMC Team is staff-assigned only, and account deletion
-- becomes a complete request -> cancellation window -> anonymisation flow.
-- Additive only: no already-merged migration file is modified. Policies on
-- account_deletion_requests are replaced (drop + create) here, per the
-- repository's own rule for changing merged RLS.
--
-- ==========================================================================
-- Part 1 — "SMC Team" (owner decision O3)
-- ==========================================================================
-- Previously private.handle_new_auth_user() turned sign-up metadata
-- professional_category = 'smc_team' into a real smc_team profile, and the
-- owner UPDATE grant on professional_profiles.category let any professional
-- switch themselves to it. The category grants no access, but it is shown
-- publicly as "SMC Team", so self-assignment is an impersonation risk.
-- After this migration:
--   * sign-up metadata 'smc_team' is treated like any unknown value ('other');
--   * a client role (anon/authenticated) can never set category to
--     'smc_team' on insert or update;
--   * staff/server paths (service role, SQL migrations) still can;
--   * an existing staff-assigned smc_team profile is left exactly as it is.

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_type public.account_type := 'customer';
  requested_name text;
  requested_category public.professional_category;
begin
  if new.raw_user_meta_data ->> 'account_type' = 'professional' then
    requested_type := 'professional';
  end if;

  requested_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if requested_name is null then
    requested_name := split_part(coalesce(new.email, 'SMC member'), '@', 1);
  end if;

  insert into public.profiles (id, account_type, display_name)
  values (new.id, requested_type, left(requested_name, 100));

  if requested_type = 'professional' then
    -- 'smc_team' is deliberately absent: it is staff-assigned only.
    requested_category := case new.raw_user_meta_data ->> 'professional_category'
      when 'architect' then 'architect'::public.professional_category
      when 'interior_designer' then 'interior_designer'::public.professional_category
      when 'stone_fabricator' then 'stone_fabricator'::public.professional_category
      when 'stone_supplier' then 'stone_supplier'::public.professional_category
      when 'installer' then 'installer'::public.professional_category
      when 'contractor' then 'contractor'::public.professional_category
      when 'developer' then 'developer'::public.professional_category
      when 'construction_professional' then 'construction_professional'::public.professional_category
      else 'other'::public.professional_category
    end;
    insert into public.professional_profiles (user_id, category) values (new.id, requested_category);
  end if;

  insert into public.user_roles (user_id, role, assignment_reason)
  values (new.id, 'user', 'Automatically assigned base user role');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create or replace function private.prevent_self_assigned_smc_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category = 'smc_team'
     and (tg_op = 'INSERT' or old.category is distinct from 'smc_team')
     and current_user in ('anon', 'authenticated') then
    raise exception 'The SMC Team category is assigned by SMC staff only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_self_assigned_smc_team() from public, anon, authenticated;

create trigger professional_profiles_smc_team_staff_only
before insert or update of category on public.professional_profiles
for each row execute function private.prevent_self_assigned_smc_team();

-- ==========================================================================
-- Part 2 — Account deletion (owner decision O4)
-- ==========================================================================
-- Flow:
--   1. request_account_deletion()  — signed-in user; schedules deletion for
--      now() + the configured cancellation window. Idempotent.
--   2. cancel_account_deletion()   — signed-in user; allowed while the request
--      is still 'requested' and its scheduled time has not passed.
--   3. process_due_account_deletions() — service_role only (a scheduled
--      server job, never the app): anonymises every due request's account
--      data in place and marks it 'completed'.
--   4. The same server job then soft-deletes the Auth identity through the
--      Auth admin API (scrubs email/phone, removes identities and sessions)
--      and removes the user's Storage objects, then calls
--      mark_account_deletion_identity_removed().
--
-- Why anonymise in place instead of deleting rows: reports and moderation
-- actions reference profiles/messages without cascade (some RESTRICT, by
-- design, for accountability). Keeping a de-identified "Deleted member"
-- profile row lets safety records stay intact while every piece of the
-- member's own personal content is removed.
--
-- Retention / safety handling is NOT hard-coded legal policy. It lives in
-- private.account_deletion_policy (one row) so SMC and its legal advisers can
-- change it without a code change. See docs/account-deletion-policy.md.

create table private.account_deletion_policy (
  singleton boolean primary key default true check (singleton),
  -- Product setting (not a legal retention period): how long a member can
  -- change their mind before processing. Owner-configurable.
  cancellation_window interval not null default interval '14 days'
    check (cancellation_window >= interval '0' and cancellation_window <= interval '90 days'),
  -- What happens to the text of the member's messages that are referenced by
  -- a report or moderation action. 'retain' keeps that text as safety
  -- evidence (the sender shown as "Deleted member"); 'redact' replaces it
  -- like every other message. Every *unreported* message is always redacted.
  reported_message_handling text not null default 'retain'
    check (reported_message_handling in ('retain', 'redact')),
  updated_at timestamptz not null default now(),
  -- Free text recording who approved the current values, and when.
  approval_note text
);

insert into private.account_deletion_policy (singleton, approval_note)
values (true, 'Engineering defaults (2026-10-01) pending SMC/legal approval — see docs/account-deletion-policy.md');

revoke all on private.account_deletion_policy from public, anon, authenticated;

alter table public.account_deletion_requests
  add column scheduled_for timestamptz,
  add column identity_removed_at timestamptz;

-- Mutations now happen only through the RPCs below (which set scheduled_for
-- and enforce the window). Owners keep their read access.
drop policy account_deletion_owner_request on public.account_deletion_requests;
drop policy account_deletion_owner_cancel_request on public.account_deletion_requests;
revoke insert, update, delete on public.account_deletion_requests from anon, authenticated;
revoke insert (user_id) on public.account_deletion_requests from authenticated;
revoke update (cancellation_requested_at) on public.account_deletion_requests from authenticated;

create or replace function public.request_account_deletion()
returns table (id uuid, status public.account_deletion_status, requested_at timestamptz, scheduled_for timestamptz, cancellation_requested_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_window interval;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'request_account_deletion: authentication required' using errcode = '42501';
  end if;

  select r.id into v_id
  from public.account_deletion_requests as r
  where r.user_id = v_uid and r.status in ('requested', 'identity_locked', 'retention_review');

  if v_id is null then
    select p.cancellation_window into v_window from private.account_deletion_policy as p where p.singleton;
    insert into public.account_deletion_requests (user_id, scheduled_for)
    values (v_uid, now() + coalesce(v_window, interval '14 days'))
    returning account_deletion_requests.id into v_id;
  end if;

  return query
  select r.id, r.status, r.requested_at, r.scheduled_for, r.cancellation_requested_at
  from public.account_deletion_requests as r where r.id = v_id;
end;
$$;

create or replace function public.cancel_account_deletion()
returns table (id uuid, status public.account_deletion_status, requested_at timestamptz, scheduled_for timestamptz, cancellation_requested_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'cancel_account_deletion: authentication required' using errcode = '42501';
  end if;

  update public.account_deletion_requests as r
  set status = 'cancelled', cancellation_requested_at = now()
  where r.user_id = v_uid
    and r.status = 'requested'
    and (r.scheduled_for is null or r.scheduled_for > now())
  returning r.id into v_id;

  if v_id is null then
    raise exception 'cancel_account_deletion: there is no deletion request that can still be cancelled'
      using errcode = 'P0002';
  end if;

  return query
  select r.id, r.status, r.requested_at, r.scheduled_for, r.cancellation_requested_at
  from public.account_deletion_requests as r where r.id = v_id;
end;
$$;

-- Anonymises one member's data in place. Private: callable only from
-- process_due_account_deletions() below.
create or replace function private.anonymise_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reported_handling text;
begin
  select p.reported_message_handling into v_reported_handling
  from private.account_deletion_policy as p where p.singleton;
  v_reported_handling := coalesce(v_reported_handling, 'retain');

  -- Own content and relationships.
  delete from public.posts where author_id = p_user_id;           -- cascades post media, their comments/reactions/saves
  delete from public.comments where author_id = p_user_id;
  delete from public.reactions where user_id = p_user_id;
  delete from public.saved_posts where user_id = p_user_id;
  delete from public.follows where follower_id = p_user_id or followee_id = p_user_id;
  delete from public.connections where requester_id = p_user_id or addressee_id = p_user_id;
  delete from public.blocks where blocker_id = p_user_id or blocked_id = p_user_id;
  delete from public.professional_profiles where user_id = p_user_id;

  -- Messages: the text is removed but the row stays, so the other member's
  -- conversation keeps its shape and every foreign key (read cursors,
  -- reports, moderation actions) remains valid.
  update public.messages as m
  set body = 'This message was deleted.'
  where m.sender_id = p_user_id
    and (
      v_reported_handling = 'redact'
      or not (
        exists (select 1 from public.reports as r where r.message_id = m.id)
        or exists (select 1 from public.moderation_actions as a where a.message_id = m.id)
      )
    );

  -- Leave every conversation (their read positions go with membership).
  delete from public.message_read_state where user_id = p_user_id;
  delete from public.conversation_members where user_id = p_user_id;

  -- Any staff role ends with the account (audited by the existing trigger).
  update public.user_roles
  set revoked_at = now(), revoked_by = p_user_id
  where user_id = p_user_id and revoked_at is null;

  -- De-identified tombstone, hidden from everyone.
  update public.profiles
  set account_type = 'customer',
      display_name = 'Deleted member',
      username = null,
      bio = null,
      avatar_path = null,
      visibility = 'private',
      onboarding_completed = false
  where id = p_user_id;
end;
$$;

revoke all on function private.anonymise_account(uuid) from public, anon, authenticated;

create or replace function public.process_due_account_deletions(p_limit integer default 50)
returns table (request_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
begin
  for v_request in
    select r.id, r.user_id
    from public.account_deletion_requests as r
    where r.status = 'requested'
      and r.scheduled_for is not null
      and r.scheduled_for <= now()
    order by r.scheduled_for
    limit least(greatest(coalesce(p_limit, 50), 1), 500)
    for update skip locked
  loop
    perform private.anonymise_account(v_request.user_id);
    update public.account_deletion_requests
    set status = 'completed', completed_at = now()
    where id = v_request.id;
    request_id := v_request.id;
    user_id := v_request.user_id;
    return next;
  end loop;
end;
$$;

-- Completed requests whose Auth identity / Storage objects the server job
-- still has to remove (lets the job resume safely after a failure).
create or replace function public.list_account_deletions_pending_identity_removal(p_limit integer default 50)
returns table (request_id uuid, user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id
  from public.account_deletion_requests as r
  where r.status = 'completed' and r.identity_removed_at is null
  order by r.completed_at
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

create or replace function public.mark_account_deletion_identity_removed(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_deletion_requests
  set identity_removed_at = now()
  where id = p_request_id and status = 'completed' and identity_removed_at is null;
  if not found then
    raise exception 'mark_account_deletion_identity_removed: no completed request awaiting identity removal'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

revoke all on function public.process_due_account_deletions(integer) from public, anon, authenticated;
revoke all on function public.list_account_deletions_pending_identity_removal(integer) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_identity_removed(uuid) from public, anon, authenticated;
grant execute on function public.process_due_account_deletions(integer) to service_role;
grant execute on function public.list_account_deletions_pending_identity_removal(integer) to service_role;
grant execute on function public.mark_account_deletion_identity_removed(uuid) to service_role;
