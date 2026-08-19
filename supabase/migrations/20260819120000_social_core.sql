-- Phase 3 social core: relationships (follow/connect/block) and the post/comment/reaction/save graph.
-- Extends the Phase 2 identity foundation (public.profiles, public.professional_profiles, public.user_roles).
-- Reuses public.content_visibility from 20260818194611_visibility_account_deletion.sql.

-- ==========================================================================
-- Relationships
-- ==========================================================================

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id);

create type public.connection_status as enum ('pending', 'accepted', 'declined', 'revoked');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_no_self check (requester_id <> addressee_id),
  constraint connections_response_consistent check (
    (status = 'pending' and responded_at is null) or (status <> 'pending' and responded_at is not null)
  )
);

-- One meaningful relationship per unordered pair at a time.
create unique index connections_pair_unique
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status in ('pending', 'accepted');
create index connections_requester_idx on public.connections (requester_id);
create index connections_addressee_idx on public.connections (addressee_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

-- ==========================================================================
-- Helper functions (kept private; used to share visibility logic across
-- posts/comments/reactions/post_media/saved_posts policies instead of
-- duplicating the same predicate five times).
-- ==========================================================================

create or replace function private.is_following(p_follower uuid, p_followee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.follows
    where follower_id = p_follower and followee_id = p_followee
  );
$$;

create or replace function private.has_accepted_connection(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = p_user_a and addressee_id = p_user_b)
        or (requester_id = p_user_b and addressee_id = p_user_a))
  );
$$;

create or replace function private.has_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where blocker_id = p_blocker and blocked_id = p_blocked
  );
$$;

revoke all on function private.is_following(uuid, uuid) from public;
revoke all on function private.has_accepted_connection(uuid, uuid) from public;
revoke all on function private.has_blocked(uuid, uuid) from public;
grant execute on function private.is_following(uuid, uuid) to anon, authenticated;
grant execute on function private.has_accepted_connection(uuid, uuid) to anon, authenticated;
grant execute on function private.has_blocked(uuid, uuid) to anon, authenticated;

-- ==========================================================================
-- Posts
-- ==========================================================================

create type public.moderation_status as enum ('visible', 'removed_by_owner', 'removed_by_moderator');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text check (body is null or char_length(body) <= 3000),
  visibility public.content_visibility not null default 'private',
  moderation_status public.moderation_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_public_feed_idx on public.posts (created_at desc)
  where visibility = 'public' and moderation_status = 'visible';

create trigger posts_set_updated_at
before update on public.posts
for each row execute function private.set_updated_at();

create or replace function private.can_view_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and p.moderation_status = 'visible'
      and (
        p.visibility = 'public'
        or p.author_id = (select auth.uid())
        or (p.visibility = 'followers' and (select auth.uid()) is not null
            and private.is_following((select auth.uid()), p.author_id))
        or (p.visibility = 'connections' and (select auth.uid()) is not null
            and private.has_accepted_connection((select auth.uid()), p.author_id))
      )
      and not (
        (select auth.uid()) is not null
        and private.has_blocked(p.author_id, (select auth.uid()))
      )
  );
$$;

revoke all on function private.can_view_post(uuid) from public;
grant execute on function private.can_view_post(uuid) to anon, authenticated;

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null check (storage_path !~ '(^|/)\.\.(/|$)'),
  media_type text not null check (media_type in ('image', 'video')),
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index post_media_post_idx on public.post_media (post_id, position);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  moderation_status public.moderation_status not null default 'visible',
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);

create table public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ==========================================================================
-- Row level security
-- ==========================================================================

alter table public.follows enable row level security;
alter table public.connections enable row level security;
alter table public.blocks enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.saved_posts enable row level security;

-- Follows: visible and manageable only by the two parties for now.
-- Public follower/following counts are a deliberately deferred follow-up slice.
create policy follows_party_read
on public.follows for select
to authenticated
using ((select auth.uid()) in (follower_id, followee_id));

create policy follows_owner_insert
on public.follows for insert
to authenticated
with check ((select auth.uid()) = follower_id);

create policy follows_owner_delete
on public.follows for delete
to authenticated
using ((select auth.uid()) = follower_id);

-- Connections: request/accept state machine. Requester cannot self-accept.
create policy connections_party_read
on public.connections for select
to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy connections_requester_insert
on public.connections for insert
to authenticated
with check ((select auth.uid()) = requester_id and status = 'pending' and responded_at is null);

