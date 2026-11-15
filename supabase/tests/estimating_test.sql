-- Tiir · Estimating tests (Phase 1)
-- Proves: BoQ/analysis totals computed in SQL, takeoff → quantity, version
-- copy and lock, and that site roles and other companies never see prices.
-- The same figures are checked in src/lib/calc/estimating.test.ts.
--
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/estimating_test.sql

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
-- Fixtures
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'owner.a@test.dj',   '{"full_name":"Owner A","company_name":"Alpha BTP","country":"DJ"}'),
  ('b0000000-0000-0000-0000-000000000001', 'owner.b@test.et',   '{"full_name":"Owner B","company_name":"Bravo","country":"ET"}'),
  ('a0000000-0000-0000-0000-000000000003', 'est.a@test.dj',     '{"full_name":"Estimator A"}'),
  ('a0000000-0000-0000-0000-000000000004', 'foreman.a@test.dj', '{"full_name":"Foreman A"}'),
  ('a0000000-0000-0000-0000-000000000005', 'client.a@test.dj',  '{"full_name":"Client A"}'),
  ('a0000000-0000-0000-0000-000000000006', 'acc.a@test.dj',     '{"full_name":"Accountant A"}');

select tests.set('ca', (select id from public.companies where name = 'Alpha BTP'));
select tests.set('cb', (select id from public.companies where name = 'Bravo'));

insert into public.company_members (company_id, user_id, role)
select tests.v('ca'), u, r::public.app_role from (values
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'estimator'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'site_foreman'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'client_viewer'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'accountant')) v(u, r);

update public.company_settings set price_coefficient = 1.25, vat_rate = 10 where company_id = tests.v('ca');

insert into public.projects (id, company_id, code, name, currency)
values ('aaaa0000-0000-0000-0000-000000000001', tests.v('ca'), 'A-1', 'Balbala school', 'DJF'),
       ('bbbb0000-0000-0000-0000-000000000001', tests.v('cb'), 'B-1', 'Dire Dawa store', 'ETB');

insert into public.project_members (company_id, project_id, user_id)
select tests.v('ca'), 'aaaa0000-0000-0000-0000-000000000001', u from (values
  ('a0000000-0000-0000-0000-000000000003'::uuid), ('a0000000-0000-0000-0000-000000000004'::uuid),
  ('a0000000-0000-0000-0000-000000000005'::uuid), ('a0000000-0000-0000-0000-000000000006'::uuid)) v(u);

-- ---------------------------------------------------------------------------
-- Estimator builds an estimate
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000003');
set local role authenticated;

insert into public.price_resources (company_id, code, name, kind, unit, unit_cost, currency) values
  (tests.v('ca'), 'CIM', 'Ciment CPJ 42.5', 'material', 't', 25000, 'DJF'),
  (tests.v('ca'), 'SAB', 'Sable 0/5', 'material', 'm3', 4000, 'DJF'),
  (tests.v('ca'), 'MO-MAC', 'Maçon', 'labour', 'h', 500, 'DJF');

select tests.set('v1', public.create_boq_version('aaaa0000-0000-0000-0000-000000000001', 'Offre initiale'));
select tests.ok((select is_current from public.boq_versions where id = tests.v('v1')), 'first version is current');
select tests.eq((select coefficient from public.boq_versions where id = tests.v('v1')), 1.25, 'version coefficient comes from project settings');

insert into public.unit_price_analyses (version_id, code, title, unit)
values (tests.v('v1'), 'BA25', 'Béton armé dosé à 350 kg/m³', 'm3');
select tests.set('upa', (select id from public.unit_price_analyses where code = 'BA25'));

insert into public.unit_price_components (version_id, upa_id, resource_id, kind, designation, unit, quantity, unit_cost, waste_rate, position)
select tests.v('v1'), tests.v('upa'), r.id, r.kind, r.name, r.unit, x.q, r.unit_cost, x.w, x.p
from public.price_resources r
join (values ('CIM', 0.35, 0, 1), ('SAB', 0.45, 5, 2), ('MO-MAC', 6, 0, 3)) x(code, q, w, p) on x.code = r.code;

-- 0.35 × 25 000 = 8 750 ; 0.45 × 4 000 × 1.05 = 1 890 ; 6 × 500 = 3 000 → dry 13 640 ; × 1.25 = 17 050
select tests.eq((select dry_cost from public.upa_values where id = tests.v('upa')), 13640, 'analysis dry cost = sum of components incl. waste');
select tests.eq((select selling_price from public.upa_values where id = tests.v('upa')), 17050, 'selling price = dry cost × coefficient');

insert into public.boq_sections (version_id, code, title, position) values (tests.v('v1'), '1', 'Gros œuvre', 1);
select tests.set('s1', (select id from public.boq_sections where version_id = tests.v('v1')));

