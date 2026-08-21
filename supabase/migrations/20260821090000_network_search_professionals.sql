-- Slice E: Network discovery search/filter.
-- Additive only — no existing migration, table, or RLS policy is modified.
-- Public follower/following counts, multi-select filters, sort, verification_status/services[]
-- filters, and the secondary Network tabs remain deliberately out of scope (see tasks/todo.md).

create extension if not exists pg_trgm with schema extensions;

-- Substring search indexes. display_name lives on public.profiles (not
-- professional_profiles), so it gets its own trigram index on that table.
create index profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);

create index professional_profiles_company_name_trgm_idx
  on public.professional_profiles using gin (company_name gin_trgm_ops);

create index professional_profiles_service_area_trgm_idx
  on public.professional_profiles using gin (service_area gin_trgm_ops);

-- Exact-match category filter.
create index professional_profiles_category_idx
  on public.professional_profiles (category);

-- Case-insensitive deterministic ordering + keyset pagination tie-breaker.
-- Trigram GIN indexes above accelerate the ILIKE predicates; this expression
-- btree is what accelerates ORDER BY lower(display_name), id and the keyset
-- comparison against the same tuple.
create index profiles_lower_display_name_id_idx
  on public.profiles (lower(display_name), id);

-- search_public_professionals: the only server-side way to OR-match a query
-- across profiles.display_name (a different table) and
-- professional_profiles.company_name/service_area with stable pagination —
-- PostgREST cannot express a single OR spanning a base resource and an
-- embedded resource, so this exists as a SECURITY INVOKER function rather
-- than a client-side filter (see the Slice E design notes for the full
-- PostgREST-limitation reasoning).
--
-- SECURITY INVOKER: runs as the calling role (anon/authenticated), so
-- profiles_public_read / professional_profiles_public_read RLS still apply
-- exactly as they do for any other query against these tables. The
-- account_type/visibility predicates below are redundant with that RLS by
-- design (defense in depth / self-documenting intent), NOT a substitute for
-- it. onboarding_completed = true is enforced only here, inside this
-- function — general RLS on profiles/professional_profiles is unchanged.
create or replace function public.search_public_professionals(
  q text default null,
  category_filter public.professional_category default null,
  service_area_filter text default null,
  after_display_name text default null,
  after_user_id uuid default null,
  page_size integer default 20
)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_path text,
  account_type public.account_type,
  category public.professional_category,
  company_name text,
  service_area text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_q text;
  v_service_area text;
  v_limit integer;
begin
  -- Cursor validation: both null = first page, both non-null = a subsequent
  -- page. A partially supplied cursor is a caller bug and must fail loudly,
  -- not silently collapse to "no results" or "first page".
  if (after_display_name is null) <> (after_user_id is null) then
    raise exception
      'search_public_professionals: after_display_name and after_user_id must both be null (first page) or both be provided (subsequent page)';
  end if;

  -- Bounded page size: clamp to [1, 50] regardless of what the caller sends,
  -- including an explicit null.
  v_limit := least(greatest(coalesce(page_size, 20), 1), 50);

  -- Trim, cap length (200 — the widest of the three searched columns'
  -- own check-constraint limits: service_area <= 200, company_name <= 160,
  -- display_name <= 100), and escape ILIKE wildcard metacharacters so user
  -- input is always treated as literal substring text, never pattern syntax.
  v_q := nullif(trim(left(trim(coalesce(q, '')), 200)), '');
  if v_q is not null then
    v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  v_service_area := nullif(trim(left(trim(coalesce(service_area_filter, '')), 200)), '');
  if v_service_area is not null then
    v_service_area := replace(replace(replace(v_service_area, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  -- Overfetch by one row so the caller can detect "is there a next page"
  -- without a separate count query. The client (socialClient.ts) trims this
  -- back down to v_limit items and derives hasMore/nextCursor from whether
  -- the extra row came back.
  return query
  select
    pp.user_id,
    p.display_name,
    p.username,
    p.avatar_path,
    p.account_type,
    pp.category,
    pp.company_name,
    pp.service_area
  from public.professional_profiles pp
  join public.profiles p on p.id = pp.user_id
  where p.account_type = 'professional'
    and p.visibility = 'public'
    and p.onboarding_completed = true
    and (category_filter is null or pp.category = category_filter)
    and (v_service_area is null or pp.service_area ilike '%' || v_service_area || '%' escape '\')
    and (
      v_q is null
      or p.display_name ilike '%' || v_q || '%' escape '\'
      or pp.company_name ilike '%' || v_q || '%' escape '\'
      or pp.service_area ilike '%' || v_q || '%' escape '\'
    )
    and (
      after_display_name is null
      or (lower(p.display_name), pp.user_id) > (lower(after_display_name), after_user_id)
    )
  order by lower(p.display_name) asc, pp.user_id asc
  limit v_limit + 1;
end;
$$;

revoke all on function public.search_public_professionals(
  text, public.professional_category, text, text, uuid, integer
) from public;

grant execute on function public.search_public_professionals(
  text, public.professional_category, text, text, uuid, integer
) to anon, authenticated;
