-- Phase 3 Slice G: post_type as presentation metadata on posts.
-- Smallest schema-backed scope: 'general' and 'portfolio' only.
-- field_update, project_update, and opportunity remain explicitly deferred
-- (see tasks/todo.md) — no schema, UI, or client support for them here.
--
-- post_type is presentation metadata, not a visibility or authorization
-- dimension: it adds no RLS policy and changes no existing one. Existing
-- rows (and any insert that omits post_type) default to 'general' — the
-- only historically honest classification, since nothing here infers
-- portfolio from body, media, author type, or visibility.

create type public.post_type as enum ('general', 'portfolio');

alter table public.posts
  add column post_type public.post_type not null default 'general';

grant insert (post_type) on public.posts to authenticated;
grant update (post_type) on public.posts to authenticated;
