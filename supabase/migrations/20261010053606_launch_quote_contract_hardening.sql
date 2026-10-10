create or replace function private.validate_quote_request_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_professional_id is null then
    return new;
  end if;

  if not exists (
    select 1
      from public.profiles p
      join public.professional_profiles pp on pp.user_id = p.id
     where p.id = new.assigned_professional_id
       and p.account_type = 'professional'::public.account_type
       and p.onboarding_completed = true
  ) then
    raise exception 'assigned_professional_required';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_quote_request_assignee() from public;

drop trigger if exists quote_requests_validate_assignee on public.quote_requests;
create trigger quote_requests_validate_assignee
before insert or update of assigned_professional_id on public.quote_requests
for each row execute function private.validate_quote_request_assignee();

create unique index if not exists quotes_one_per_request_idx
  on public.quotes(quote_request_id)
  where quote_request_id is not null;

drop index if exists public.properties_owner_id_idx;
