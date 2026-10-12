drop policy if exists quotes_read on public.quotes;
create policy quotes_read on public.quotes
for select to authenticated
using (
  issuer_id = (select auth.uid())
  or (customer_id = (select auth.uid()) and status <> 'draft'::public.quote_status)
  or private.is_active_project_staff()
  or exists (
    select 1
      from public.projects p
      join public.project_members pm on pm.project_id = p.id
     where p.quote_id = quotes.id
       and pm.user_id = (select auth.uid())
  )
);
