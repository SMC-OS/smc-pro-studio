-- Phase 5 Slice C: catalogue imagery and secure media storage.
-- Additive only. No already-merged migration file is modified.
--
-- Adds:
--   1. A new dedicated public storage bucket, materials-media — mirrors the
--      pre-existing avatars/public-media buckets exactly (public = true,
--      image/jpeg|png|webp only, no explicit SELECT policy needed since a
--      public bucket already serves its objects by URL regardless of RLS —
--      the same precedent avatars/public-media already establish, neither
--      of which has a SELECT policy either). 8MB limit.
--   2. Storage RLS on materials-media that is role-gated, not folder-owned
--      — every other bucket's write policy keys on
--      (storage.foldername(name))[1] = auth.uid(), which has no meaning
--      here (a material has no single owning user); these three policies
--      instead check is_active_catalogue_editor() directly, the same
--      authorization boundary the table-level RPCs already use.
--      A fourth, editor-only SELECT policy is required for deletes and
--      replacements to work at all: the Storage API deletes with
--      DELETE ... RETURNING, so a row the caller cannot SELECT is silently
--      skipped (verified against storage-api v1.69.11 — remove() returned
--      an empty list and the object survived). Guests still read images
--      only through the public bucket URL, which bypasses RLS; this policy
--      grants no anon access of any kind.
--   3. public.materials.image_path — nullable, format-locked (defense in
--      depth) to materials/<this row's own id>/<filename>.<jpg|jpeg|png|
--      webp>, so a check constraint alone already prevents one material's
--      row from ever pointing at another material's image path or at any
--      path outside this bucket's own convention.
--   4. Two further narrow SECURITY DEFINER RPCs, set_material_image and
--      clear_material_image — the only client-reachable way to associate or
--      remove an uploaded object from a material row. Deliberately
--      status-independent (unlike create_draft_material/
--      update_draft_material, which remain draft-only) — replacing or
--      removing a photo is a reasonable action on a published material too,
--      and touches no editorial text field those two already govern.
--      set_material_image additionally verifies the referenced object
--      genuinely exists in storage.objects before trusting it — a client
--      cannot point a material at a path that was never actually uploaded.
--
-- Out of scope here (deferred, per the locked scope): multi-image galleries,
-- image cropping/resizing, any CDN/transform pipeline (supabase/config.toml
-- has image_transformation commented out — no such capability exists in
-- this environment, so none is claimed here), alt-text/caption metadata,
-- and any of pricing/stock/origin/certification/warranty/provenance.

-- ==========================================================================
-- 1. Bucket
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials-media', 'materials-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ==========================================================================
-- 2. Storage RLS — role-gated, not folder-owned.
-- ==========================================================================

create policy storage_materials_media_editor_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'materials-media'
  and private.is_active_catalogue_editor()
);

create policy storage_materials_media_editor_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'materials-media'
  and private.is_active_catalogue_editor()
)
with check (
  bucket_id = 'materials-media'
  and private.is_active_catalogue_editor()
);

create policy storage_materials_media_editor_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'materials-media'
  and private.is_active_catalogue_editor()
);

create policy storage_materials_media_editor_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'materials-media'
  and private.is_active_catalogue_editor()
);

-- ==========================================================================
-- 3. public.materials.image_path
-- ==========================================================================

alter table public.materials
  add column image_path text
    check (
      image_path is null
      or (
        image_path like 'materials/' || id::text || '/%'
        and image_path ~ '^materials/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$'
      )
    );

-- ==========================================================================
-- 4. set_material_image(id, image_path)
-- ==========================================================================

create or replace function public.set_material_image(p_id uuid, p_image_path text)
returns table (
  id uuid,
  image_path text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_existing public.materials;
  v_expected_prefix text;
  v_row public.materials;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'set_material_image: authentication required';
  end if;
  if not private.is_active_catalogue_editor() then
    raise exception 'set_material_image: catalogue editor access required';
  end if;

  if p_id is null then
    raise exception 'set_material_image: id is required';
  end if;
  if p_image_path is null or btrim(p_image_path) = '' then
    raise exception 'set_material_image: image_path is required';
  end if;

  select * into v_existing from public.materials as t where t.id = p_id;
  if v_existing.id is null then
    raise exception 'set_material_image: material not found';
  end if;

  v_expected_prefix := 'materials/' || p_id::text || '/';
  if left(p_image_path, char_length(v_expected_prefix)) <> v_expected_prefix then
    raise exception 'set_material_image: image_path must belong to this material';
  end if;
  if p_image_path !~ '^materials/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$' then
    raise exception 'set_material_image: image_path has an invalid format';
  end if;

  if not exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'materials-media' and o.name = p_image_path
  ) then
    raise exception 'set_material_image: the uploaded file could not be found';
  end if;

  update public.materials as m
  set image_path = p_image_path
  where m.id = p_id
  returning m.* into v_row;

  return query select v_row.id, v_row.image_path, v_row.updated_at;
end;
$$;

revoke all on function public.set_material_image(uuid, text) from public, anon;
grant execute on function public.set_material_image(uuid, text) to authenticated;

-- ==========================================================================
-- 5. clear_material_image(id)
-- ==========================================================================

create or replace function public.clear_material_image(p_id uuid)
returns table (
  id uuid,
  image_path text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_row public.materials;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'clear_material_image: authentication required';
  end if;
  if not private.is_active_catalogue_editor() then
    raise exception 'clear_material_image: catalogue editor access required';
  end if;
  if p_id is null then
    raise exception 'clear_material_image: id is required';
  end if;

  update public.materials as m
  set image_path = null
  where m.id = p_id
  returning m.* into v_row;

  if v_row.id is null then
    raise exception 'clear_material_image: material not found';
  end if;

  return query select v_row.id, v_row.image_path, v_row.updated_at;
end;
$$;

revoke all on function public.clear_material_image(uuid) from public, anon;
grant execute on function public.clear_material_image(uuid) to authenticated;
