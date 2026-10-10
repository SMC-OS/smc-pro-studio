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
  if a.starts_at <= now() then raise exception 'appointment_response_window_closed'; end if;
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
  if a.starts_at > now() then raise exception 'appointment_not_started'; end if;

  update public.appointments
     set status='completed'::public.appointment_status
   where id=p_appointment_id
   returning * into a;

  return a;
end;
$$;
