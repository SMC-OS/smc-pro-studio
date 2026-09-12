-- Phase 5 Slice A: materials catalogue foundation — schema/RLS only.
-- Additive only. No existing migration, table, policy, or grant is modified.
--
-- Guest-visible, read-only catalogue foundation: no pricing, stock,
-- discount, origin, certification, standards, warranty, or provenance
-- field of any kind; no image/storage column; no slabs, collections,
-- saved-materials, quotes, enquiries, or moderation hook. No client
-- write grant and no publishing RPC exist yet — staff publishing is a
-- separate, deferred future slice. This migration seeds no rows; the
-- table ships genuinely empty in every environment.

create type public.material_category as enum (
  'quartz',
  'granite',
  'marble',
  'porcelain',
  'dekton'
);

-- Publish-lifecycle state, deliberately distinct from moderation_status
-- used elsewhere (posts/messages): this is "is it ready to show", not
-- "was it reported/removed". No moderation integration exists for this
-- table.
create type public.material_status as enum ('draft', 'published', 'archived');

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 150),
  category public.material_category not null,
  summary text check (summary is null or char_length(summary) <= 240),
  description text check (description is null or char_length(description) <= 4000),
  applications text[] not null default '{}',
  status public.material_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Serves the one real query this slice ships: guest-facing published
-- materials filtered/grouped by category. Not a speculative index.
create index materials_status_category_idx
  on public.materials (status, category);

-- Reuses the existing trigger function (private.set_updated_at, defined
-- in 20260818194558_identity_profiles_roles.sql) — no new function needed.
create trigger materials_set_updated_at
before update on public.materials
for each row execute function private.set_updated_at();

alter table public.materials enable row level security;

create policy materials_public_read
on public.materials for select
to anon, authenticated
using (status = 'published');

revoke all on public.materials from anon, authenticated;
grant select on public.materials to anon, authenticated;
