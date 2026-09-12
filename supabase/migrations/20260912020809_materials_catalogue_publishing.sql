-- Phase 5 Slice B: secure staff catalogue publishing.
-- Additive only. No existing migration, table, policy, or grant is modified
-- (including 20260912000618_materials_catalogue_foundation.sql, which is
-- untouched — this file adds a second, separate RLS policy alongside the
-- historical one rather than editing it).
--
-- Adds:
--   1. private.is_active_catalogue_editor() — the privileged-role helper,
--      found not invented: public.staff_role already ships a
--      'catalogue_editor' value (20260818194558_identity_profiles_roles.sql),
--      unused until now. Mirrors private.is_active_moderator()
--      (20260830105617_reporting_foundation.sql) exactly.
--   2. public.check_catalogue_editor_access() — the public-schema front door
--      onto it, for the client's own access-gate check. Must be SECURITY
--      DEFINER, not INVOKER — mirrors public.check_moderator_access()'s own
--      documented reasoning (20260830193342_moderation_review.sql): a plain
--      SECURITY INVOKER SQL function referencing private.* gets inlined by
--      the planner and re-resolves under the calling role's own privileges,
--      which lack `private` schema USAGE (revoked from anon/authenticated
--      since 20260818194558_identity_profiles_roles.sql).
--   3. A second, additive RLS policy, materials_editor_read, scoped
--      `to authenticated` only (never anon) — so an active catalogue editor
--      can read every material regardless of status via a plain
--      `.from("materials").select(...)`, with no new RPC needed for
--      listing. Scoping this `to authenticated` only, rather than adding the
--      editor condition into the existing `to anon, authenticated`
--      materials_public_read policy, deliberately avoids an unverified risk:
--      an anon query would still need its own EXECUTE grant on
--      is_active_catalogue_editor() to evaluate an OR'd condition inside a
--      policy that applies to it, even though the policy's own name
--      resolution happens once at CREATE POLICY time (the same subtlety
--      moderation_review.sql's own check_moderator_access() comment
--      describes for name resolution — but EXECUTE privilege is a separate,
--      still-live runtime check). Since this policy is authenticated-only,
--      anon never evaluates it at all, sidestepping the question entirely —
--      the same reason reports_moderator_read is safe. This does introduce
--      one new "multiple_permissive_policies" advisor WARN
--      (materials/authenticated/SELECT) — an accepted, documented trade-off,
--      the same class already carried for profiles/professional_profiles/
--      posts/connections.
--   4. Four SECURITY DEFINER mutation RPCs — create_draft_material,
--      update_draft_material, publish_material, archive_material — the only
--      client-reachable write paths onto public.materials. No client
--      insert/update/delete grant of any kind is added; all four re-check
--      auth.uid() and is_active_catalogue_editor() as their first action,
--      never trusting that a caller who reached this far must already be
--      authorized. Status transitions use a read-then-atomic-compare-and-
--      swap update, mirroring public.review_report()'s exact pattern.
--
-- Out of scope here (deferred, per the locked scope): pricing, currency,
-- stock, availability, discounts, origin, quarry, certification, standards,
-- warranty, provenance, images, slabs, collections, saved materials, quotes,
-- enquiries, moderation integration, notifications, mute, project messaging.
-- No demo/seed rows are inserted. Archived is a terminal state this slice —
-- no un-archive/republish path exists.

-- ==========================================================================
-- 1. private.is_active_catalogue_editor()
-- ==========================================================================

create or replace function private.is_active_catalogue_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'catalogue_editor'::public.staff_role
      and ur.revoked_at is null
  );
$$;

revoke all on function private.is_active_catalogue_editor() from public;
grant execute on function private.is_active_catalogue_editor() to authenticated;

-- ==========================================================================
-- 2. public.check_catalogue_editor_access()
-- ==========================================================================

create or replace function public.check_catalogue_editor_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_catalogue_editor();
$$;

