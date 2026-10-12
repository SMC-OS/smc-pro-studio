alter table public.stripe_webhook_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_attempts integer not null default 0 check (processing_attempts >= 0);

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_object_id text default null,
  p_provider_created_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_event_id text;
begin
  insert into public.stripe_webhook_events(
    event_id, event_type, livemode, object_id, provider_created_at,
    processing_started_at, processing_attempts
  )
  values(
    p_event_id, p_event_type, p_livemode, p_object_id, p_provider_created_at,
    now(), 1
  )
  on conflict (event_id) do update
     set event_type=excluded.event_type,
         livemode=excluded.livemode,
         object_id=coalesce(excluded.object_id, public.stripe_webhook_events.object_id),
         provider_created_at=coalesce(excluded.provider_created_at, public.stripe_webhook_events.provider_created_at),
         processing_started_at=now(),
         processing_attempts=public.stripe_webhook_events.processing_attempts+1,
         error_text=null
   where public.stripe_webhook_events.processed_at is null
     and (
       public.stripe_webhook_events.error_text is not null
       or public.stripe_webhook_events.processing_started_at is null
       or public.stripe_webhook_events.processing_started_at < now()-interval '5 minutes'
     )
  returning event_id into v_event_id;

  return v_event_id is not null;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text,text,boolean,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text,text,boolean,text,timestamptz)
  to service_role;

create or replace function public.claim_project_payment_for_collection(
  p_payment_id uuid,
  p_customer_id uuid,
  p_collection_method text
)
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  v_payment public.payments;
  v_project public.projects;
  v_approved numeric(14,2);
  v_other_committed numeric(14,2);
begin
  select * into v_payment
    from public.payments
   where id=p_payment_id
   for update;

  if v_payment.id is null then raise exception 'payment_not_found'; end if;
  if v_payment.customer_id<>p_customer_id then raise exception 'customer_mismatch'; end if;
  if v_payment.collection_method<>p_collection_method then raise exception 'collection_method_mismatch'; end if;
  if v_payment.status in ('paid'::public.payment_status,'refunded'::public.payment_status) then
    raise exception 'payment_already_settled';
  end if;

  select * into v_project
    from public.projects
   where id=v_payment.project_id
   for update;

  if v_project.id is null then raise exception 'project_not_found'; end if;
  if v_project.status='cancelled'::public.project_status then raise exception 'project_cancelled'; end if;

  v_approved := private.approved_project_value(v_project.id);

  select round(coalesce(sum(
    case
      when p.status in ('pending'::public.payment_status,'requires_action'::public.payment_status)
        then p.amount
      when p.status in ('paid'::public.payment_status,'refunded'::public.payment_status)
        then greatest(p.amount-p.refunded_amount,0)
      else 0
    end
  ),0),2)
  into v_other_committed
  from public.payments p
  where p.project_id=v_project.id
    and p.id<>v_payment.id
    and p.kind<>'refund'::public.payment_kind;

  if round(v_other_committed+v_payment.amount,2)>v_approved then
    raise exception 'payment_exceeds_current_outstanding_balance';
  end if;

  update public.payments
     set status='pending'::public.payment_status,
         cancelled_at=null,
         failure_code=null,
         failure_message=null
   where id=v_payment.id
   returning * into v_payment;

  return v_payment;
end;
$$;

revoke all on function public.claim_project_payment_for_collection(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.claim_project_payment_for_collection(uuid,uuid,text)
  to service_role;
