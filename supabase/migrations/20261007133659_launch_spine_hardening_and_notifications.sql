drop policy if exists quotes_issuer_insert on public.quotes;
create policy quotes_issuer_insert on public.quotes for insert to authenticated with check (
  issuer_id=(select auth.uid())
  and status='draft'::public.quote_status
  and exists (
    select 1 from public.quote_requests qr
    where qr.id=quote_request_id
      and qr.requester_id=customer_id
      and qr.assigned_professional_id=(select auth.uid())
  )
);

drop policy if exists quote_requests_customer_update on public.quote_requests;
create policy quote_requests_customer_update on public.quote_requests for update to authenticated
using (
  requester_id=(select auth.uid())
  and status in ('draft'::public.quote_request_status,'submitted'::public.quote_request_status)
)
with check (
  requester_id=(select auth.uid())
  and status in ('draft'::public.quote_request_status,'submitted'::public.quote_request_status,'cancelled'::public.quote_request_status)
);

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.notifications
     set read_at=coalesce(read_at,now())
   where id=p_notification_id and user_id=(select auth.uid());
end;
$$;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.send_quote(p_quote_id uuid, p_valid_until date default null)
returns public.quotes
language plpgsql
security definer
set search_path=''
as $$
declare
  q public.quotes;
  v_subtotal numeric(14,2);
  v_tax numeric(14,2);
begin
  select * into q from public.quotes where id=p_quote_id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.issuer_id <> (select auth.uid()) and not private.is_active_project_staff() then raise exception 'not_authorized'; end if;
  if q.status <> 'draft'::public.quote_status then raise exception 'quote_not_draft'; end if;

  select coalesce(sum(net_total),0), coalesce(sum(tax_amount),0)
    into v_subtotal,v_tax from public.quote_items where quote_id=p_quote_id;
  if not exists (select 1 from public.quote_items where quote_id=p_quote_id) then raise exception 'quote_has_no_items'; end if;

  update public.quotes
     set subtotal=v_subtotal, tax_total=v_tax, total=v_subtotal+v_tax,
         valid_until=coalesce(p_valid_until, current_date+30),
         status='sent'::public.quote_status, sent_at=now()
   where id=p_quote_id
   returning * into q;

  if q.quote_request_id is not null then
    update public.quote_requests
       set status='quoted'::public.quote_request_status
     where id=q.quote_request_id;
  end if;

  insert into public.notifications(user_id,quote_id,kind,title,body)
  values(q.customer_id,q.id,'quote_ready','Your quote is ready','Review your quote and approve it when you are ready.');

  return q;
end;
$$;

create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  q public.quotes;
  qr public.quote_requests;
  v_project_id uuid;
begin
  select * into q from public.quotes where id=p_quote_id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.customer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;
  if q.status not in ('sent'::public.quote_status,'viewed'::public.quote_status) then raise exception 'quote_not_acceptable'; end if;
  if q.valid_until is not null and q.valid_until < current_date then raise exception 'quote_expired'; end if;
  if q.quote_request_id is null then raise exception 'quote_request_required'; end if;

  select * into qr from public.quote_requests where id=q.quote_request_id;
  if qr.id is null then raise exception 'quote_request_not_found'; end if;

  if exists (select 1 from public.projects where quote_id=p_quote_id) then
    select id into v_project_id from public.projects where quote_id=p_quote_id;
    return v_project_id;
  end if;

  update public.quotes set status='accepted'::public.quote_status, accepted_at=now() where id=p_quote_id;
  update public.quote_requests set status='converted'::public.quote_request_status where id=qr.id;

  insert into public.projects(property_id,quote_id,customer_id,lead_professional_id,title,description,status,progress)
  values(qr.property_id,p_quote_id,q.customer_id,q.issuer_id,qr.title,qr.description,'planning'::public.project_status,0)
  returning id into v_project_id;

  insert into public.project_members(project_id,user_id,role,added_by)
  values(v_project_id,q.customer_id,'customer'::public.project_member_role,q.customer_id)
  on conflict do nothing;

  insert into public.project_members(project_id,user_id,role,added_by)
  values(v_project_id,q.issuer_id,'professional'::public.project_member_role,q.customer_id)
  on conflict do nothing;

  insert into public.project_milestones(project_id,title,status,position) values
    (v_project_id,'Site survey','pending'::public.milestone_status,10),
    (v_project_id,'Templating','pending'::public.milestone_status,20),
    (v_project_id,'Fabrication','pending'::public.milestone_status,30),
    (v_project_id,'Installation','pending'::public.milestone_status,40),
    (v_project_id,'Handover','pending'::public.milestone_status,50);

  insert into public.notifications(user_id,project_id,quote_id,kind,title,body)
  values(q.issuer_id,v_project_id,q.id,'quote_accepted','Quote accepted','The customer accepted the quote and a project was created.');

  return v_project_id;
