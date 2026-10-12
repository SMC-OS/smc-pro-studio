create table if not exists public.stripe_connected_accounts (
  professional_id uuid not null references public.profiles(id) on delete cascade,
  environment text not null check (environment in ('sandbox','live')),
  provider_account_id text not null,
  dashboard text not null default 'full' check (dashboard = 'full'),
  fees_collector text not null default 'stripe' check (fees_collector = 'stripe'),
  losses_collector text not null default 'stripe' check (losses_collector = 'stripe'),
  requirements_collector text check (requirements_collector is null or requirements_collector in ('stripe','application')),
  card_payments_status text,
  payouts_status text,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  onboarding_complete boolean not null default false,
  payout_schedule_interval text,
  payout_delay_days integer,
  debit_negative_balances boolean,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (professional_id, environment),
  unique (provider_account_id, environment),
  check (provider_account_id ~ '^acct_[A-Za-z0-9]+$')
);

alter table public.stripe_connected_accounts enable row level security;

drop policy if exists stripe_connected_accounts_owner_read on public.stripe_connected_accounts;
create policy stripe_connected_accounts_owner_read
on public.stripe_connected_accounts
for select to authenticated
using ((select auth.uid()) = professional_id);

revoke all on table public.stripe_connected_accounts
  from public, anon, authenticated, service_role;
grant select on table public.stripe_connected_accounts to authenticated;
grant select,insert,update,delete on table public.stripe_connected_accounts to service_role;
revoke truncate, references, trigger on table public.stripe_connected_accounts
  from anon, authenticated, service_role;

alter table public.payments
  add column if not exists seller_id uuid references public.profiles(id) on delete restrict,
  add column if not exists provider_account_id text;

create index if not exists payments_seller_idx on public.payments(seller_id) where seller_id is not null;
create index if not exists payments_provider_account_idx
  on public.payments(provider_account_id, created_at desc)
  where provider_account_id is not null;

alter table public.payment_refunds
  add column if not exists provider_account_id text;

alter table public.payment_disputes
  add column if not exists provider_account_id text;

alter table public.stripe_webhook_events
  add column if not exists provider_account_id text;

alter table public.stripe_customers
  add column if not exists provider_account_id text;

alter table public.stripe_customers drop constraint if exists stripe_customers_mode_check;
alter table public.stripe_customers
  add constraint stripe_customers_mode_check
  check (mode in ('sandbox','live'));

alter table public.stripe_customers drop constraint if exists stripe_customers_pkey;
alter table public.stripe_customers drop constraint if exists stripe_customers_provider_customer_id_key;
alter table public.stripe_customers
  alter column provider_account_id set not null;
alter table public.stripe_customers
  add constraint stripe_customers_pkey
  primary key (profile_id, provider_account_id, mode);
alter table public.stripe_customers
  add constraint stripe_customers_provider_customer_scope_key
  unique (provider_account_id, provider_customer_id, mode);

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
  if q.professional_id is distinct from pr.lead_professional_id then raise exception 'quote_seller_mismatch'; end if;
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

drop function if exists public.claim_stripe_webhook_event(text,text,boolean,text,timestamptz);

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_provider_account_id text default null,
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
    event_id, event_type, livemode, provider_account_id, object_id, provider_created_at,
    processing_started_at, processing_attempts
  )
  values(
    p_event_id, p_event_type, p_livemode, p_provider_account_id, p_object_id, p_provider_created_at,
    now(), 1
  )
  on conflict (event_id) do update
     set event_type=excluded.event_type,
         livemode=excluded.livemode,
         provider_account_id=coalesce(excluded.provider_account_id, public.stripe_webhook_events.provider_account_id),
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

revoke all on function public.claim_stripe_webhook_event(text,text,boolean,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text,text,boolean,text,text,timestamptz)
  to service_role;
