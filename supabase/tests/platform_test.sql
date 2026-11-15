-- Tiir · Platform tests (Phase 10)
-- Structural rules checked on every table (RLS, standard columns, indexes,
-- uuid keys, soft delete, money/quantity types, invoker views) and a
-- 5 000-item bill of quantities performance check.
--
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/platform_test.sql

\set QUIET on
\pset tuples_only on
\o /dev/null
begin;

create schema tests;
grant usage on schema tests to authenticated, anon;
create table tests.results (n serial, name text);
grant insert, select on tests.results to authenticated, anon;
grant usage on sequence tests.results_n_seq to authenticated, anon;
create table tests.vars (k text primary key, v uuid);
grant select, insert, update on tests.vars to authenticated;

create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function tests.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'FAILED: %', p_name; end if;
  insert into tests.results (name) values (p_name);
end $$;
create function tests.eq(p_actual numeric, p_expected numeric, p_name text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAILED: % (expected %, got %)', p_name, p_expected, p_actual; end if;
  insert into tests.results (name) values (p_name);
end $$;
create function tests.throws(p_sql text, p_name text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then insert into tests.results (name) values (p_name); return; end;
  raise exception 'FAILED (no error raised): %', p_name;
end $$;
create function tests.v(p_k text) returns uuid language sql stable as $$ select v from tests.vars where k = p_k $$;
create function tests.set(p_k text, p_v uuid) returns void language sql as $$
  insert into tests.vars values (p_k, p_v) on conflict (k) do update set v = excluded.v;
$$;
grant execute on all functions in schema tests to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Structure: every public table follows the data rules
-- ---------------------------------------------------------------------------
create temp table t_info as
select c.oid, c.relname::text as name, c.relrowsecurity as rls,
  exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'company_id' and not a.attisdropped) as has_company,
  exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'project_id' and not a.attisdropped) as has_project,
  (select count(*) from unnest(array['created_at', 'updated_at', 'created_by']) x
    where exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = x and not a.attisdropped)) as std_cols,
  exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'deleted_at' and not a.attisdropped) as soft_delete,
  exists (select 1 from pg_index i where i.indrelid = c.oid and (select attname from pg_attribute where attrelid = c.oid and attnum = i.indkey[0]) = 'company_id') as company_idx,
  exists (select 1 from pg_index i where i.indrelid = c.oid and (select attname from pg_attribute where attrelid = c.oid and attnum = i.indkey[0]) = 'project_id') as project_idx,
  (select format_type(a.atttypid, a.atttypmod) from pg_constraint k join pg_attribute a on a.attrelid = c.oid and a.attnum = k.conkey[1]
    where k.conrelid = c.oid and k.contype = 'p' and array_length(k.conkey, 1) = 1) as pk_type,
  has_table_privilege('authenticated', c.oid, 'DELETE') as can_delete,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

select tests.ok((select count(*) from t_info) >= 60, 'schema has the expected tables');
select tests.ok(not exists (select 1 from t_info where not rls), 'row level security is on for every table: ' ||
  coalesce((select string_agg(name, ', ') from t_info where not rls), 'all'));
select tests.ok(not exists (select 1 from t_info where std_cols < 3), 'every table has created_at, updated_at, created_by: ' ||
  coalesce((select string_agg(name, ', ') from t_info where std_cols < 3), 'all'));
select tests.ok(not exists (select 1 from t_info where not soft_delete), 'every table has deleted_at (soft delete)');
select tests.ok(not exists (select 1 from t_info where has_company and not company_idx), 'company_id is indexed everywhere');
select tests.ok(not exists (select 1 from t_info where has_project and not project_idx), 'project_id is indexed everywhere');
select tests.ok(not exists (select 1 from t_info where pk_type is distinct from 'uuid'), 'every primary key is a uuid: ' ||
  coalesce((select string_agg(name || '=' || coalesce(pk_type, '?'), ', ') from t_info where pk_type is distinct from 'uuid'), 'all'));
select tests.ok(not exists (select 1 from t_info where can_delete), 'no hard delete for signed-in users');
select tests.ok(not exists (select 1 from t_info where anon_select), 'anonymous users read nothing');
-- Money is numeric(18,2), quantities numeric(18,3).
select tests.ok(not exists (
  select 1 from pg_attribute a join t_info t on t.oid = a.attrelid
  where not a.attisdropped and a.atttypid = 'numeric'::regtype
    and a.attname ~ '(amount|price|cost|total|rate$|_pay$|bonus|deduction)' and a.attname !~ '(_rate|coefficient|multiplier|percent)$'
    and a.attname not in ('hourly_rate', 'daily_rate')
    and format_type(a.atttypid, a.atttypmod) <> 'numeric(18,2)'), 'money columns are numeric(18,2)');
