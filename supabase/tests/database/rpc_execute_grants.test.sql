begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

-- Platform-independent proof for 20261001015000_revoke_anon_execute_on_signed_in_rpcs.sql:
-- on a default Supabase project anon receives EXECUTE on new public functions
-- through ALTER DEFAULT PRIVILEGES, so "revoke ... from public" alone is not enough.

-- 1. The only public-schema function anon may execute is the approved guest
--    discovery RPC. Any new RPC that anon can call must be added here deliberately.
select is(
  (select array_agg(p.proname::text collate "C" order by p.proname::text collate "C")
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')),
  array['search_public_professionals']::text[],
  'search_public_professionals is the only public function anon can execute'
);

-- 2. No SECURITY DEFINER function in public is executable by anon (lint 0028).
select is(
  (select count(*)::int
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'no SECURITY DEFINER function in public is executable by anon'
);

-- 3. Guest discovery still works for anon.
select ok(
  has_function_privilege('anon',
    'public.search_public_professionals(text, public.professional_category, text, text, uuid, integer)',
    'execute'),
  'anon can still execute search_public_professionals'
);

select * from finish();
rollback;
