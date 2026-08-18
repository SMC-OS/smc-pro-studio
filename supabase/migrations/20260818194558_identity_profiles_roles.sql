create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.account_type as enum ('customer', 'professional');
create type public.profile_visibility as enum ('public', 'private');
create type public.professional_category as enum (
  'architect',
  'interior_designer',
  'stone_fabricator',
  'stone_supplier',
  'installer',
  'contractor',
  'developer',
  'construction_professional',
  'smc_team',
  'other'
);
create type public.staff_role as enum (
  'user',
  'smc_staff',
  'moderator',
  'catalogue_editor',
  'project_manager',
  'admin',
  'owner'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type public.account_type not null default 'customer',
  display_name text not null check (char_length(display_name) between 1 and 100),
  username text unique check (username is null or username ~ '^[a-z0-9][a-z0-9._]{2,29}$'),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_path text check (avatar_path is null or avatar_path !~ '(^|/)\.\.(/|$)'),
  visibility public.profile_visibility not null default 'public',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professional_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  category public.professional_category,
  company_name text check (company_name is null or char_length(company_name) <= 160),
  services text[] not null default '{}',
  service_area text check (service_area is null or char_length(service_area) <= 200),
  website_url text check (website_url is null or char_length(website_url) <= 500),
  verification_status text not null default 'not_verified'
    check (verification_status in ('not_verified', 'pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_verification_consistent check (
    (verification_status = 'verified' and verified_at is not null and verified_by is not null)
    or (verification_status <> 'verified' and verified_at is null and verified_by is null)
  )
);

create table public.user_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  assigned_by uuid references auth.users (id) on delete restrict,
  assignment_reason text check (assignment_reason is null or char_length(assignment_reason) <= 500),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete restrict,
  constraint user_roles_revocation_consistent check (
    (revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null)
  )
);

create unique index user_roles_active_unique
  on public.user_roles (user_id, role)
  where revoked_at is null;
create index user_roles_user_id_idx on public.user_roles (user_id);

create table private.role_assignment_audit (
  id bigint generated always as identity primary key,
  user_role_id bigint,
  subject_user_id uuid not null,
  role public.staff_role not null,
  action text not null check (action in ('assigned', 'revoked', 'deleted')),
  actor_user_id uuid,
  reason text,
  occurred_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger professional_profiles_set_updated_at
before update on public.professional_profiles
for each row execute function private.set_updated_at();

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
    requested_category := case new.raw_user_meta_data ->> 'professional_category'
      when 'architect' then 'architect'::public.professional_category
      when 'interior_designer' then 'interior_designer'::public.professional_category
      when 'stone_fabricator' then 'stone_fabricator'::public.professional_category
      when 'stone_supplier' then 'stone_supplier'::public.professional_category
      when 'installer' then 'installer'::public.professional_category
      when 'contractor' then 'contractor'::public.professional_category
      when 'developer' then 'developer'::public.professional_category
      when 'construction_professional' then 'construction_professional'::public.professional_category
      when 'smc_team' then 'smc_team'::public.professional_category
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
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.audit_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into private.role_assignment_audit
      (user_role_id, subject_user_id, role, action, actor_user_id, reason)
    values
      (new.id, new.user_id, new.role, 'assigned', coalesce((select auth.uid()), new.assigned_by), new.assignment_reason);
    return new;
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    insert into private.role_assignment_audit
      (user_role_id, subject_user_id, role, action, actor_user_id, reason)
    values
      (new.id, new.user_id, new.role, 'revoked', coalesce((select auth.uid()), new.revoked_by), new.assignment_reason);
    return new;
  elsif tg_op = 'DELETE' then
    insert into private.role_assignment_audit
      (user_role_id, subject_user_id, role, action, actor_user_id, reason)
    values
      (old.id, old.user_id, old.role, 'deleted', (select auth.uid()), old.assignment_reason);
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_user_role_change() from public, anon, authenticated;

create trigger user_roles_audit
after insert or update or delete on public.user_roles
for each row execute function private.audit_user_role_change();

alter table public.profiles enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table private.role_assignment_audit enable row level security;

create policy profiles_public_read
on public.profiles for select
to anon, authenticated
using (visibility = 'public');

create policy profiles_owner_read
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_owner_insert
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_owner_update
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy professional_profiles_public_read
on public.professional_profiles for select
to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = professional_profiles.user_id
      and p.account_type = 'professional'
      and p.visibility = 'public'
  )
);

create policy professional_profiles_owner_read
on public.professional_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy professional_profiles_owner_insert
on public.professional_profiles for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles p
    where p.id = professional_profiles.user_id and p.account_type = 'professional'
  )
);

create policy professional_profiles_owner_update
on public.professional_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles p
    where p.id = professional_profiles.user_id and p.account_type = 'professional'
  )
);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (id, account_type, display_name, username, bio, avatar_path, visibility, onboarding_completed)
  on public.profiles to authenticated;
grant update (account_type, display_name, username, bio, avatar_path, visibility, onboarding_completed)
  on public.profiles to authenticated;

revoke all on public.professional_profiles from anon, authenticated;
grant select on public.professional_profiles to anon, authenticated;
grant insert (user_id, category, company_name, services, service_area, website_url)
  on public.professional_profiles to authenticated;
grant update (category, company_name, services, service_area, website_url)
  on public.professional_profiles to authenticated;

revoke all on public.user_roles from anon, authenticated;
revoke all on private.role_assignment_audit from anon, authenticated;