select tests.ok(not exists (
  select 1 from pg_attribute a join t_info t on t.oid = a.attrelid
  where not a.attisdropped and a.atttypid = 'numeric'::regtype and a.attname ~ 'quantity'
    and t.name <> 'unit_price_components' -- consumption per unit of work keeps 4 decimals (DECISIONS.md)
    and format_type(a.atttypid, a.atttypmod) <> 'numeric(18,3)'), 'quantity columns are numeric(18,3)');
select tests.ok(not exists (
  select 1 from pg_attribute a join t_info t on t.oid = a.attrelid
  where not a.attisdropped and a.attname in ('hourly_rate', 'daily_rate') and format_type(a.atttypid, a.atttypmod) <> 'numeric(18,2)'),
  'pay rates are numeric(18,2)');
-- Views that carry money run with the caller's rights.
select tests.ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname ~ '(price|amount|cost|total|_pay$|net_payable)' and a.attname !~ 'hours')
    and not coalesce('security_invoker=true' = any (c.reloptions), false)
    and c.relname not in ('progress_claim_lines_client')), 'money views are security_invoker (except the client claim view, which filters by role)');
select tests.ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')),
  'security definer functions pin search_path');

-- ---------------------------------------------------------------------------
-- Performance: a 5 000-item bill of quantities
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'owner.a@test.dj', '{"full_name":"Owner A","company_name":"Alpha BTP","country":"DJ"}');
select tests.set('ca', (select id from public.companies where name = 'Alpha BTP'));
insert into public.projects (id, company_id, code, name, currency) values ('aaaa0000-0000-0000-0000-000000000001', tests.v('ca'), 'A-1', 'Big job', 'DJF');
select tests.login('a0000000-0000-0000-0000-000000000001');
set local role authenticated;
select tests.set('v', public.create_boq_version('aaaa0000-0000-0000-0000-000000000001', 'Big'));
insert into public.boq_sections (version_id, code, title, position)
select tests.v('v'), s::text, 'Section ' || s, s from generate_series(1, 50) s;
insert into public.boq_items (version_id, section_id, position, code, description, unit, quantity, unit_cost)
select tests.v('v'), sec.id, i, sec.code || '.' || i, 'Article ' || sec.code || '.' || i, 'm3', i * 1.5, 1000 + i
from public.boq_sections sec, generate_series(1, 100) i
where sec.version_id = tests.v('v');
select tests.eq((select count(*) from public.boq_items where version_id = tests.v('v')), 5000, '5 000 items created');
reset role;
analyze public.boq_items, public.boq_sections, public.boq_versions, public.projects; -- as autovacuum would
select tests.login('a0000000-0000-0000-0000-000000000001');
set local role authenticated;

create temp table timing (label text, ms numeric);
grant insert, select on timing to authenticated;
do $$
declare t0 timestamptz; n numeric;
begin
  t0 := clock_timestamp();
  select total_ht into n from public.boq_version_totals where version_id = tests.v('v');
  insert into timing values ('totals', extract(epoch from clock_timestamp() - t0) * 1000);
  t0 := clock_timestamp();
  perform * from public.boq_item_values where version_id = tests.v('v') order by position limit 100 offset 4900;
  insert into timing values ('page', extract(epoch from clock_timestamp() - t0) * 1000);
  t0 := clock_timestamp();
  perform * from public.boq_section_totals where version_id = tests.v('v');
  insert into timing values ('sections', extract(epoch from clock_timestamp() - t0) * 1000);
end $$;
select tests.ok((select ms from timing where label = 'totals') < 1500, 'version totals over 5 000 items in under 1.5 s');
select tests.ok((select ms from timing where label = 'page') < 1500, 'last page of 5 000 items in under 1.5 s');
select tests.ok((select ms from timing where label = 'sections') < 1500, 'section totals over 5 000 items in under 1.5 s');
reset role;

\o
select format('Platform tests passed: %s assertions', count(*)) from tests.results;
select format('  %s: %s ms', label, round(ms)) from timing order by label;
rollback;
