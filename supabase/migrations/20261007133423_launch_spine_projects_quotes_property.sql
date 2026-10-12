-- SMC Pro Studio launch spine: additive-only staging schema.
-- Existing identity/network/messaging/materials objects are preserved.

do $$ begin create type public.property_kind as enum ('house','flat','commercial','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.quote_request_status as enum ('draft','submitted','reviewing','quoted','cancelled','converted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.quote_status as enum ('draft','sent','viewed','accepted','rejected','expired','superseded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.project_status as enum ('planning','survey','templating','fabrication','installation','snagging','complete','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.project_member_role as enum ('customer','professional','project_manager','crew','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.milestone_status as enum ('pending','active','completed','skipped'); exception when duplicate_object then null; end $$;
do $$ begin create type public.appointment_type as enum ('consultation','site_survey','templating','delivery','installation','snagging','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.appointment_status as enum ('proposed','confirmed','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.variation_status as enum ('draft','sent','accepted','rejected','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending','requires_action','paid','failed','refunded','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_kind as enum ('deposit','stage','balance','refund','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.document_kind as enum ('photo','plan','quote','contract','invoice','receipt','warranty','certificate','measurement','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.signoff_type as enum ('quote_acceptance','variation_acceptance','completion','handover'); exception when duplicate_object then null; end $$;
do $$ begin create type public.signoff_status as enum ('pending','signed','declined'); exception when duplicate_object then null; end $$;
do $$ begin create type public.studio_design_status as enum ('draft','ready','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.measurement_source as enum ('manual','assisted','professional'); exception when duplicate_object then null; end $$;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  property_kind public.property_kind not null default 'house',
  address_line1 text not null check (char_length(address_line1) between 1 and 200),
  address_line2 text,
  city text not null check (char_length(city) between 1 and 120),
  postcode text not null check (char_length(postcode) between 2 and 20),
  country_code text not null default 'GB' check (char_length(country_code)=2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete restrict,
  assigned_professional_id uuid references public.profiles(id) on delete set null,
  material_id uuid references public.materials(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  project_type text not null check (char_length(project_type) between 1 and 80),
  description text check (description is null or char_length(description) <= 5000),
  selections jsonb not null default '{}'::jsonb,
  status public.quote_request_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid references public.quote_requests(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  issuer_id uuid not null references public.profiles(id) on delete restrict,
  status public.quote_status not null default 'draft',
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  scope_summary text check (scope_summary is null or char_length(scope_summary) <= 5000),
  terms text check (terms is null or char_length(terms) <= 12000),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  valid_until date,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 1000),
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit text not null default 'item' check (char_length(unit) between 1 and 30),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  tax_rate numeric(6,5) not null default 0.20 check (tax_rate >= 0 and tax_rate <= 1),
  net_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  tax_amount numeric(14,2) generated always as (round(quantity * unit_price * tax_rate, 2)) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  quote_id uuid unique references public.quotes(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  lead_professional_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  description text check (description is null or char_length(description) <= 5000),
  status public.project_status not null default 'planning',
  progress smallint not null default 0 check (progress between 0 and 100),
  start_date date,
  target_completion_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_member_role not null,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (project_id,user_id)
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  status public.milestone_status not null default 'pending',
  position integer not null default 0 check (position >= 0),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  appointment_type public.appointment_type not null,
  status public.appointment_status not null default 'proposed',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text check (notes is null or char_length(notes) <= 3000),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.variations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  description text check (description is null or char_length(description) <= 5000),
  amount_delta numeric(14,2) not null default 0,
  days_delta integer not null default 0,
  status public.variation_status not null default 'draft',
  sent_at timestamptz,
  decided_at timestamptz,
  customer_note text check (customer_note is null or char_length(customer_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  kind public.document_kind not null default 'other',
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now()
);

create table if not exists public.project_conversations (
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  linked_by uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (project_id, conversation_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  variation_id uuid references public.variations(id) on delete set null,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  kind public.payment_kind not null,
  status public.payment_status not null default 'pending',
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  amount numeric(14,2) not null check (amount >= 0),
  provider text not null default 'stripe' check (char_length(provider) between 1 and 40),
  provider_payment_intent_id text unique,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signoffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  variation_id uuid references public.variations(id) on delete cascade,
  signoff_type public.signoff_type not null,
  status public.signoff_status not null default 'pending',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  signer_id uuid not null references public.profiles(id) on delete restrict,
  typed_name text check (typed_name is null or char_length(typed_name) <= 160),
  requested_at timestamptz not null default now(),
  signed_at timestamptz,
  declined_at timestamptz
);

create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  warranty_type text not null check (char_length(warranty_type) between 1 and 120),
  provider_name text check (provider_name is null or char_length(provider_name) <= 160),
  starts_on date not null,
  ends_on date,
  terms_summary text check (terms_summary is null or char_length(terms_summary) <= 5000),
  document_id uuid references public.project_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.property_record_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  document_id uuid references public.project_documents(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  category text not null check (char_length(category) between 1 and 80),
  title text not null check (char_length(title) between 1 and 180),
  notes text check (notes is null or char_length(notes) <= 4000),
  occurred_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 80),
  title text not null check (char_length(title) between 1 and 180),
  body text check (body is null or char_length(body) <= 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_materials (
  user_id uuid not null references public.profiles(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, material_id)
);

create table if not exists public.studio_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  material_id uuid references public.materials(id) on delete set null,
  room_type text not null check (char_length(room_type) between 1 and 80),
  source_image_path text check (source_image_path is null or source_image_path !~ '(^|/)\.\.(/|$)'),
  result_image_path text check (result_image_path is null or result_image_path !~ '(^|/)\.\.(/|$)'),
  prompt text check (prompt is null or char_length(prompt) <= 4000),
  status public.studio_design_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_measurements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  source public.measurement_source not null default 'manual',
  label text not null check (char_length(label) between 1 and 160),
  data jsonb not null default '{}'::jsonb,
  is_survey_grade boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists properties_owner_idx on public.properties(owner_id);
create index if not exists quote_requests_requester_idx on public.quote_requests(requester_id, created_at desc);
create index if not exists quote_requests_assigned_idx on public.quote_requests(assigned_professional_id, created_at desc) where assigned_professional_id is not null;
create index if not exists quotes_customer_idx on public.quotes(customer_id, created_at desc);
create index if not exists quotes_issuer_idx on public.quotes(issuer_id, created_at desc);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);
create index if not exists projects_customer_idx on public.projects(customer_id, updated_at desc);
create index if not exists projects_lead_professional_idx on public.projects(lead_professional_id, updated_at desc) where lead_professional_id is not null;
create index if not exists project_members_user_idx on public.project_members(user_id, project_id);
create index if not exists project_milestones_project_idx on public.project_milestones(project_id, position);
create index if not exists appointments_project_starts_idx on public.appointments(project_id, starts_at);
create index if not exists variations_project_idx on public.variations(project_id, created_at desc);
create index if not exists project_documents_project_idx on public.project_documents(project_id, created_at desc);
create index if not exists project_conversations_conversation_idx on public.project_conversations(conversation_id);
create index if not exists payments_project_idx on public.payments(project_id, created_at desc);
create index if not exists signoffs_project_idx on public.signoffs(project_id, requested_at desc);
create index if not exists warranties_project_idx on public.warranties(project_id);
create index if not exists property_record_property_idx on public.property_record_entries(property_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists studio_designs_user_idx on public.studio_designs(user_id, created_at desc);
create index if not exists project_measurements_project_idx on public.project_measurements(project_id, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists properties_touch_updated_at on public.properties;
create trigger properties_touch_updated_at before update on public.properties for each row execute function private.touch_updated_at();
drop trigger if exists quote_requests_touch_updated_at on public.quote_requests;
create trigger quote_requests_touch_updated_at before update on public.quote_requests for each row execute function private.touch_updated_at();
drop trigger if exists quotes_touch_updated_at on public.quotes;
create trigger quotes_touch_updated_at before update on public.quotes for each row execute function private.touch_updated_at();
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects for each row execute function private.touch_updated_at();
drop trigger if exists variations_touch_updated_at on public.variations;
create trigger variations_touch_updated_at before update on public.variations for each row execute function private.touch_updated_at();
drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at before update on public.payments for each row execute function private.touch_updated_at();
drop trigger if exists studio_designs_touch_updated_at on public.studio_designs;
create trigger studio_designs_touch_updated_at before update on public.studio_designs for each row execute function private.touch_updated_at();

create or replace function private.is_active_project_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('smc_staff'::public.staff_role,'project_manager'::public.staff_role,'admin'::public.staff_role,'owner'::public.staff_role)
      and ur.revoked_at is null
  );
$$;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_project(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_active_project_staff()
     or exists (
       select 1 from public.project_members pm
       where pm.project_id = p_project_id
         and pm.user_id = (select auth.uid())
         and pm.role in ('professional'::public.project_member_role,'project_manager'::public.project_member_role)
     );
$$;

create or replace function private.can_access_property(p_property_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.properties pr
           where pr.id=p_property_id and pr.owner_id=(select auth.uid())
         )
      or private.is_active_project_staff()
      or exists (
           select 1 from public.projects p
           join public.project_members pm on pm.project_id=p.id
           where p.property_id=p_property_id and pm.user_id=(select auth.uid())
         )
      or exists (
           select 1 from public.quote_requests qr
           where qr.property_id=p_property_id and qr.assigned_professional_id=(select auth.uid())
         );
$$;

create or replace function private.can_access_quote(p_quote_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.quotes q
           where q.id=p_quote_id
             and ((select auth.uid())=q.customer_id or (select auth.uid())=q.issuer_id)
         )
      or private.is_active_project_staff()
      or exists (
           select 1 from public.projects p
           join public.project_members pm on pm.project_id=p.id
           where p.quote_id=p_quote_id and pm.user_id=(select auth.uid())
         );
$$;

create or replace function private.is_project_member_path(p_project_id_text text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id::text = p_project_id_text
      and pm.user_id=(select auth.uid())
  );
$$;

create or replace function private.can_manage_project_path(p_project_id_text text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_active_project_staff()
     or exists (
       select 1 from public.project_members pm
       where pm.project_id::text=p_project_id_text
         and pm.user_id=(select auth.uid())
         and pm.role in ('professional'::public.project_member_role,'project_manager'::public.project_member_role)
     );
$$;

revoke all on function private.is_active_project_staff() from public;
revoke all on function private.is_project_member(uuid) from public;
revoke all on function private.can_manage_project(uuid) from public;
revoke all on function private.can_access_property(uuid) from public;
revoke all on function private.can_access_quote(uuid) from public;
revoke all on function private.is_project_member_path(text) from public;
revoke all on function private.can_manage_project_path(text) from public;

alter table public.properties enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_milestones enable row level security;
alter table public.appointments enable row level security;
alter table public.variations enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_conversations enable row level security;
alter table public.payments enable row level security;
alter table public.signoffs enable row level security;
alter table public.warranties enable row level security;
alter table public.property_record_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_materials enable row level security;
alter table public.studio_designs enable row level security;
alter table public.project_measurements enable row level security;

create policy properties_read on public.properties for select to authenticated using (private.can_access_property(id));
create policy properties_insert on public.properties for insert to authenticated with check (owner_id=(select auth.uid()));
create policy properties_update on public.properties for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy properties_delete on public.properties for delete to authenticated using (owner_id=(select auth.uid()));

create policy quote_requests_read on public.quote_requests for select to authenticated using (
  requester_id=(select auth.uid()) or assigned_professional_id=(select auth.uid()) or private.is_active_project_staff()
);
create policy quote_requests_insert on public.quote_requests for insert to authenticated with check (
  requester_id=(select auth.uid()) and private.can_access_property(property_id) and status in ('draft'::public.quote_request_status,'submitted'::public.quote_request_status)
);
create policy quote_requests_customer_update on public.quote_requests for update to authenticated
using (requester_id=(select auth.uid()) and status='draft'::public.quote_request_status)
with check (requester_id=(select auth.uid()) and status in ('draft'::public.quote_request_status,'submitted'::public.quote_request_status,'cancelled'::public.quote_request_status));

create policy quotes_read on public.quotes for select to authenticated using (private.can_access_quote(id));
create policy quotes_issuer_insert on public.quotes for insert to authenticated with check (
  issuer_id=(select auth.uid())
  and status='draft'::public.quote_status
  and exists (
    select 1 from public.quote_requests qr
    where qr.id=quote_request_id and qr.requester_id=customer_id
      and (qr.assigned_professional_id is null or qr.assigned_professional_id=(select auth.uid()))
  )
);
create policy quotes_issuer_update_draft on public.quotes for update to authenticated
using (issuer_id=(select auth.uid()) and status='draft'::public.quote_status)
with check (issuer_id=(select auth.uid()) and status='draft'::public.quote_status);
create policy quotes_issuer_delete_draft on public.quotes for delete to authenticated
using (issuer_id=(select auth.uid()) and status='draft'::public.quote_status);

create policy quote_items_read on public.quote_items for select to authenticated using (private.can_access_quote(quote_id));
create policy quote_items_insert on public.quote_items for insert to authenticated with check (
  exists (select 1 from public.quotes q where q.id=quote_id and q.issuer_id=(select auth.uid()) and q.status='draft'::public.quote_status)
);
create policy quote_items_update on public.quote_items for update to authenticated
using (exists (select 1 from public.quotes q where q.id=quote_id and q.issuer_id=(select auth.uid()) and q.status='draft'::public.quote_status))
with check (exists (select 1 from public.quotes q where q.id=quote_id and q.issuer_id=(select auth.uid()) and q.status='draft'::public.quote_status));
create policy quote_items_delete on public.quote_items for delete to authenticated
using (exists (select 1 from public.quotes q where q.id=quote_id and q.issuer_id=(select auth.uid()) and q.status='draft'::public.quote_status));

create policy projects_read on public.projects for select to authenticated using (private.is_project_member(id) or private.is_active_project_staff());
create policy projects_update on public.projects for update to authenticated using (private.can_manage_project(id)) with check (private.can_manage_project(id));
create policy project_members_read on public.project_members for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy project_members_insert on public.project_members for insert to authenticated with check (private.can_manage_project(project_id));
create policy project_members_delete on public.project_members for delete to authenticated using (private.can_manage_project(project_id));

create policy milestones_read on public.project_milestones for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy milestones_insert on public.project_milestones for insert to authenticated with check (private.can_manage_project(project_id));
create policy milestones_update on public.project_milestones for update to authenticated using (private.can_manage_project(project_id)) with check (private.can_manage_project(project_id));
create policy milestones_delete on public.project_milestones for delete to authenticated using (private.can_manage_project(project_id));

create policy appointments_read on public.appointments for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy appointments_insert on public.appointments for insert to authenticated with check (created_by=(select auth.uid()) and private.is_project_member(project_id));
create policy appointments_update on public.appointments for update to authenticated using (created_by=(select auth.uid()) or private.can_manage_project(project_id)) with check (private.is_project_member(project_id) or private.is_active_project_staff());
create policy appointments_delete on public.appointments for delete to authenticated using (created_by=(select auth.uid()) or private.can_manage_project(project_id));

create policy variations_read on public.variations for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy variations_insert on public.variations for insert to authenticated with check (created_by=(select auth.uid()) and private.can_manage_project(project_id));
create policy variations_update_draft on public.variations for update to authenticated using (created_by=(select auth.uid()) and private.can_manage_project(project_id) and status='draft'::public.variation_status) with check (created_by=(select auth.uid()) and private.can_manage_project(project_id) and status='draft'::public.variation_status);
create policy variations_delete_draft on public.variations for delete to authenticated using (created_by=(select auth.uid()) and private.can_manage_project(project_id) and status='draft'::public.variation_status);

create policy project_documents_read on public.project_documents for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy project_documents_insert on public.project_documents for insert to authenticated with check (uploaded_by=(select auth.uid()) and private.is_project_member(project_id));
create policy project_documents_delete on public.project_documents for delete to authenticated using (uploaded_by=(select auth.uid()) or private.can_manage_project(project_id));

create policy project_conversations_read on public.project_conversations for select to authenticated using (private.is_project_member(project_id) and private.is_conversation_member(conversation_id));
create policy project_conversations_insert on public.project_conversations for insert to authenticated with check (linked_by=(select auth.uid()) and private.can_manage_project(project_id) and private.is_conversation_member(conversation_id));
create policy project_conversations_delete on public.project_conversations for delete to authenticated using (private.can_manage_project(project_id));

create policy payments_read on public.payments for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy signoffs_read on public.signoffs for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy signoffs_insert on public.signoffs for insert to authenticated with check (requested_by=(select auth.uid()) and private.can_manage_project(project_id));
create policy warranties_read on public.warranties for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy warranties_insert on public.warranties for insert to authenticated with check (issued_by=(select auth.uid()) and private.can_manage_project(project_id));
create policy warranties_update on public.warranties for update to authenticated using (private.can_manage_project(project_id)) with check (private.can_manage_project(project_id));
create policy warranties_delete on public.warranties for delete to authenticated using (private.can_manage_project(project_id));

create policy property_record_read on public.property_record_entries for select to authenticated using (private.can_access_property(property_id));
create policy property_record_insert on public.property_record_entries for insert to authenticated with check (
  created_by=(select auth.uid()) and private.can_access_property(property_id)
);
create policy property_record_delete on public.property_record_entries for delete to authenticated using (
  created_by=(select auth.uid()) or private.is_active_project_staff()
);

create policy notifications_read on public.notifications for select to authenticated using (user_id=(select auth.uid()));
create policy saved_materials_read on public.saved_materials for select to authenticated using (user_id=(select auth.uid()));
create policy saved_materials_insert on public.saved_materials for insert to authenticated with check (user_id=(select auth.uid()));
create policy saved_materials_delete on public.saved_materials for delete to authenticated using (user_id=(select auth.uid()));

create policy studio_designs_read on public.studio_designs for select to authenticated using (user_id=(select auth.uid()));
create policy studio_designs_insert on public.studio_designs for insert to authenticated with check (
  user_id=(select auth.uid()) and (property_id is null or private.can_access_property(property_id)) and (project_id is null or private.is_project_member(project_id))
);
create policy studio_designs_update on public.studio_designs for update to authenticated using (user_id=(select auth.uid())) with check (
  user_id=(select auth.uid()) and (property_id is null or private.can_access_property(property_id)) and (project_id is null or private.is_project_member(project_id))
);
create policy studio_designs_delete on public.studio_designs for delete to authenticated using (user_id=(select auth.uid()));

create policy measurements_read on public.project_measurements for select to authenticated using (private.is_project_member(project_id) or private.is_active_project_staff());
create policy measurements_insert on public.project_measurements for insert to authenticated with check (created_by=(select auth.uid()) and private.is_project_member(project_id));
create policy measurements_update on public.project_measurements for update to authenticated using (created_by=(select auth.uid()) or private.can_manage_project(project_id)) with check (private.is_project_member(project_id) or private.is_active_project_staff());
create policy measurements_delete on public.project_measurements for delete to authenticated using (created_by=(select auth.uid()) or private.can_manage_project(project_id));

grant select,insert,update,delete on public.properties, public.quote_requests, public.quotes, public.quote_items,
  public.projects, public.project_members, public.project_milestones, public.appointments, public.variations,
  public.project_documents, public.project_conversations, public.signoffs, public.warranties, public.property_record_entries,
  public.saved_materials, public.studio_designs, public.project_measurements to authenticated;
grant select on public.payments, public.notifications to authenticated;

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
         valid_until=coalesce(p_valid_until, current_date+interval '30 days'),
         status='sent'::public.quote_status, sent_at=now()
   where id=p_quote_id
   returning * into q;
  if q.quote_request_id is not null then
    update public.quote_requests
       set status='quoted'::public.quote_request_status
     where id=q.quote_request_id;
  end if;
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
  v_title text;
  v_property_id uuid;
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

  v_property_id := qr.property_id;
  v_title := qr.title;

  update public.quotes set status='accepted'::public.quote_status, accepted_at=now() where id=p_quote_id;
  update public.quote_requests set status='converted'::public.quote_request_status where id=qr.id;

  insert into public.projects(property_id,quote_id,customer_id,lead_professional_id,title,description,status,progress)
  values(v_property_id,p_quote_id,q.customer_id,q.issuer_id,v_title,qr.description,'planning'::public.project_status,0)
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

  return v_project_id;
end;
$$;

create or replace function public.send_variation(p_variation_id uuid)
returns public.variations
language plpgsql security definer set search_path=''
as $$
declare v public.variations;
begin
  select * into v from public.variations where id=p_variation_id for update;
  if v.id is null then raise exception 'variation_not_found'; end if;
  if not private.can_manage_project(v.project_id) then raise exception 'not_authorized'; end if;
  if v.status <> 'draft'::public.variation_status then raise exception 'variation_not_draft'; end if;
  update public.variations set status='sent'::public.variation_status,sent_at=now() where id=p_variation_id returning * into v;
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
   where id=p_variation_id returning * into v;
  return v;
end;
$$;

create or replace function public.respond_signoff(p_signoff_id uuid, p_accept boolean, p_typed_name text default null)
returns public.signoffs
language plpgsql security definer set search_path=''
as $$
declare s public.signoffs;
begin
  select * into s from public.signoffs where id=p_signoff_id for update;
  if s.id is null then raise exception 'signoff_not_found'; end if;
  if s.signer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;
  if s.status <> 'pending'::public.signoff_status then raise exception 'signoff_not_pending'; end if;
  if p_accept and (p_typed_name is null or char_length(btrim(p_typed_name)) < 1) then raise exception 'typed_name_required'; end if;
  update public.signoffs
     set status=case when p_accept then 'signed'::public.signoff_status else 'declined'::public.signoff_status end,
         typed_name=case when p_accept then btrim(p_typed_name) else null end,
         signed_at=case when p_accept then now() else null end,
         declined_at=case when p_accept then null else now() end
   where id=p_signoff_id returning * into s;
  return s;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql security invoker
set search_path=''
as $$
begin
  update public.notifications
     set read_at=coalesce(read_at,now())
   where id=p_notification_id and user_id=(select auth.uid());
end;
$$;

revoke all on function public.send_quote(uuid,date) from public, anon;
revoke all on function public.accept_quote(uuid) from public, anon;
revoke all on function public.send_variation(uuid) from public, anon;
revoke all on function public.decide_variation(uuid,boolean,text) from public, anon;
revoke all on function public.respond_signoff(uuid,boolean,text) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.send_quote(uuid,date) to authenticated;
grant execute on function public.accept_quote(uuid) to authenticated;
grant execute on function public.send_variation(uuid) to authenticated;
grant execute on function public.decide_variation(uuid,boolean,text) to authenticated;
grant execute on function public.respond_signoff(uuid,boolean,text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

drop policy if exists storage_private_project_member_read on storage.objects;
create policy storage_private_project_member_read on storage.objects
for select to authenticated using (
  bucket_id='private-project-media' and private.is_project_member_path((storage.foldername(name))[1])
);
drop policy if exists storage_private_project_member_insert on storage.objects;
create policy storage_private_project_member_insert on storage.objects
for insert to authenticated with check (
  bucket_id='private-project-media' and private.is_project_member_path((storage.foldername(name))[1])
);
drop policy if exists storage_private_project_member_update on storage.objects;
create policy storage_private_project_member_update on storage.objects
for update to authenticated using (
  bucket_id='private-project-media'
  and (owner_id=(select auth.uid())::text or private.can_manage_project_path((storage.foldername(name))[1]))
) with check (
  bucket_id='private-project-media' and private.is_project_member_path((storage.foldername(name))[1])
);
drop policy if exists storage_private_project_member_delete on storage.objects;
create policy storage_private_project_member_delete on storage.objects
for delete to authenticated using (
  bucket_id='private-project-media'
  and (owner_id=(select auth.uid())::text or private.can_manage_project_path((storage.foldername(name))[1]))
);
