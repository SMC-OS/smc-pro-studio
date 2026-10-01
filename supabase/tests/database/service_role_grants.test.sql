begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

-- Guard for 20261001070000_explicit_service_role_grants.sql. Supabase no longer
-- auto-grants Data API privileges on new public tables, so every public table
-- and sequence must grant service_role explicitly in its own migration.
-- These checks do not depend on the platform's default privileges.

-- 1. Every public table grants service_role select, insert, update and delete.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p', 'v', 'm')
      and not (has_table_privilege('service_role', c.oid, 'select')
           and has_table_privilege('service_role', c.oid, 'insert')
           and has_table_privilege('service_role', c.oid, 'update')
           and has_table_privilege('service_role', c.oid, 'delete'))),
  '{}'::text[],
  'every public table grants service_role select/insert/update/delete explicitly'
);

-- 2. Every public sequence grants service_role usage.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and case when c.relkind = 'S' then not has_sequence_privilege('service_role', c.oid, 'usage') else false end),
  '{}'::text[],
  'every public sequence grants service_role usage explicitly'
);

-- 3. The grant did not widen guest access: anon still cannot write any public table.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p')
      and (has_table_privilege('anon', c.oid, 'insert')
        or has_table_privilege('anon', c.oid, 'update')
        or has_table_privilege('anon', c.oid, 'delete'))),
  '{}'::text[],
  'anon has no insert/update/delete on any public table'
);

select * from finish();
rollback;
