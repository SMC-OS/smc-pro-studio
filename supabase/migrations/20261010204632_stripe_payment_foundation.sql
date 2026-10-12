alter table public.payments
  add column if not exists requested_by uuid references public.profiles(id) on delete restrict,
  add column if not exists request_note text check (request_note is null or char_length(request_note) <= 1000),
  add column if not exists collection_method text not null default 'checkout'
    check (collection_method in ('checkout','invoice')),
  add column if not exists provider_checkout_session_id text,
  add column if not exists provider_charge_id text,
  add column if not exists provider_invoice_id text,
  add column if not exists provider_customer_id text,
  add column if not exists receipt_url text,
  add column if not exists hosted_invoice_url text,
  add column if not exists invoice_pdf_url text,
  add column if not exists checkout_attempt integer not null default 0 check (checkout_attempt >= 0),
  add column if not exists checkout_expires_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists failure_message text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_amount numeric(14,2) not null default 0 check (refunded_amount >= 0),
  add column if not exists disputed_amount numeric(14,2) not null default 0 check (disputed_amount >= 0),
  add column if not exists last_provider_event_id text,
  add column if not exists last_provider_event_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='payments_amount_two_dp' and conrelid='public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_amount_two_dp check (amount = round(amount,2));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='payments_refund_within_amount' and conrelid='public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_refund_within_amount check (refunded_amount <= amount);
  end if;
end $$;

create unique index if not exists payments_checkout_session_unique
  on public.payments(provider_checkout_session_id)
  where provider_checkout_session_id is not null;
create unique index if not exists payments_charge_unique
  on public.payments(provider_charge_id)
  where provider_charge_id is not null;
create unique index if not exists payments_invoice_unique
  on public.payments(provider_invoice_id)
  where provider_invoice_id is not null;
create index if not exists payments_requested_by_idx on public.payments(requested_by) where requested_by is not null;
create index if not exists payments_status_idx on public.payments(status, due_at);

create table if not exists public.stripe_customers (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('test','live')),
  provider_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, mode)
);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider_refund_id text not null unique,
  amount numeric(14,2) not null check (amount > 0 and amount = round(amount,2)),
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending','succeeded','failed','cancelled')),
  reason text,
  provider_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider_dispute_id text not null unique,
  amount numeric(14,2) not null check (amount > 0 and amount = round(amount,2)),
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  status text not null,
  reason text,
  evidence_due_at timestamptz,
  provider_created_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  object_id text,
  provider_created_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_text text
);

create index if not exists payment_refunds_payment_idx on public.payment_refunds(payment_id, created_at desc);
create index if not exists payment_disputes_payment_idx on public.payment_disputes(payment_id, created_at desc);
create index if not exists stripe_webhook_events_processed_idx
  on public.stripe_webhook_events(processed_at)
  where processed_at is null;

alter table public.stripe_customers enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.payment_disputes enable row level security;
alter table public.stripe_webhook_events enable row level security;

create or replace function private.can_access_payment(p_payment_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.payments p
    where p.id=p_payment_id
      and (
        private.is_project_member(p.project_id)
        or private.is_active_project_staff()
      )
  );
$$;

revoke all on function private.can_access_payment(uuid) from public;
grant execute on function private.can_access_payment(uuid) to authenticated, service_role;

drop policy if exists payment_refunds_read on public.payment_refunds;
create policy payment_refunds_read
on public.payment_refunds for select to authenticated
using (private.can_access_payment(payment_id));

drop policy if exists payment_disputes_read on public.payment_disputes;
create policy payment_disputes_read
on public.payment_disputes for select to authenticated
using (private.can_access_payment(payment_id));

revoke all on table public.stripe_customers, public.payment_refunds, public.payment_disputes, public.stripe_webhook_events
  from public, anon, authenticated, service_role;
grant select on table public.payment_refunds, public.payment_disputes to authenticated;
grant select,insert,update,delete on table
  public.stripe_customers, public.payment_refunds, public.payment_disputes, public.stripe_webhook_events
to service_role;
revoke truncate, references, trigger on table
  public.stripe_customers, public.payment_refunds, public.payment_disputes, public.stripe_webhook_events
from anon, authenticated, service_role;

create or replace function private.approved_project_value(p_project_id uuid)
returns numeric
language sql stable security definer
set search_path=''
as $$
  select round(
    coalesce(q.total,0)
    + coalesce((
      select sum(v.amount_delta)
      from public.variations v
      where v.project_id=p.id
        and v.status='accepted'::public.variation_status
    ),0),
    2
  )
  from public.projects p
  join public.quotes q on q.id=p.quote_id
  where p.id=p_project_id;
$$;

create or replace function private.committed_project_payment_value(p_project_id uuid)
returns numeric
language sql stable security definer
set search_path=''
as $$
  select round(coalesce(sum(
    case
      when p.status in ('pending'::public.payment_status,'requires_action'::public.payment_status)
        then p.amount
      when p.status='paid'::public.payment_status
        then greatest(p.amount-p.refunded_amount,0)
      else 0
    end
  ),0),2)
  from public.payments p
  where p.project_id=p_project_id
    and p.kind <> 'refund'::public.payment_kind;
$$;

revoke all on function private.approved_project_value(uuid) from public;
revoke all on function private.committed_project_payment_value(uuid) from public;
grant execute on function private.approved_project_value(uuid) to service_role;
grant execute on function private.committed_project_payment_value(uuid) to service_role;

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
  if not private.can_manage_project(pr.id) then raise exception 'not_authorized'; end if;
  if pr.status='cancelled'::public.project_status then raise exception 'project_cancelled'; end if;
  if p_kind='refund'::public.payment_kind then raise exception 'refund_kind_not_requestable'; end if;
  if p_collection_method not in ('checkout','invoice') then raise exception 'invalid_collection_method'; end if;
  if v_note is not null and char_length(v_note)>1000 then raise exception 'note_too_long'; end if;
  if p_due_at is not null and p_due_at<=now() then raise exception 'due_date_must_be_future'; end if;
  if p_collection_method='invoice' and p_due_at is null then raise exception 'invoice_due_date_required'; end if;

  select * into q from public.quotes where id=pr.quote_id;
  if q.id is null or q.status<>'accepted'::public.quote_status then raise exception 'accepted_quote_required'; end if;
  if q.currency<>'GBP' then raise exception 'unsupported_currency'; end if;

  v_approved := private.approved_project_value(pr.id);
  v_committed := private.committed_project_payment_value(pr.id);
  v_remaining := round(greatest(v_approved-v_committed,0),2);
  v_amount := case when p_amount is null then v_remaining else round(p_amount,2) end;

  if v_amount<=0 then raise exception 'payment_amount_must_be_positive'; end if;
  if v_amount>v_remaining then raise exception 'payment_exceeds_outstanding_balance'; end if;

  insert into public.payments(
    project_id, quote_id, customer_id, requested_by, kind, status,
    currency, amount, provider, due_at, collection_method, request_note
  )
  values(
    pr.id, pr.quote_id, pr.customer_id, (select auth.uid()), p_kind, 'pending'::public.payment_status,
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

revoke all on function public.request_project_payment(uuid,public.payment_kind,numeric,timestamptz,text,text) from public, anon;
grant execute on function public.request_project_payment(uuid,public.payment_kind,numeric,timestamptz,text,text) to authenticated;