insert into public.boq_items (version_id, section_id, position, code, description, unit, quantity_source, upa_id)
values (tests.v('v1'), tests.v('s1'), 1, 'x', 'Béton armé pour semelles', 'm3', 'takeoff', tests.v('upa'));
insert into public.boq_items (version_id, section_id, position, code, description, unit, quantity, unit_cost)
values (tests.v('v1'), tests.v('s1'), 2, 'y', 'Enduit ciment', 'm2', 10.5, 1234);
insert into public.boq_items (version_id, section_id, position, code, description, unit, quantity, unit_price)
values (tests.v('v1'), tests.v('s1'), 3, 'z', 'Forfait installation', 'ff', 3, 999);
select tests.set('i1', (select id from public.boq_items where code = 'x'));

insert into public.takeoff_lines (version_id, item_id, position, label, count, length, width, height) values
  (tests.v('v1'), tests.v('i1'), 1, 'Semelles S1', 2, 4, 0.3, 0.5),
  (tests.v('v1'), tests.v('i1'), 2, 'Longrine', 1, 10, 0.2, 0.4),
  (tests.v('v1'), tests.v('i1'), 3, 'Réservation (à déduire)', -1, 1, 0.2, 0.4);

select tests.eq((select sum(result) from public.takeoff_lines where item_id = tests.v('i1')), 1.92, 'takeoff results (with a deduction)');
select tests.eq((select effective_quantity from public.boq_item_values where id = tests.v('i1')), 1.92, 'item quantity = sum of takeoff lines');
select tests.eq((select total_price from public.boq_item_values where id = tests.v('i1')), 32736, 'item total = quantity × unit price, rounded to whole DJF');
select tests.eq((select effective_unit_price from public.boq_item_values where code = 'y'), 1543, 'manual dry cost × coefficient, half away from zero');
select tests.eq((select total_price from public.boq_item_values where code = 'y'), 16202, 'manual item total');
select tests.eq((select total_price from public.boq_item_values where code = 'z'), 2997, 'selling price override');
select tests.eq((select total_price from public.boq_section_totals where section_id = tests.v('s1')), 51935, 'section total = sum of item totals');
select tests.eq((select total_ht from public.boq_version_totals where version_id = tests.v('v1')), 51935, 'version total HT');
select tests.eq((select total_dry_cost from public.boq_version_totals where version_id = tests.v('v1')), 39146, 'version dry cost');
select tests.eq((select vat_amount from public.boq_version_totals where version_id = tests.v('v1')), 5194, 'VAT from project settings, rounded');
select tests.eq((select total_ttc from public.boq_version_totals where version_id = tests.v('v1')), 57129, 'total TTC');

select public.renumber_boq(tests.v('v1'));
select tests.ok((select array_agg(code order by position) from public.boq_items where version_id = tests.v('v1')) = array['1.1','1.2','1.3'], 'renumber gives 1.1, 1.2, 1.3');

select public.reorder_boq_items(tests.v('s1'), array[(select id from public.boq_items where code = '1.3'), tests.v('i1'), (select id from public.boq_items where code = '1.2')]);
select tests.ok((select code from public.boq_items where version_id = tests.v('v1') and position = 1) = '1.3', 'reorder items');

-- Copy
select tests.set('v2', public.create_boq_version('aaaa0000-0000-0000-0000-000000000001', 'Variante', tests.v('v1')));
select tests.eq((select count(*) from public.boq_items where version_id = tests.v('v2')), 3, 'copy duplicates items');
select tests.eq((select count(*) from public.takeoff_lines where version_id = tests.v('v2')), 3, 'copy duplicates takeoff lines');
select tests.eq((select total_ht from public.boq_version_totals where version_id = tests.v('v2')), 51935, 'copied version has the same total');
select tests.ok(not (select is_current from public.boq_versions where id = tests.v('v2')), 'copy is not current by default');

-- Imports
select tests.ok(public.import_price_resources(tests.v('ca'),
  '[{"code":"cim","name":"Ciment CPJ 42.5 (sac)","kind":"material","unit":"t","unit_cost":26000,"currency":"DJF"},
    {"code":"GRA","name":"Gravier 5/15","kind":"material","unit":"m3","unit_cost":5500,"currency":"DJF"}]'::jsonb)
  = '{"inserted":1,"updated":1}'::jsonb, 'import upserts by code (case-insensitive)');
select tests.eq((select unit_cost from public.price_resources where code = 'CIM'), 26000, 'import updated the price');
select tests.eq((select unit_cost from public.unit_price_components where upa_id = tests.v('upa') and designation like 'Ciment%'), 25000,
  'analysis keeps its price snapshot after a library change');
select tests.eq(public.refresh_upa_prices(tests.v('upa')), 1, 'refresh picks up the new library price');

-- Deleting an analysis keeps the item priced (on the copy, v2)
update public.unit_price_analyses set deleted_at = now() where version_id = tests.v('v2') and code = 'BA25';
select tests.eq((select total_price from public.boq_item_values where version_id = tests.v('v2') and description like 'Béton%'), 32736,
  'deleting an analysis turns its dry cost into a manual cost');
