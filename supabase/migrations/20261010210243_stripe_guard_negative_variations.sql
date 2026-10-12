create or replace function public.decide_variation(
  p_variation_id uuid,
  p_accept boolean,
  p_note text default null
)
returns public.variations
language plpgsql
security definer
set search_path=''
as $$
declare
  v public.variations;
  p public.projects;
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
  v_new_approved numeric(14,2);
  v_committed numeric(14,2);
begin
  select * into v from public.variations where id=p_variation_id for update;
  if v.id is null then raise exception 'variation_not_found'; end if;

  select * into p from public.projects where id=v.project_id for update;
  if p.customer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;
  if v.status <> 'sent'::public.variation_status then raise exception 'variation_not_awaiting_decision'; end if;
  if v_note is not null and char_length(v_note)>2000 then raise exception 'customer_note_too_long'; end if;

  if p_accept and v.amount_delta<0 then
    v_new_approved := round(private.approved_project_value(p.id)+v.amount_delta,2);
    v_committed := private.committed_project_payment_value(p.id);
    if v_new_approved<v_committed then
      raise exception 'variation_conflicts_with_committed_payments';
    end if;
  end if;

  update public.variations
     set status=case when p_accept then 'accepted'::public.variation_status else 'rejected'::public.variation_status end,
         decided_at=now(),
         customer_note=v_note
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

revoke all on function public.decide_variation(uuid,boolean,text) from public, anon;
grant execute on function public.decide_variation(uuid,boolean,text) to authenticated;
