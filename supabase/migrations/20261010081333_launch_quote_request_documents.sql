create table if not exists public.quote_request_documents (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  kind public.document_kind not null default 'other',
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now(),
  constraint quote_request_documents_kind_check
    check (kind in (
      'photo'::public.document_kind,
      'plan'::public.document_kind,
      'measurement'::public.document_kind,
      'other'::public.document_kind
    ))
);

create index if not exists quote_request_documents_request_idx
  on public.quote_request_documents(quote_request_id, created_at desc);
create index if not exists quote_request_documents_uploaded_by_idx
  on public.quote_request_documents(uploaded_by);

create or replace function private.can_access_quote_request(p_request_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select private.is_active_project_staff()
      or exists (
        select 1
        from public.quote_requests qr
        where qr.id=p_request_id
          and (
            qr.requester_id=(select auth.uid())
            or qr.assigned_professional_id=(select auth.uid())
          )
      );
$$;

create or replace function private.can_upload_quote_request(p_request_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.quote_requests qr
    where qr.id=p_request_id
      and qr.requester_id=(select auth.uid())
      and qr.status in (
        'draft'::public.quote_request_status,
        'submitted'::public.quote_request_status
      )
  );
$$;

create or replace function private.can_access_quote_request_path(p_request_id_text text)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select private.is_active_project_staff()
      or exists (
        select 1
        from public.quote_requests qr
        where qr.id::text=p_request_id_text
          and (
            qr.requester_id=(select auth.uid())
            or qr.assigned_professional_id=(select auth.uid())
          )
      );
$$;

create or replace function private.can_upload_quote_request_path(p_request_id_text text)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.quote_requests qr
    where qr.id::text=p_request_id_text
      and qr.requester_id=(select auth.uid())
      and qr.status in (
        'draft'::public.quote_request_status,
        'submitted'::public.quote_request_status
      )
  );
$$;

revoke all on function private.can_access_quote_request(uuid) from public;
revoke all on function private.can_upload_quote_request(uuid) from public;
revoke all on function private.can_access_quote_request_path(text) from public;
revoke all on function private.can_upload_quote_request_path(text) from public;
grant execute on function private.can_access_quote_request(uuid) to authenticated, service_role;
grant execute on function private.can_upload_quote_request(uuid) to authenticated, service_role;
grant execute on function private.can_access_quote_request_path(text) to authenticated, service_role;
grant execute on function private.can_upload_quote_request_path(text) to authenticated, service_role;

alter table public.quote_request_documents enable row level security;

create policy quote_request_documents_read
on public.quote_request_documents
for select to authenticated
using (private.can_access_quote_request(quote_request_id));

create policy quote_request_documents_insert
on public.quote_request_documents
for insert to authenticated
with check (
  uploaded_by=(select auth.uid())
  and private.can_upload_quote_request(quote_request_id)
);

create policy quote_request_documents_delete
on public.quote_request_documents
for delete to authenticated
using (
  uploaded_by=(select auth.uid())
  and private.can_upload_quote_request(quote_request_id)
);

revoke all on table public.quote_request_documents from public, anon, authenticated, service_role;
grant select, insert, delete on table public.quote_request_documents to authenticated;
grant select, insert, update, delete on table public.quote_request_documents to service_role;
revoke truncate, references, trigger on table public.quote_request_documents from anon, authenticated, service_role;

drop policy if exists storage_quote_request_member_read on storage.objects;
create policy storage_quote_request_member_read
on storage.objects for select
to authenticated
using (
  bucket_id='private-project-media'
  and (storage.foldername(name))[1]='quote-requests'
  and private.can_access_quote_request_path((storage.foldername(name))[2])
);

drop policy if exists storage_quote_request_owner_insert on storage.objects;
create policy storage_quote_request_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id='private-project-media'
  and (storage.foldername(name))[1]='quote-requests'
  and (storage.foldername(name))[3]=(select auth.uid()::text)
  and private.can_upload_quote_request_path((storage.foldername(name))[2])
);

drop policy if exists storage_quote_request_owner_delete on storage.objects;
create policy storage_quote_request_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id='private-project-media'
  and (storage.foldername(name))[1]='quote-requests'
  and owner_id=(select auth.uid()::text)
  and private.can_upload_quote_request_path((storage.foldername(name))[2])
);
