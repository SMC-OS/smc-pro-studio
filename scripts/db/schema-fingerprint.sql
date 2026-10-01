-- Schema fingerprint for comparing a hosted project (e.g. staging) with a
-- local database built from the same migrations (Phase M2). Covers the
-- project-owned surface only: the public and private schemas, the project's
-- storage policies and buckets, and the realtime publication. One row per
-- object class with a count and an md5 over the sorted canonical definitions.
-- Run with psql locally and with the Supabase SQL tool remotely; compare rows.
with
tables as (
  select format('%s.%s rls=%s force=%s', n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity) d
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm')
),
columns as (
  select format('%s.%s.%s %s notnull=%s default=%s identity=%s', table_schema, table_name, column_name,
                data_type || coalesce('(' || udt_name || ')', ''), is_nullable = 'NO', coalesce(column_default, '-'), coalesce(is_identity, '-')) d
  from information_schema.columns where table_schema in ('public', 'private')
),
constraints as (
  select format('%s.%s %s %s', n.nspname, c.relname, k.conname, pg_get_constraintdef(k.oid)) d
  from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
),
indexes as (
  select format('%s %s', schemaname, indexdef) d from pg_indexes where schemaname in ('public', 'private')
),
policies as (
  select format('%s.%s %s %s %s roles=%s using=%s check=%s', schemaname, tablename, policyname, permissive, cmd,
                roles::text, coalesce(qual, '-'), coalesce(with_check, '-')) d
  from pg_policies
  where schemaname in ('public', 'private') or (schemaname = 'storage' and policyname like 'storage\_%')
),
functions as (
  select format('%s.%s(%s) secdef=%s volatile=%s config=%s acl=%s md5=%s', n.nspname, p.proname,
                pg_get_function_identity_arguments(p.oid), p.prosecdef, p.provolatile, coalesce(p.proconfig::text, '-'),
                coalesce((select string_agg(a::text, ',' order by a::text) from unnest(p.proacl) a), 'default'),
                md5(pg_get_functiondef(p.oid))) d
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prokind in ('f', 'p')
),
triggers as (
  select pg_get_triggerdef(t.oid) d
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname in ('public', 'private')
),
table_grants as (
  select format('%s %s.%s %s', grantee, table_schema, table_name, privilege_type) d
  from information_schema.role_table_grants
  where table_schema in ('public', 'private') and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
),
column_grants as (
  select format('%s %s.%s.%s %s', grantee, table_schema, table_name, column_name, privilege_type) d
  from information_schema.column_privileges
  where table_schema in ('public', 'private') and grantee in ('anon', 'authenticated')
    and not exists (select 1 from information_schema.role_table_grants g
                    where g.grantee = column_privileges.grantee and g.table_schema = column_privileges.table_schema
                      and g.table_name = column_privileges.table_name and g.privilege_type = column_privileges.privilege_type)
),
schema_grants as (
  select format('%s usage=%s', n.nspname, coalesce((select string_agg(a::text, ',' order by a::text) from unnest(n.nspacl) a), 'default')) d
  from pg_namespace n where n.nspname in ('public', 'private')
),
sequence_grants as (
  select format('%s.%s acl=%s', n.nspname, c.relname, coalesce((select string_agg(a::text, ',' order by a::text) from unnest(c.relacl) a), 'default')) d
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'S' and n.nspname in ('public', 'private')
),
enums as (
  select format('%s.%s %s', n.nspname, t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder)) d
  from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in ('public', 'private') group by n.nspname, t.typname
),
buckets as (
  select format('%s public=%s limit=%s mime=%s', id, public, file_size_limit, allowed_mime_types::text) d from storage.buckets
),
publication as (
  select format('%s %s.%s', pubname, schemaname, tablename) d from pg_publication_tables where pubname = 'supabase_realtime'
),
all_rows as (
  select 'tables' k, d from tables union all select 'columns', d from columns union all
  select 'constraints', d from constraints union all select 'indexes', d from indexes union all
  select 'policies', d from policies union all select 'functions', d from functions union all
  select 'triggers', d from triggers union all select 'table_grants', d from table_grants union all
  select 'column_grants', d from column_grants union all select 'schema_grants', d from schema_grants union all
  select 'sequence_grants', d from sequence_grants union all select 'enums', d from enums union all
  select 'buckets', d from buckets union all select 'publication', d from publication
)
select k as class, count(*) as n, md5(string_agg(d, E'\n' order by d)) as fingerprint
from all_rows group by k order by k;