end;
$$;

create or replace function public.send_variation(p_variation_id uuid)
returns public.variations
language plpgsql security definer set search_path=''
as $$
declare v public.variations; p public.projects;
begin
  select * into v from public.variations where id=p_variation_id for update;
  if v.id is null then raise exception 'variation_not_found'; end if;
  if not private.can_manage_project(v.project_id) then raise exception 'not_authorized'; end if;
  if v.status <> 'draft'::public.variation_status then raise exception 'variation_not_draft'; end if;

  update public.variations
     set status='sent'::public.variation_status,sent_at=now()
   where id=p_variation_id
   returning * into v;

  select * into p from public.projects where id=v.project_id;
  insert into public.notifications(user_id,project_id,kind,title,body)
  values(p.customer_id,p.id,'variation_approval','A variation needs your approval',v.title);

  return v;
end;
$$;

create or replace function public.decide_variation(p_variation_id uuid, p_accept boolean, p_note text default null)
returns public.variations
language plpgsql security definer set search_path=''
as $$
declare v public.variations; p public.projects;
begin
  select * into v from public.variations where id=p_variation_id for update;
  if v.id is null then raise exception 'variation_not_found'; end if;
  select * into p from public.projects where id=v.project_id;
  if p.customer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;
  if v.status <> 'sent'::public.variation_status then raise exception 'variation_not_awaiting_decision'; end if;

  update public.variations
     set status=case when p_accept then 'accepted'::public.variation_status else 'rejected'::public.variation_status end,
         decided_at=now(), customer_note=p_note
   where id=p_variation_id
   returning * into v;

  if p.lead_professional_id is not null then
    insert into public.notifications(user_id,project_id,kind,title,body)
    values(
      p.lead_professional_id,p.id,'variation_decided',
      case when p_accept then 'Variation approved' else 'Variation declined' end,
      v.title
    );
  end if;

  return v;
end;
$$;

create index if not exists appointments_created_by_idx on public.appointments(created_by);
create index if not exists notifications_project_idx on public.notifications(project_id) where project_id is not null;
create index if not exists notifications_quote_idx on public.notifications(quote_id) where quote_id is not null;
create index if not exists payments_customer_idx on public.payments(customer_id);
create index if not exists payments_quote_idx on public.payments(quote_id) where quote_id is not null;
create index if not exists payments_variation_idx on public.payments(variation_id) where variation_id is not null;
create index if not exists project_conversations_linked_by_idx on public.project_conversations(linked_by);
create index if not exists project_documents_uploaded_by_idx on public.project_documents(uploaded_by);
create index if not exists project_measurements_created_by_idx on public.project_measurements(created_by);
create index if not exists project_members_added_by_idx on public.project_members(added_by) where added_by is not null;
create index if not exists project_milestones_due_idx on public.project_milestones(due_at) where due_at is not null;
create index if not exists properties_owner_id_idx on public.properties(owner_id);
create index if not exists property_record_created_by_idx on public.property_record_entries(created_by);
create index if not exists property_record_document_idx on public.property_record_entries(document_id) where document_id is not null;
create index if not exists property_record_project_idx on public.property_record_entries(project_id) where project_id is not null;
create index if not exists quote_requests_material_idx on public.quote_requests(material_id) where material_id is not null;
create index if not exists quote_requests_property_idx on public.quote_requests(property_id);
create index if not exists quotes_quote_request_idx on public.quotes(quote_request_id) where quote_request_id is not null;
create index if not exists signoffs_requested_by_idx on public.signoffs(requested_by);
create index if not exists signoffs_signer_idx on public.signoffs(signer_id);
create index if not exists signoffs_variation_idx on public.signoffs(variation_id) where variation_id is not null;
create index if not exists studio_designs_material_idx on public.studio_designs(material_id) where material_id is not null;
create index if not exists studio_designs_project_idx on public.studio_designs(project_id) where project_id is not null;
create index if not exists studio_designs_property_idx on public.studio_designs(property_id) where property_id is not null;
create index if not exists variations_created_by_idx on public.variations(created_by);
create index if not exists warranties_document_idx on public.warranties(document_id) where document_id is not null;
create index if not exists warranties_issued_by_idx on public.warranties(issued_by);
