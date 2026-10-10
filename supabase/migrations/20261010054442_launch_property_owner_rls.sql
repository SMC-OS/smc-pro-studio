drop policy if exists properties_read on public.properties;
create policy properties_read on public.properties
for select to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_active_project_staff()
  or exists (
    select 1
      from public.projects p
      join public.project_members pm on pm.project_id = p.id
     where p.property_id = properties.id
       and pm.user_id = (select auth.uid())
  )
  or exists (
    select 1
      from public.quote_requests qr
     where qr.property_id = properties.id
       and qr.assigned_professional_id = (select auth.uid())
  )
);
