alter table public.quotes
  add column if not exists rejection_reason text
  check (rejection_reason is null or char_length(rejection_reason) <= 2000);

create or replace function public.mark_quote_viewed(p_quote_id uuid)
returns public.quotes
language plpgsql
security definer
set search_path=''
as $$
declare
  q public.quotes;
begin
  select * into q from public.quotes where id=p_quote_id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.customer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;

  if q.status='sent'::public.quote_status then
    update public.quotes
       set status='viewed'::public.quote_status,
           viewed_at=coalesce(viewed_at,now())
     where id=p_quote_id
     returning * into q;
  end if;

  return q;
end;
$$;

create or replace function public.reject_quote(p_quote_id uuid, p_reason text default null)
returns public.quotes
language plpgsql
security definer
set search_path=''
as $$
declare
  q public.quotes;
  v_reason text;
begin
  select * into q from public.quotes where id=p_quote_id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.customer_id <> (select auth.uid()) then raise exception 'not_authorized'; end if;
  if q.status not in ('sent'::public.quote_status,'viewed'::public.quote_status) then
    raise exception 'quote_not_rejectable';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason,'')),'');
  if v_reason is not null and char_length(v_reason) > 2000 then
    raise exception 'rejection_reason_too_long';
  end if;

  update public.quotes
     set status='rejected'::public.quote_status,
         rejected_at=now(),
         rejection_reason=v_reason
   where id=p_quote_id
   returning * into q;

  insert into public.notifications(user_id,quote_id,kind,title,body)
  values(
    q.issuer_id,
    q.id,
    'quote_rejected',
    'Quote declined',
    case
      when v_reason is null then 'The customer declined the quote.'
      else 'The customer declined the quote and left feedback.'
    end
  );

  return q;
end;
$$;

revoke all on function public.mark_quote_viewed(uuid) from public, anon;
revoke all on function public.reject_quote(uuid,text) from public, anon;
grant execute on function public.mark_quote_viewed(uuid) to authenticated;
grant execute on function public.reject_quote(uuid,text) to authenticated;