create policy connections_addressee_respond
on public.connections for update
to authenticated
using ((select auth.uid()) = addressee_id and status = 'pending')
with check (
  (select auth.uid()) = addressee_id
  and status in ('accepted', 'declined')
  and responded_at is not null
);

create policy connections_requester_revoke
on public.connections for update
to authenticated
using ((select auth.uid()) = requester_id and status = 'pending')
with check (
  (select auth.uid()) = requester_id
  and status = 'revoked'
  and responded_at is not null
);

-- Blocks: private to the blocker; enforced elsewhere via private.has_blocked().
create policy blocks_owner_read
on public.blocks for select
to authenticated
using ((select auth.uid()) = blocker_id);

create policy blocks_owner_insert
on public.blocks for insert
to authenticated
with check ((select auth.uid()) = blocker_id);

create policy blocks_owner_delete
on public.blocks for delete
to authenticated
using ((select auth.uid()) = blocker_id);

-- Posts: guests and members read public posts; owner always reads their own;
-- followers/connections visibility opens up once those relationships exist.
create policy posts_public_read
on public.posts for select
to anon, authenticated
using (visibility = 'public' and moderation_status = 'visible');

create policy posts_owner_read
on public.posts for select
to authenticated
using ((select auth.uid()) = author_id);

create policy posts_relationship_read
on public.posts for select
to authenticated
using (
  moderation_status = 'visible'
  and (
    (visibility = 'followers' and private.is_following((select auth.uid()), author_id))
    or (visibility = 'connections' and private.has_accepted_connection((select auth.uid()), author_id))
  )
);

create policy posts_owner_insert
on public.posts for insert
to authenticated
with check ((select auth.uid()) = author_id and moderation_status = 'visible');

create policy posts_owner_update
on public.posts for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id and moderation_status = 'visible');

create policy posts_owner_delete
on public.posts for delete
to authenticated
using ((select auth.uid()) = author_id);

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (id, author_id, body, visibility) on public.posts to authenticated;
grant update (body, visibility) on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- Post media follows the parent post's visibility via private.can_view_post().
create policy post_media_read
on public.post_media for select
to anon, authenticated
using (private.can_view_post(post_id));

create policy post_media_owner_insert
on public.post_media for insert
to authenticated
with check (
  exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
);

create policy post_media_owner_delete
on public.post_media for delete
to authenticated
using (
  exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
);

-- Comments: readable wherever the parent post is readable; anyone who can
-- see the post may comment, unless the author has blocked them.
create policy comments_read
on public.comments for select
to anon, authenticated
using (moderation_status = 'visible' and private.can_view_post(post_id));

create policy comments_author_insert
on public.comments for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and moderation_status = 'visible'
  and private.can_view_post(post_id)
  and not exists (
    select 1 from public.posts p where p.id = post_id and private.has_blocked(p.author_id, (select auth.uid()))
  )
);

create policy comments_author_delete
on public.comments for delete
to authenticated
using ((select auth.uid()) = author_id);

-- Reactions: same visibility rule as comments; one reaction per user per post.
create policy reactions_read
on public.reactions for select
to anon, authenticated
using (private.can_view_post(post_id));

create policy reactions_owner_insert
on public.reactions for insert
to authenticated
with check ((select auth.uid()) = user_id and private.can_view_post(post_id));

create policy reactions_owner_delete
on public.reactions for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Saved posts: private to the saver.
create policy saved_posts_owner_read
on public.saved_posts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy saved_posts_owner_insert
on public.saved_posts for insert
to authenticated
with check ((select auth.uid()) = user_id and private.can_view_post(post_id));

create policy saved_posts_owner_delete
on public.saved_posts for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;

revoke all on public.connections from anon, authenticated;
grant select, insert, update on public.connections to authenticated;

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

revoke all on public.post_media from anon, authenticated;
grant select on public.post_media to anon, authenticated;
grant insert, delete on public.post_media to authenticated;

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (id, post_id, author_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

revoke all on public.reactions from anon, authenticated;
grant select on public.reactions to anon, authenticated;
grant insert (post_id, user_id, reaction_type) on public.reactions to authenticated;
grant delete on public.reactions to authenticated;

revoke all on public.saved_posts from anon, authenticated;
grant select, insert, delete on public.saved_posts to authenticated;
