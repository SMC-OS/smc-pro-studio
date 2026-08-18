create type public.content_visibility as enum (
  'public',
  'followers',
  'connections',
  'project',
  'private'
);

create type public.account_deletion_status as enum (
  'requested',
  'identity_locked',
  'retention_review',
  'completed',
  'cancelled'
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.account_deletion_status not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  cancellation_requested_at timestamptz,
  internal_notes text,
  constraint account_deletion_completion_consistent check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create unique index account_deletion_one_active_request
  on public.account_deletion_requests (user_id)
  where status in ('requested', 'identity_locked', 'retention_review');
create index account_deletion_user_id_idx on public.account_deletion_requests (user_id);

alter table public.account_deletion_requests enable row level security;

create policy account_deletion_owner_read
on public.account_deletion_requests for select
to authenticated
using ((select auth.uid()) = user_id);

create policy account_deletion_owner_request
on public.account_deletion_requests for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'requested'
  and completed_at is null
  and cancellation_requested_at is null
  and internal_notes is null
);

create policy account_deletion_owner_cancel_request
on public.account_deletion_requests for update
to authenticated
using ((select auth.uid()) = user_id and status = 'requested')
with check (
  (select auth.uid()) = user_id
  and status = 'requested'
  and completed_at is null
  and cancellation_requested_at is not null
  and internal_notes is null
);

revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant insert (user_id) on public.account_deletion_requests to authenticated;
grant update (cancellation_requested_at) on public.account_deletion_requests to authenticated;