select tests.ok((select upa_id is null from public.boq_items where version_id = tests.v('v2') and description like 'Béton%'), 'item unlinked from deleted analysis');

-- Lock
update public.boq_versions set status = 'submitted' where id = tests.v('v1');
select tests.throws(format('insert into public.boq_items (version_id, section_id, description, unit) values (%L, %L, ''x'', ''u'')', tests.v('v1'), tests.v('s1')),
  'cannot add items to a submitted version');
select tests.throws(format('update public.boq_items set quantity = 99 where id = (select id from public.boq_items where version_id = %L and code = ''1.2'')', tests.v('v1')),
  'cannot edit items of a submitted version');
select tests.throws(format('update public.takeoff_lines set count = 5 where item_id = %L', tests.v('i1')),
  'cannot edit takeoff of a submitted version');
select tests.throws(format('update public.boq_versions set coefficient = 2 where id = %L', tests.v('v1')),
  'cannot change the coefficient of a submitted version');
update public.boq_versions set status = 'approved' where id = tests.v('v1');
select tests.throws(format('update public.boq_versions set status = ''draft'' where id = %L', tests.v('v1')),
  'approved version cannot be reopened');
select tests.throws(format('insert into public.boq_items (version_id, section_id, description, unit) values (%L, %L, ''x'', ''u'')',
  tests.v('v2'), tests.v('s1')), 'item section must belong to the same version');
select tests.throws('delete from public.boq_items', 'hard delete is not allowed');
reset role;

-- ---------------------------------------------------------------------------
-- Accountant: reads, never writes
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000006');
set local role authenticated;
select tests.eq((select count(*) from public.boq_item_values), 6, 'accountant reads priced BoQ');
select tests.throws(format('select public.create_boq_version(%L, ''x'')', 'aaaa0000-0000-0000-0000-000000000001'), 'accountant cannot create versions');
reset role;

-- ---------------------------------------------------------------------------
-- Site foreman: quantities yes, money never
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000004');
set local role authenticated;
select tests.eq((select count(*) from public.price_resources), 0, 'foreman cannot read the price library');
select tests.eq((select count(*) from public.boq_items), 0, 'foreman cannot read priced BoQ items');
select tests.eq((select count(*) from public.boq_item_values), 0, 'foreman cannot read BoQ values');
select tests.eq((select count(*) from public.boq_version_totals), 0, 'foreman cannot read BoQ totals');
select tests.eq((select count(*) from public.unit_price_analyses), 0, 'foreman cannot read unit price analyses');
select tests.eq((select count(*) from public.upa_component_values), 0, 'foreman cannot read analysis components');
select tests.eq((select count(*) from public.boq_versions), 0, 'foreman cannot read version coefficients');
select tests.eq((select count(*) from public.boq_items_site), 6, 'foreman reads the BoQ without prices');
select tests.eq((select quantity from public.boq_items_site where id = tests.v('i1')), 1.92, 'site view carries takeoff quantities');
select tests.eq((select count(*) from public.boq_versions_site), 2, 'foreman sees versions without coefficients');
select tests.throws(format('select public.import_price_resources(%L, ''[]''::jsonb)', tests.v('ca')), 'foreman cannot import prices');
reset role;

select tests.eq((select count(*) from information_schema.columns
  where table_schema = 'public' and table_name in ('boq_items_site', 'boq_sections_site', 'boq_versions_site')
    and (column_name ~ '(price|cost|coefficient|total|amount)')), 0, 'site views have no money columns');

-- ---------------------------------------------------------------------------
-- Client viewer and other company
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000005');
set local role authenticated;
select tests.eq((select count(*) from public.boq_items_site), 0, 'client viewer does not see the estimate');
select tests.eq((select count(*) from public.boq_item_values), 0, 'client viewer does not see prices');
reset role;

select tests.login('b0000000-0000-0000-0000-000000000001');
set local role authenticated;
select tests.eq((select count(*) from public.price_resources where company_id = tests.v('ca')), 0, 'company B cannot read company A prices');
select tests.eq((select count(*) from public.boq_item_values), 0, 'company B cannot read company A BoQ');
select tests.eq((select count(*) from public.boq_items_site), 0, 'company B cannot read company A site BoQ');
select tests.throws(format('select public.create_boq_version(%L, ''x'')', 'aaaa0000-0000-0000-0000-000000000001'),
  'company B cannot create a version in company A');
select tests.throws(format('insert into public.boq_sections (version_id, title) values (%L, ''hack'')', tests.v('v2')),
  'company B cannot write into company A BoQ');
select tests.eq((select count(*) from public.boq_sections where title = 'hack'), 0, 'no row leaked');
reset role;

\o
select format('Estimating tests passed: %s assertions', count(*)) from tests.results;
rollback;
