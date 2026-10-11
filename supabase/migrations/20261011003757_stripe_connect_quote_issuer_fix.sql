create or replace function public.request_project_payment(
  p_project_id uuid,
  p_kind public.payment_kind,
  p_amount numeric default null,
  p_due_at timestamptz default null,
  p_collection_method text default 'checkout',
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  pr public.projects;
  q public.quotes;
  v_approved numeric(14,2);
  v_committed numeric(14,2);
  v_remaining numeric(14,2);
  v_amount numeric(14,2);
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
  out_payment public.payments;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;

  select * into pr from public.projects where id=p_project_id for update;
  if pr.id is null then raise exception 'project_not_found'; end if;
  if pr.lead_professional_id is null then raise exception 'project_seller_required'; end if;
  if pr.lead_professional_id <> (select auth.uid()) then raise exception 'seller_only'; end if;
  if pr.status='cancelled'::public.project_status then raise exception 'project_cancelled'; end if;
  if p_kind='refund'::public.payment_kind then raise exception 'refund_kind_not_requestable'; end if;
  if p_collection_method not in ('checkout','invoice') then raise exception 'invalid_collection_method'; end if;
  if v_note is not null and char_length(v_note)>1000 then raise exception 'note_too_long'; end if;
  if p_due_at is not null and p_due_at<=now() then raise exception 'due_date_must_be_future'; end if;
  if p_collection_method='invoice' and p_due_at is null then raise exception 'invoice_due_date_required'; end if;

  select * into q from public.quotes where id=pr.quote_id;
  if q.id is null or q.status<>'accepted'::public.quote_status then raise exception 'accepted_quote_required'; end if;
  if q.issuer_id is distinct from pr.lead_professional_id then raise exception 'quote_seller_mismatch'; end if;
  if q.currency<>'GBP' then raise exception 'unsupported_currency'; end if;

  v_approved := private.approved_project_value(pr.id);
  v_committed := private.committed_project_payment_value(pr.id);
  v_remaining := round(greatest(v_approved-v_committed,0),2);
  v_amount := case when p_amount is null then v_remaining else round(p_amount,2) end;

  if v_amount<=0 then raise exception 'payment_amount_must_be_positive'; end if;
  if v_amount>v_remaining then raise exception 'payment_exceeds_outstanding_balance'; end if;

  insert into public.payments(
    project_id, quote_id, customer_id, seller_id, requested_by, kind, status,
    currency, amount, provider, due_at, collection_method, request_note
  )
  values(
    pr.id, pr.quote_id, pr.customer_id, pr.lead_professional_id, (select auth.uid()),
    p_kind, 'pending'::public.payment_status,
    'GBP', v_amount, 'stripe', p_due_at, p_collection_method, v_note
  )
  returning * into out_payment;

  insert into public.notifications(user_id,project_id,quote_id,kind,title,body)
  values(
    pr.customer_id,
    pr.id,
    pr.quote_id,
    'payment_due',
    'Project payment requested',
    format('A project payment of £%s is ready for you to review.', to_char(v_amount,'FM999999999990.00'))
  );

  return out_payment;
end;
$$;

revoke all on function public.request_project_payment(uuid,public.payment_kind,numeric,timestamptz,text,text)
  from public, anon;
grant execute on function public.request_project_payment(uuid,public.payment_kind,numeric,timestamptz,text,text)
  to authenticated;