revoke all on function public.check_catalogue_editor_access() from public;
grant execute on function public.check_catalogue_editor_access() to authenticated;

-- ==========================================================================
-- 3. materials_editor_read — additive second RLS policy.
-- ==========================================================================

create policy materials_editor_read
on public.materials for select
to authenticated
using (private.is_active_catalogue_editor());

-- ==========================================================================
-- 4. create_draft_material(slug, name, category, summary?, description?, applications?)
--
-- Always inserts with status = 'draft' — status is never a caller-suppliable
-- parameter, so a client cannot bypass publication rules by inserting
-- directly as 'published'. Validation duplicates (and is stricter or equal
-- to) the table's own CHECK constraints, for a clear, stable error message —
-- the constraints remain the authoritative backstop regardless (defense in
-- depth, the same discipline submit_profile_report() already established).
-- ==========================================================================

create or replace function public.create_draft_material(
  p_slug text,
  p_name text,
  p_category public.material_category,
  p_summary text default null,
  p_description text default null,
  p_applications text[] default '{}'
)
returns table (
  id uuid,
  slug text,
  name text,
  category public.material_category,
  summary text,
  description text,
  applications text[],
  status public.material_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_slug text;
  v_name text;
  v_summary text;
  v_description text;
  v_applications text[];
  v_app text;
  v_row public.materials;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'create_draft_material: authentication required';
  end if;
  if not private.is_active_catalogue_editor() then
    raise exception 'create_draft_material: catalogue editor access required';
  end if;

  if p_slug is null then
    raise exception 'create_draft_material: slug is required';
  end if;
  v_slug := btrim(p_slug);
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'create_draft_material: slug must be lowercase letters, numbers, and single hyphens only';
  end if;
  if char_length(v_slug) > 80 then
    raise exception 'create_draft_material: slug must be 80 characters or fewer';
  end if;

  if p_name is null then
    raise exception 'create_draft_material: name is required';
  end if;
  v_name := btrim(p_name);
  if char_length(v_name) < 1 or char_length(v_name) > 150 then
    raise exception 'create_draft_material: name must be between 1 and 150 characters';
  end if;

  if p_category is null then
    raise exception 'create_draft_material: category is required';
  end if;

  if p_summary is not null then
    v_summary := nullif(btrim(p_summary), '');
    if v_summary is not null and char_length(v_summary) > 240 then
      raise exception 'create_draft_material: summary must be 240 characters or fewer';
    end if;
  else
    v_summary := null;
  end if;

  if p_description is not null then
    v_description := nullif(btrim(p_description), '');
    if v_description is not null and char_length(v_description) > 4000 then
      raise exception 'create_draft_material: description must be 4000 characters or fewer';
    end if;
  else
    v_description := null;
  end if;

  if p_applications is null then
    v_applications := '{}'::text[];
  else
    if coalesce(array_length(p_applications, 1), 0) > 12 then
      raise exception 'create_draft_material: applications must be 12 items or fewer';
    end if;
    v_applications := '{}'::text[];
    foreach v_app in array p_applications loop
      v_app := btrim(v_app);
      if v_app = '' then
        raise exception 'create_draft_material: applications entries cannot be blank';
      end if;
      if char_length(v_app) > 60 then
        raise exception 'create_draft_material: each application must be 60 characters or fewer';
      end if;
      v_applications := array_append(v_applications, v_app);
    end loop;
  end if;

  begin
    insert into public.materials (slug, name, category, summary, description, applications, status)
    values (v_slug, v_name, p_category, v_summary, v_description, v_applications, 'draft')
    returning * into v_row;
  exception
    when unique_violation then
      raise exception 'create_draft_material: slug is already in use';
  end;

  return query select v_row.id, v_row.slug, v_row.name, v_row.category, v_row.summary,
    v_row.description, v_row.applications, v_row.status, v_row.created_at, v_row.updated_at;
end;
$$;

revoke all on function public.create_draft_material(
  text, text, public.material_category, text, text, text[]
) from public;
grant execute on function public.create_draft_material(
  text, text, public.material_category, text, text, text[]
) to authenticated;

-- ==========================================================================
-- 5. update_draft_material(id, slug, name, category, summary?, description?, applications?)
--
-- Full-replace semantics only (every editorial field re-supplied each call)
-- — no partial/PATCH update exists this slice. Only ever operates on a
-- material that is still a draft; once published, this function can no
-- longer touch it (a two-phase read-then-atomic-compare-and-swap, mirroring
-- public.review_report()'s exact pattern, so a concurrent publish can never
-- be silently overwritten).
-- ==========================================================================

create or replace function public.update_draft_material(
  p_id uuid,
  p_slug text,
  p_name text,
  p_category public.material_category,
  p_summary text default null,
  p_description text default null,
  p_applications text[] default '{}'
)
returns table (
  id uuid,
  slug text,
  name text,
  category public.material_category,
  summary text,
  description text,
  applications text[],
  status public.material_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_slug text;
  v_name text;
  v_summary text;
  v_description text;
  v_applications text[];
  v_app text;
  v_existing public.materials;
  v_row public.materials;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'update_draft_material: authentication required';
  end if;
  if not private.is_active_catalogue_editor() then
    raise exception 'update_draft_material: catalogue editor access required';
  end if;

  if p_id is null then
    raise exception 'update_draft_material: id is required';
  end if;

  if p_slug is null then
    raise exception 'update_draft_material: slug is required';
  end if;
  v_slug := btrim(p_slug);
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'update_draft_material: slug must be lowercase letters, numbers, and single hyphens only';
  end if;
  if char_length(v_slug) > 80 then
    raise exception 'update_draft_material: slug must be 80 characters or fewer';
  end if;

  if p_name is null then
    raise exception 'update_draft_material: name is required';
  end if;
  v_name := btrim(p_name);
  if char_length(v_name) < 1 or char_length(v_name) > 150 then
    raise exception 'update_draft_material: name must be between 1 and 150 characters';
  end if;

  if p_category is null then
    raise exception 'update_draft_material: category is required';
  end if;

  if p_summary is not null then
    v_summary := nullif(btrim(p_summary), '');
    if v_summary is not null and char_length(v_summary) > 240 then
      raise exception 'update_draft_material: summary must be 240 characters or fewer';
    end if;
  else
    v_summary := null;
  end if;

  if p_description is not null then
    v_description := nullif(btrim(p_description), '');
    if v_description is not null and char_length(v_description) > 4000 then
      raise exception 'update_draft_material: description must be 4000 characters or fewer';
    end if;
  else
    v_description := null;
  end if;

  if p_applications is null then
    v_applications := '{}'::text[];
  else
    if coalesce(array_length(p_applications, 1), 0) > 12 then
      raise exception 'update_draft_material: applications must be 12 items or fewer';
    end if;
    v_applications := '{}'::text[];
    foreach v_app in array p_applications loop
      v_app := btrim(v_app);
      if v_app = '' then
        raise exception 'update_draft_material: applications entries cannot be blank';
      end if;
      if char_length(v_app) > 60 then
        raise exception 'update_draft_material: each application must be 60 characters or fewer';
      end if;
      v_applications := array_append(v_applications, v_app);
    end loop;
  end if;

  select * into v_existing from public.materials as t where t.id = p_id;
  if v_existing.id is null then
    raise exception 'update_draft_material: material not found';
  end if;
  if v_existing.status <> 'draft' then
    raise exception 'update_draft_material: only a draft material can be edited';
  end if;

  begin
    update public.materials as m
    set slug = v_slug, name = v_name, category = p_category, summary = v_summary,
        description = v_description, applications = v_applications
    where m.id = p_id and m.status = 'draft'
    returning * into v_row;
  exception
    when unique_violation then
      raise exception 'update_draft_material: slug is already in use';
  end;

  if not found then
    raise exception 'update_draft_material: material is no longer a draft';
  end if;

  return query select v_row.id, v_row.slug, v_row.name, v_row.category, v_row.summary,
    v_row.description, v_row.applications, v_row.status, v_row.created_at, v_row.updated_at;
end;
$$;

revoke all on function public.update_draft_material(
  uuid, text, text, public.material_category, text, text, text[]
) from public;
grant execute on function public.update_draft_material(
  uuid, text, text, public.material_category, text, text, text[]
) to authenticated;

-- ==========================================================================
-- 6. publish_material(id)
--
-- The one additional "editorial completeness" rule this slice defines: a
-- non-empty summary is required before a material can go public-facing,
-- since the guest-facing Materials list (NetworkRoute.tsx) shows summary as
-- its card copy. Description remains genuinely optional even once
-- published — MaterialDetailRoute.tsx already renders it conditionally.
-- ==========================================================================

create or replace function public.publish_material(p_id uuid)
returns table (
  id uuid,
  slug text,
  name text,
  category public.material_category,
  summary text,
  description text,
  applications text[],
  status public.material_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_existing public.materials;
  v_row public.materials;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'publish_material: authentication required';
  end if;
  if not private.is_active_catalogue_editor() then
    raise exception 'publish_material: catalogue editor access required';
  end if;

  if p_id is null then
    raise exception 'publish_material: id is required';
  end if;

  select * into v_existing from public.materials as t where t.id = p_id;
  if v_existing.id is null then
    raise exception 'publish_material: material not found';
  end if;
  if v_existing.status <> 'draft' then
    raise exception 'publish_material: only a draft material can be published';
  end if;
  if v_existing.summary is null or btrim(v_existing.summary) = '' then
    raise exception 'publish_material: a summary is required before publishing';
  end if;

  update public.materials as m
  set status = 'published'
  where m.id = p_id and m.status = 'draft'
  returning * into v_row;

  if not found then
    raise exception 'publish_material: material is no longer a draft';
  end if;

  return query select v_row.id, v_row.slug, v_row.name, v_row.category, v_row.summary,
    v_row.description, v_row.applications, v_row.status, v_row.created_at, v_row.updated_at;
end;
$$;

revoke all on function public.publish_material(uuid) from public;
grant execute on function public.publish_material(uuid) to authenticated;

-- ==========================================================================
-- 7. archive_material(id)
--
-- Allowed from either draft (discarding an unwanted draft) or published
-- (retiring a live material). Archived is a terminal state this slice — no
-- un-archive/republish path exists.
-- ==========================================================================

create or replace function public.archive_material(p_id uuid)
returns table (
  id uuid,
  slug text,
  name text,
  category public.material_category,
  summary text,
  description text,
  applications text[],
  status public.material_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_existing public.materials;
  v_row public.materials;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'archive_material: authentication required';
  end if;
  if not private.is_active_catalogue_editor() then
    raise exception 'archive_material: catalogue editor access required';
  end if;

  if p_id is null then
    raise exception 'archive_material: id is required';
  end if;

  select * into v_existing from public.materials as t where t.id = p_id;
  if v_existing.id is null then
    raise exception 'archive_material: material not found';
  end if;
  if v_existing.status = 'archived' then
    raise exception 'archive_material: material is already archived';
  end if;

  update public.materials as m
  set status = 'archived'
  where m.id = p_id and m.status in ('draft', 'published')
  returning * into v_row;

  if not found then
    raise exception 'archive_material: material could not be archived';
  end if;

  return query select v_row.id, v_row.slug, v_row.name, v_row.category, v_row.summary,
    v_row.description, v_row.applications, v_row.status, v_row.created_at, v_row.updated_at;
end;
$$;

revoke all on function public.archive_material(uuid) from public;
grant execute on function public.archive_material(uuid) to authenticated;
