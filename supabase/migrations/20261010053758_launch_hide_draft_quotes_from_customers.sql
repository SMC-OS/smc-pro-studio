create or replace function private.can_access_quote(p_quote_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.quotes q
           where q.id=p_quote_id
             and (
               (select auth.uid())=q.issuer_id
               or ((select auth.uid())=q.customer_id and q.status <> 'draft'::public.quote_status)
             )
         )
      or private.is_active_project_staff()
      or exists (
           select 1 from public.projects p
           join public.project_members pm on pm.project_id=p.id
           where p.quote_id=p_quote_id and pm.user_id=(select auth.uid())
         );
$$;

grant execute on function private.can_access_quote(uuid) to authenticated, service_role;
