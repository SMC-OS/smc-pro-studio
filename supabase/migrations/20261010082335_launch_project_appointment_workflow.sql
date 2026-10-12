alter table public.appointments
  add column if not exists customer_note text
    check (customer_note is null or char_length(customer_note) <= 2000),
  add column if not exists confirmed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;

revoke insert, update, delete on public.appointments from authenticated;
grant select on public.appointments to authenticated;

create or replace function public.schedule_project_appointment(
  p_project_id uuid,
  p_appointment_type public.appointment_type,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text default null,
  p_notes text default null
)
returns public.appointments
language plpgsql
security definer
set search_path=''
as $$
declare
  a public.appointments;
  p public.projects;
  v_location text := nullif(btrim(coalesce(p_location,'')),'');
  v_notes text := nullif(btrim(coalesce(p_notes,'')),'');
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if not private.can_manage_project(p_project_id) then raise exception 'not_authorized'; end if;
  if p_ends_at <= p_starts_at then raise exception 'invalid_time_range'; end if;
  if p_starts_at <= now() then raise exception 'appointment_must_be_future'; end if;
  if v_location is not null and char_length(v_location) > 500 then raise exception 'location_too_long'; end if;
  if v_notes is not null and char_length(v_notes) > 3000 then raise exception 'notes_too_long'; end if;

  select * into p from public.projects where id=p_project_id;
  if p.id is null then raise exception 'project_not_found'; end if;

  insert into public.appointments(
    project_id, created_by, appointment_type, status,
    starts_at, ends_at, location, notes
  )
  values(
    p_project_id, (select auth.uid()), p_appointment_type, 'proposed'::public.appointment_status,
    p_starts_at, p_ends_at, v_location, v_notes
  )
  returning * into a;

  insert into public.notifications(user_id,project_id,kind,title,body)
  values(
    p.customer_id,
    p.id,
    'appointment_proposed',
    'Appointment proposed',
    'A project appointment needs your confirmation.'
  );

  return a;
end;
$$;

create or replace function public.respond_project_appointment(
  p_appointment_id uuid,
  p_confirm boolean,
  p_note text default null
)
returns public.appointments
language plpgsql
security definer
set search_path=''
as $$
declare
  a public.appointments;
  p public.projects;
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
begin
  select * into a from public.appointments where id=p_appointment_id for update;
  if a.id is null then raise exception 'appointment_not_found'; end if;

  select * into p from public.projects where id=a.project_id;
  if p.customer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;
  if a.status <> 'proposed'::public.appointment_status then raise exception 'appointment_not_awaiting_response'; end if;
  if v_note is not null and char_length(v_note) > 2000 then raise exception 'customer_note_too_long'; end if;

  update public.appointments
     set status=case
       when p_confirm then 'confirmed'::public.appointment_status
       else 'cancelled'::public.appointment_status
     end,
     customer_note=v_note,
     confirmed_at=case when p_confirm then now() else null end,
     cancelled_at=case when p_confirm then null else now() end
   where id=p_appointment_id
   returning * into a;

  if p.lead_professional_id is not null then
    insert into public.notifications(user_id,project_id,kind,title,body)
    values(
      p.lead_professional_id,
      p.id,
      'appointment_response',
      case when p_confirm then 'Appointment confirmed' else 'Appointment declined' end,
      case when p_confirm then 'The customer confirmed the appointment.' else 'The customer declined the proposed appointment.' end
    );
  end if;

  return a;
end;
$$;

create or replace function public.complete_project_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path=''
as $$
declare
  a public.appointments;
begin
  select * into a from public.appointments where id=p_appointment_id for update;
  if a.id is null then raise exception 'appointment_not_found'; end if;
  if not private.can_manage_project(a.project_id) then raise exception 'not_authorized'; end if;
  if a.status <> 'confirmed'::public.appointment_status then raise exception 'appointment_not_confirmed'; end if;

  update public.appointments
     set status='completed'::public.appointment_status
   where id=p_appointment_id
   returning * into a;

  return a;
end;
$$;

create or replace function public.cancel_project_appointment(
  p_appointment_id uuid,
  p_note text default null
)
returns public.appointments
language plpgsql
security definer
set search_path=''
as $$
declare
  a public.appointments;
  p public.projects;
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
begin
  select * into a from public.appointments where id=p_appointment_id for update;
  if a.id is null then raise exception 'appointment_not_found'; end if;
  if not private.can_manage_project(a.project_id) then raise exception 'not_authorized'; end if;
  if a.status in ('completed'::public.appointment_status,'cancelled'::public.appointment_status) then
    raise exception 'appointment_not_cancellable';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then raise exception 'customer_note_too_long'; end if;

  update public.appointments
     set status='cancelled'::public.appointment_status,
         customer_note=coalesce(v_note,customer_note),
         cancelled_at=now()
   where id=p_appointment_id
   returning * into a;

  select * into p from public.projects where id=a.project_id;
  insert into public.notifications(user_id,project_id,kind,title,body)
  values(
    p.customer_id,
    p.id,
    'appointment_cancelled',
    'Appointment cancelled',
    'A project appointment was cancelled by the professional.'
  );

  return a;
end;
$$;

revoke all on function public.schedule_project_appointment(uuid,public.appointment_type,timestamptz,timestamptz,text,text) from public, anon;
revoke all on function public.respond_project_appointment(uuid,boolean,text) from public, anon;
revoke all on function public.complete_project_appointment(uuid) from public, anon;
revoke all on function public.cancel_project_appointment(uuid,text) from public, anon;

grant execute on function public.schedule_project_appointment(uuid,public.appointment_type,timestamptz,timestamptz,text,text) to authenticated;
grant execute on function public.respond_project_appointment(uuid,boolean,text) to authenticated;
grant execute on function public.complete_project_appointment(uuid) to authenticated;
grant execute on function public.cancel_project_appointment(uuid,text) to authenticated;
