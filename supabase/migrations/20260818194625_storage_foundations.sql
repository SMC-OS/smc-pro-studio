insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('public-media', 'public-media', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('private-user-media', 'private-user-media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('private-project-media', 'private-project-media', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_public_media_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('avatars', 'public-media')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy storage_public_media_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id in ('avatars', 'public-media')
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id in ('avatars', 'public-media')
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy storage_public_media_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id in ('avatars', 'public-media')
  and owner_id = (select auth.uid()::text)
);

create policy storage_private_user_owner_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'private-user-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy storage_private_user_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'private-user-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy storage_private_user_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'private-user-media'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'private-user-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy storage_private_user_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'private-user-media'
  and owner_id = (select auth.uid()::text)
);
