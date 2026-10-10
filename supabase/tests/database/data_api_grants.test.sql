begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

-- Guard for the explicit-grant convention (docs/database-grants.md).
-- Supabase no longer auto-grants Data API privileges on new public objects,
-- so every grant must be written in the migration that creates the object.
-- None of these checks depend on the platform's default privileges.

-- 1. RLS is enabled on every public table.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      and not c.relrowsecurity),
  '{}'::text[],
  'every public table has row level security enabled'
);

-- 2. service_role (server-held secret key) has select/insert/update/delete on
--    every public table, explicitly granted.
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

-- 3. No Data API role holds TRUNCATE (bypasses RLS), REFERENCES or TRIGGER.
select is(
  (select coalesce(array_agg(c.relname || ':' || r || ':' || p order by 1), '{}')
     from pg_class c
     cross join unnest(array['anon', 'authenticated', 'service_role']) r
     cross join unnest(array['truncate', 'references', 'trigger']) p
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      and has_table_privilege(r, c.oid, p)),
  '{}'::text[],
  'no Data API role has truncate/references/trigger on a public table'
);

-- 4. No Data API role holds any privilege on a public sequence (identity
--    columns need none; UPDATE would allow setval).
select is(
  (select coalesce(array_agg(c.relname || ':' || r || ':' || p order by 1), '{}')
     from pg_class c
     cross join unnest(array['anon', 'authenticated', 'service_role']) r
     cross join unnest(array['usage', 'select', 'update']) p
    where c.relnamespace = 'public'::regnamespace
      and case when c.relkind = 'S' then has_sequence_privilege(r, c.oid, p) else false end),
  '{}'::text[],
  'no Data API role has privileges on a public sequence'
);

-- 5. anon cannot write to any public table.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      and (has_table_privilege('anon', c.oid, 'insert')
        or has_table_privilege('anon', c.oid, 'update')
        or has_table_privilege('anon', c.oid, 'delete'))),
  '{}'::text[],
  'anon has no insert/update/delete on any public table'
);

-- 6. The complete anon/authenticated matrix is exactly the intended one.
--    Format: table:role:table-level privileges:column-level-only privileges.
--    A new table, or any change to a client grant, must be added here
--    deliberately. A table missing its explicit grants fails here.
select is(
  (select coalesce(array_agg(x order by x), '{}') from (
     select c.relname || ':' || r || ':' ||
       coalesce((select string_agg(p, ',' order by p) from unnest(array['delete', 'insert', 'select', 'update']) p
                  where has_table_privilege(r, c.oid, p)), '-') || ':' ||
       coalesce((select string_agg(distinct lower(cp.privilege_type), ',' order by lower(cp.privilege_type))
                   from information_schema.column_privileges cp
                  where cp.table_schema = 'public' and cp.table_name = c.relname and cp.grantee = r
                    and not has_table_privilege(r, c.oid, lower(cp.privilege_type))), '-') as x
       from pg_class c cross join unnest(array['anon', 'authenticated']) r
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
   ) m),
  array[
    'account_deletion_requests:anon:-:-',
    'account_deletion_requests:authenticated:select:-',
    'appointments:anon:-:-',
    'appointments:authenticated:delete,insert,select,update:-',
    'blocks:anon:-:-',
    'blocks:authenticated:delete,insert,select:-',
    'comments:anon:select:-',
    'comments:authenticated:delete,select:insert',
    'connections:anon:-:-',
    'connections:authenticated:insert,select,update:-',
    'conversation_members:anon:-:-',
    'conversation_members:authenticated:select:-',
    'conversations:anon:-:-',
    'conversations:authenticated:-:select',
    'follows:anon:-:-',
    'follows:authenticated:delete,insert,select:-',
    'materials:anon:select:-',
    'materials:authenticated:select:-',
    'message_read_state:anon:-:-',
    'message_read_state:authenticated:select:-',
    'messages:anon:-:-',
    'messages:authenticated:select:insert',
    'moderation_actions:anon:-:-',
    'moderation_actions:authenticated:-:-',
    'notifications:anon:-:-',
    'notifications:authenticated:select:-',
    'payments:anon:-:-',
    'payments:authenticated:select:-',
    'post_media:anon:select:-',
    'post_media:authenticated:delete,insert,select:-',
    'posts:anon:select:-',
    'posts:authenticated:delete,select:insert,update',
    'professional_profiles:anon:select:-',
    'professional_profiles:authenticated:select:insert,update',
    'profiles:anon:select:-',
    'profiles:authenticated:select:insert,update',
    'project_conversations:anon:-:-',
    'project_conversations:authenticated:delete,insert,select:-',
    'project_documents:anon:-:-',
    'project_documents:authenticated:delete,insert,select:-',
    'project_measurements:anon:-:-',
    'project_measurements:authenticated:delete,insert,select,update:-',
    'project_members:anon:-:-',
    'project_members:authenticated:delete,insert,select:-',
    'project_milestones:anon:-:-',
    'project_milestones:authenticated:delete,insert,select,update:-',
    'projects:anon:-:-',
    'projects:authenticated:select,update:-',
    'properties:anon:-:-',
    'properties:authenticated:delete,insert,select,update:-',
    'property_record_entries:anon:-:-',
    'property_record_entries:authenticated:delete,insert,select:-',
    'quote_items:anon:-:-',
    'quote_items:authenticated:delete,insert,select,update:-',
    'quote_request_documents:anon:-:-',
    'quote_request_documents:authenticated:delete,insert,select:-',
    'quote_requests:anon:-:-',
    'quote_requests:authenticated:insert,select,update:-',
    'quotes:anon:-:-',
    'quotes:authenticated:delete,insert,select,update:-',
    'reactions:anon:select:-',
    'reactions:authenticated:delete,select:insert',
    'reports:anon:-:-',
    'reports:authenticated:select:-',
    'saved_materials:anon:-:-',
    'saved_materials:authenticated:delete,insert,select:-',
    'saved_posts:anon:-:-',
    'saved_posts:authenticated:delete,insert,select:-',
    'signoffs:anon:-:-',
    'signoffs:authenticated:insert,select:-',
    'studio_designs:anon:-:-',
    'studio_designs:authenticated:delete,insert,select,update:-',
    'user_roles:anon:-:-',
    'user_roles:authenticated:-:-',
    'variations:anon:-:-',
    'variations:authenticated:delete,insert,select,update:-',
    'warranties:anon:-:-',
    'warranties:authenticated:delete,insert,select,update:-'
  ]::text[],
  'anon/authenticated Data API privileges match the intended matrix exactly'
);

-- 7. Nothing outside the matrix: no public view or materialized view exists
--    without being reviewed (views run with their owner's privileges by default).
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')),
  '{}'::text[],
  'no public views (a new view needs security_invoker and its own review)'
);

select * from finish();
rollback;
