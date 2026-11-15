-- Tiir · Module tests (Phases 2–9)
-- Proves the business rules in SQL: planning loops, one report a day, last
-- write wins, claims from progress with retention/advance caps and client
-- approval, procurement numbering and receipts into stock, payroll and its
-- lock, equipment costs, documents versions and what clients may download.
-- The same formulas are unit tested in src/lib/calc/*.test.ts.
--
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/modules_test.sql

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
-- Fixtures: company A (DJF) with every role, company B (ETB)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'owner.a@test.dj',   '{"full_name":"Owner A","company_name":"Alpha BTP","country":"DJ"}'),
  ('b0000000-0000-0000-0000-000000000001', 'owner.b@test.et',   '{"full_name":"Owner B","company_name":"Bravo","country":"ET"}'),
  ('a0000000-0000-0000-0000-000000000002', 'pm.a@test.dj',      '{"full_name":"PM A"}'),
  ('a0000000-0000-0000-0000-000000000003', 'est.a@test.dj',     '{"full_name":"Estimator A"}'),
  ('a0000000-0000-0000-0000-000000000004', 'foreman.a@test.dj', '{"full_name":"Foreman A"}'),
  ('a0000000-0000-0000-0000-000000000005', 'client.a@test.dj',  '{"full_name":"Client A"}'),
  ('a0000000-0000-0000-0000-000000000006', 'acc.a@test.dj',     '{"full_name":"Accountant A"}'),
  ('a0000000-0000-0000-0000-000000000007', 'store.a@test.dj',   '{"full_name":"Store A"}');

select tests.set('ca', (select id from public.companies where name = 'Alpha BTP'));
select tests.set('cb', (select id from public.companies where name = 'Bravo'));
select tests.set('p',  'aaaa0000-0000-0000-0000-000000000001');
select tests.set('pb', 'bbbb0000-0000-0000-0000-000000000001');
select tests.set('owner',   'a0000000-0000-0000-0000-000000000001');
select tests.set('pm',      'a0000000-0000-0000-0000-000000000002');
select tests.set('est',     'a0000000-0000-0000-0000-000000000003');
select tests.set('foreman', 'a0000000-0000-0000-0000-000000000004');
select tests.set('client',  'a0000000-0000-0000-0000-000000000005');
select tests.set('acc',     'a0000000-0000-0000-0000-000000000006');
select tests.set('store',   'a0000000-0000-0000-0000-000000000007');
select tests.set('ownerb',  'b0000000-0000-0000-0000-000000000001');

insert into public.company_members (company_id, user_id, role)
select tests.v('ca'), u, r::public.app_role from (values
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'project_manager'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'estimator'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'site_foreman'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'client_viewer'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'accountant'),
  ('a0000000-0000-0000-0000-000000000007'::uuid, 'storekeeper')) v(u, r);

update public.company_settings set working_hours_per_day = 8, overtime_multiplier = 1.5, fuel_unit_cost = 200 where company_id = tests.v('ca');

insert into public.projects (id, company_id, code, name, currency, start_date)
values (tests.v('p'), tests.v('ca'), 'A-1', 'Balbala school', 'DJF', '2026-01-04'),
       (tests.v('pb'), tests.v('cb'), 'B-1', 'Dire Dawa store', 'ETB', '2026-01-05');
insert into public.project_members (company_id, project_id, user_id)
select tests.v('ca'), tests.v('p'), u from (values
  ('a0000000-0000-0000-0000-000000000002'::uuid), ('a0000000-0000-0000-0000-000000000003'::uuid), ('a0000000-0000-0000-0000-000000000004'::uuid),
  ('a0000000-0000-0000-0000-000000000005'::uuid), ('a0000000-0000-0000-0000-000000000006'::uuid), ('a0000000-0000-0000-0000-000000000007'::uuid)) v(u);

update public.project_settings set retention_rate = 5, retention_cap_rate = 4, advance_amount = 15000, advance_recovery_rate = 20, vat_rate = 10, price_coefficient = 1
 where project_id = tests.v('p');

-- Estimate: two items, 100 m³ at 1 000 and 50 m² at 1 000 → contract 150 000, retention cap 4 % = 6 000
select tests.login(tests.v('est'));
set local role authenticated;
select tests.set('v1', public.create_boq_version(tests.v('p'), 'Marché'));
insert into public.boq_sections (version_id, code, title, position) values (tests.v('v1'), '1', 'Gros œuvre', 1);
insert into public.boq_items (version_id, section_id, position, code, description, unit, quantity, unit_cost, unit_price)
select tests.v('v1'), s.id, x.p, x.c, x.d, x.u::public.unit_code, x.q, 800, 1000
from public.boq_sections s, (values (1, '1.1', 'Béton', 'm3', 100), (2, '1.2', 'Enduit', 'm2', 50)) x(p, c, d, u, q)
where s.version_id = tests.v('v1');
select tests.set('i1', (select id from public.boq_items where code = '1.1'));
select tests.set('i2', (select id from public.boq_items where code = '1.2'));
reset role;

-- ---------------------------------------------------------------------------
-- Planning
-- ---------------------------------------------------------------------------
select tests.login(tests.v('pm'));
set local role authenticated;
insert into public.tasks (id, company_id, project_id, name, start_date, end_date, duration) values
  ('11110000-0000-0000-0000-000000000001', tests.v('ca'), tests.v('p'), 'Fondations', '2026-01-04', '2026-01-08', 5),
  ('11110000-0000-0000-0000-000000000002', tests.v('ca'), tests.v('p'), 'Élévation',  '2026-01-10', '2026-01-14', 5);
insert into public.task_dependencies (company_id, project_id, predecessor_id, successor_id, type)
values (tests.v('ca'), tests.v('p'), '11110000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000002', 'FS');
select tests.throws(format('insert into public.task_dependencies (company_id, project_id, predecessor_id, successor_id) values (%L, %L, %L, %L)',
  tests.v('ca'), tests.v('p'), '11110000-0000-0000-0000-000000000002', '11110000-0000-0000-0000-000000000001'), 'a dependency loop is refused');
select tests.ok(public.create_baseline(tests.v('p'), 'Initial') is not null, 'baseline saved');
select tests.eq((select count(*) from public.baseline_tasks), 2, 'baseline copies every task');
insert into public.task_boq_links (company_id, project_id, task_id, boq_item_id)
values (tests.v('ca'), tests.v('p'), '11110000-0000-0000-0000-000000000001', tests.v('i1'));
reset role;

-- ---------------------------------------------------------------------------
-- Site: daily report, progress, last write wins
-- ---------------------------------------------------------------------------
select tests.login(tests.v('foreman'));
set local role authenticated;
insert into public.daily_reports (id, company_id, project_id, report_date, weather, client_updated_at)
values ('22220000-0000-0000-0000-000000000001', tests.v('ca'), tests.v('p'), '2026-01-31', 'sunny', '2026-01-31 10:00+03');
select tests.throws(format('insert into public.daily_reports (company_id, project_id, report_date) values (%L, %L, ''2026-01-31'')', tests.v('ca'), tests.v('p')),
  'one daily report per project and day');
insert into public.progress_entries (company_id, project_id, boq_item_id, daily_report_id, entry_date, quantity)
values (tests.v('ca'), tests.v('p'), tests.v('i1'), '22220000-0000-0000-0000-000000000001', '2026-01-31', 40);
select tests.eq((select percent_complete from public.boq_item_progress where boq_item_id = tests.v('i1')), 40, 'item progress = done ÷ planned');
select tests.eq((select progress from public.task_progress where task_id = '11110000-0000-0000-0000-000000000001'), 40, 'task progress follows its BoQ items');
-- an older offline edit does not overwrite a newer one
update public.daily_reports set summary = 'old', client_updated_at = '2026-01-31 09:00+03' where id = '22220000-0000-0000-0000-000000000001';
select tests.ok((select summary is distinct from 'old' from public.daily_reports where id = '22220000-0000-0000-0000-000000000001'), 'last write wins: older edit ignored');
update public.daily_reports set summary = 'new', client_updated_at = '2026-01-31 11:00+03' where id = '22220000-0000-0000-0000-000000000001';
select tests.ok((select summary = 'new' from public.daily_reports where id = '22220000-0000-0000-0000-000000000001'), 'last write wins: newer edit applied');
select tests.eq((select count(*) from public.progress_claims), 0, 'foreman cannot read claims');
reset role;

-- ---------------------------------------------------------------------------
-- Billing: claims from progress, retention cap, advance, VAT, client approval
-- ---------------------------------------------------------------------------
select tests.login(tests.v('acc'));
set local role authenticated;
select tests.set('c1', public.create_progress_claim(tests.v('p'), '2026-01-31'));
select tests.eq((select cumulative_quantity from public.progress_claim_lines where claim_id = tests.v('c1') and boq_item_id = tests.v('i1')), 40, 'claim takes progress up to its date');
-- 40 000: retention 5 % = 2 000, advance 20 % = 8 000, VAT 4 000 → net 34 000
select tests.eq((select this_period from public.progress_claim_values where id = tests.v('c1')), 40000, 'claim 1 this period');
select tests.eq((select net_payable from public.progress_claim_values where id = tests.v('c1')), 34000, 'claim 1 net = period − retention − advance + VAT');
select tests.throws(format('select public.create_progress_claim(%L, ''2026-02-28'')', tests.v('p')), 'only one draft claim at a time');
update public.progress_claims set status = 'submitted' where id = tests.v('c1');
select tests.throws(format('update public.progress_claim_lines set cumulative_quantity = 99 where claim_id = %L', tests.v('c1')), 'submitted claim lines are locked');
select tests.throws(format('update public.progress_claims set status = ''paid'' where id = %L', tests.v('c1')), 'status cannot skip approval');
select tests.throws(format('select public.decide_progress_claim(%L, true)', tests.v('c1')), 'accountant cannot approve for the client');
reset role;

select tests.login(tests.v('client'));
set local role authenticated;
select tests.eq((select count(*) from public.progress_claim_lines_client where claim_id = tests.v('c1')), 2, 'client reads submitted claim lines with wording');
select public.decide_progress_claim(tests.v('c1'), true, 'OK');
select tests.ok((select status = 'approved' from public.progress_claims where id = tests.v('c1')), 'client approves a claim');
select tests.eq((select count(*) from public.boq_items), 0, 'client still cannot read the BoQ');
select tests.eq((select count(*) from public.expenses), 0, 'client cannot read costs');
reset role;
select tests.ok((select count(*) > 0 from public.notifications where kind = 'claim_approved'), 'approval notifies the contractor');

select tests.login(tests.v('foreman'));
set local role authenticated;
insert into public.progress_entries (company_id, project_id, boq_item_id, entry_date, quantity) values
  (tests.v('ca'), tests.v('p'), tests.v('i1'), '2026-02-20', 50),
  (tests.v('ca'), tests.v('p'), tests.v('i2'), '2026-02-20', 50);
reset role;

select tests.login(tests.v('acc'));
set local role authenticated;
select tests.set('c2', public.create_progress_claim(tests.v('p'), '2026-02-28'));
select tests.eq((select previous_quantity from public.progress_claim_lines where claim_id = tests.v('c2') and boq_item_id = tests.v('i1')), 40, 'previous quantity = last claim');
-- 100 000 this period: retention 5 000 capped at 6 000 − 2 000 = 4 000; advance 20 000 capped at 15 000 − 8 000 = 7 000; VAT 10 000
select tests.eq((select retention from public.progress_claim_values where id = tests.v('c2')), 4000, 'retention stops at the cap');
select tests.eq((select advance_recovery from public.progress_claim_values where id = tests.v('c2')), 7000, 'advance recovery stops at the advance');
select tests.eq((select net_payable from public.progress_claim_values where id = tests.v('c2')), 99000, 'claim 2 net payable');
insert into public.client_payments (company_id, project_id, claim_id, payment_date, amount) values (tests.v('ca'), tests.v('p'), tests.v('c1'), '2026-02-15', 34000);
select tests.eq((select paid_amount from public.progress_claim_values where id = tests.v('c1')), 34000, 'payments are matched to claims');
reset role;

-- ---------------------------------------------------------------------------
-- Procurement and stock
-- ---------------------------------------------------------------------------
select tests.login(tests.v('foreman'));
set local role authenticated;
insert into public.purchase_requests (id, company_id, project_id, title) values ('33330000-0000-0000-0000-000000000001', tests.v('ca'), tests.v('p'), 'Ciment février');
insert into public.purchase_requests (company_id, project_id, title) values (tests.v('ca'), tests.v('p'), 'Fer');
select tests.ok((select array_agg(number order by number) from public.purchase_requests) = array[1, 2], 'requests are numbered by the server');
insert into public.purchase_request_lines (company_id, project_id, purchase_request_id, description, unit, quantity)
values (tests.v('ca'), tests.v('p'), '33330000-0000-0000-0000-000000000001', 'Ciment CPJ 42.5', 't', 10);
update public.purchase_requests set status = 'submitted' where id = '33330000-0000-0000-0000-000000000001';
select tests.throws('update public.purchase_requests set status = ''approved'' where id = ''33330000-0000-0000-0000-000000000001''', 'foreman cannot approve a request');
reset role;

select tests.login(tests.v('pm'));
set local role authenticated;
update public.purchase_requests set status = 'approved' where id = '33330000-0000-0000-0000-000000000001';
select tests.set('po', public.order_from_request('33330000-0000-0000-0000-000000000001'));
select tests.ok((select status = 'ordered' from public.purchase_requests where id = '33330000-0000-0000-0000-000000000001'), 'request marked ordered');
update public.purchase_order_lines set unit_price = 25000, boq_item_id = tests.v('i1') where purchase_order_id = tests.v('po');
update public.purchase_orders set status = 'sent' where id = tests.v('po');
select tests.eq((select total_amount from public.purchase_order_values where id = tests.v('po')), 250000, 'order total');
insert into public.stock_locations (id, company_id, project_id, name) values ('44440000-0000-0000-0000-000000000001', tests.v('ca'), tests.v('p'), 'Magasin principal');
reset role;

select tests.login(tests.v('store'));
set local role authenticated;
select tests.eq((select count(*) from public.purchase_orders), 0, 'storekeeper cannot read priced orders');
select tests.eq((select count(*) from public.purchase_order_lines), 0, 'storekeeper cannot read order prices');
select tests.eq((select remaining_quantity from public.purchase_order_lines_site where purchase_order_id = tests.v('po')), 10, 'storekeeper sees quantities to receive');
insert into public.deliveries (id, company_id, project_id, purchase_order_id, location_id, delivery_date)
values ('55550000-0000-0000-0000-000000000001', tests.v('ca'), tests.v('p'), tests.v('po'), '44440000-0000-0000-0000-000000000001', '2026-02-10');
insert into public.delivery_lines (company_id, project_id, delivery_id, purchase_order_line_id, description, unit, quantity_received, quantity_rejected)
select tests.v('ca'), tests.v('p'), '55550000-0000-0000-0000-000000000001', l.id, l.description, l.unit, 12, 1
from public.purchase_order_lines_site l where l.purchase_order_id = tests.v('po');
select tests.ok((select over_delivered from public.purchase_order_lines_site where purchase_order_id = tests.v('po')), 'over-delivery is flagged');
select tests.eq((select balance from public.stock_balances where item_name = 'Ciment CPJ 42.5'), 12, 'receipt enters stock');
insert into public.stock_movements (company_id, project_id, location_id, kind, movement_date, item_name, unit, quantity)
values (tests.v('ca'), tests.v('p'), '44440000-0000-0000-0000-000000000001', 'out', '2026-02-11', 'Ciment CPJ 42.5', 't', 9.5);
insert into public.stock_thresholds (company_id, project_id, location_id, item_name, unit, min_quantity)
values (tests.v('ca'), tests.v('p'), '44440000-0000-0000-0000-000000000001', 'Ciment CPJ 42.5', 't', 5);
select tests.eq((select balance from public.stock_balances where item_name = 'Ciment CPJ 42.5'), 2.5, 'issue leaves stock');
select tests.ok((select low_stock from public.stock_balances where item_name = 'Ciment CPJ 42.5'), 'low stock below the minimum');
select tests.throws(format('insert into public.stock_movements (company_id, project_id, location_id, kind, movement_date, item_name, quantity) values (%L, %L, %L, ''transfer'', ''2026-02-11'', ''x'', 1)',
  tests.v('ca'), tests.v('p'), '44440000-0000-0000-0000-000000000001'), 'a transfer needs a destination');
reset role;

-- ---------------------------------------------------------------------------
-- Labour and payroll
-- ---------------------------------------------------------------------------
select tests.login(tests.v('acc'));
set local role authenticated;
insert into public.workers (id, company_id, full_name, trade, daily_rate) values ('66660000-0000-0000-0000-000000000001', tests.v('ca'), 'Ali Hassan', 'mason', 2000);
reset role;

select tests.login(tests.v('foreman'));
set local role authenticated;
select tests.eq((select count(*) from public.workers), 0, 'foreman cannot read worker rates');
select tests.eq((select count(*) from public.workers_site), 1, 'foreman reads the worker list');
insert into public.attendance (company_id, project_id, worker_id, work_date, days, overtime_hours)
select tests.v('ca'), tests.v('p'), '66660000-0000-0000-0000-000000000001', d::date, 1, 0 from generate_series('2026-02-01'::date, '2026-02-21', '1 day') d;
insert into public.attendance (company_id, project_id, worker_id, work_date, days, overtime_hours)
values (tests.v('ca'), tests.v('p'), '66660000-0000-0000-0000-000000000001', '2026-02-22', 1, 6);
select tests.throws(format('insert into public.attendance (company_id, project_id, worker_id, work_date, days) values (%L, %L, %L, ''2026-02-23'', 0.7)',
  tests.v('ca'), tests.v('p'), '66660000-0000-0000-0000-000000000001'), 'attendance is 0, ½ or 1 day');
select tests.eq((select count(*) from public.payroll_periods), 0, 'foreman cannot read payroll');
reset role;

select tests.login(tests.v('acc'));
set local role authenticated;
insert into public.payroll_periods (id, company_id, name, start_date, end_date) values ('77770000-0000-0000-0000-000000000001', tests.v('ca'), '2026-02', '2026-02-01', '2026-02-28');
insert into public.advances (company_id, worker_id, advance_date, amount) values (tests.v('ca'), '66660000-0000-0000-0000-000000000001', '2026-02-10', 5000);
select tests.eq(public.generate_payroll('77770000-0000-0000-0000-000000000001'), 1, 'payroll generated from attendance');
update public.payroll_lines set bonus = 1000 where payroll_period_id = '77770000-0000-0000-0000-000000000001';
-- 22 days × 2 000 = 44 000; 6 h × 2 000 / 8 × 1.5 = 2 250; + 1 000 bonus = 47 250; − 5 000 advance = 42 250
select tests.eq((select gross_pay from public.payroll_line_values), 47250, 'gross pay');
select tests.eq((select net_pay from public.payroll_line_values), 42250, 'net pay after advances');
update public.payroll_periods set status = 'approved' where id = '77770000-0000-0000-0000-000000000001';
select tests.throws('update public.payroll_lines set bonus = 0', 'approved payroll is locked');
reset role;
select tests.login(tests.v('foreman'));
set local role authenticated;
select tests.throws(format('update public.attendance set days = 0.5 where work_date = ''2026-02-02'' and worker_id = %L', '66660000-0000-0000-0000-000000000001'),
  'attendance of an approved period is locked');
reset role;

-- ---------------------------------------------------------------------------
-- Equipment and actual costs
-- ---------------------------------------------------------------------------
select tests.login(tests.v('pm'));
set local role authenticated;
insert into public.equipment (id, company_id, code, name, hourly_rate) values ('88880000-0000-0000-0000-000000000001', tests.v('ca'), 'PEL-01', 'Pelle 20 t', 10000);
insert into public.maintenance_records (company_id, equipment_id, title, due_hours) values (tests.v('ca'), '88880000-0000-0000-0000-000000000001', 'Vidange', 8);
insert into public.equipment_logs (company_id, project_id, equipment_id, log_date, hours, fuel_litres) values (tests.v('ca'), tests.v('p'), '88880000-0000-0000-0000-000000000001', '2026-02-12', 8, 50);
select tests.ok((select maintenance_due from public.equipment_status_view where id = '88880000-0000-0000-0000-000000000001'), 'maintenance due by meter hours');
insert into public.expenses (company_id, project_id, expense_date, category, description, amount) values (tests.v('ca'), tests.v('p'), '2026-02-05', 'transport', 'Camion', 12345);
-- 12 345 transport + 250 000 materials (received 12 t? no: priced at the order line) …
select tests.eq((select amount from public.project_cost_entries where source = 'equipment'), 90000, 'equipment cost = hours × rate + fuel × fuel price');
select tests.eq((select amount from public.project_cost_entries where source = 'delivery'), 300000, 'delivered materials at the order price');
select tests.eq((select sum(amount) from public.project_cost_entries where source = 'attendance'), 46250, 'labour cost from attendance');
select tests.eq((select actual_cost from public.project_financials where project_id = tests.v('p')), 448595, 'actual cost gathers every source');
select tests.eq((select contract_total from public.project_financials where project_id = tests.v('p')), 150000, 'contract = current BoQ selling total');
reset role;
select tests.login(tests.v('foreman'));
set local role authenticated;
select tests.eq((select count(*) from public.project_cost_entries), 0, 'foreman sees no costs');
select tests.eq((select count(*) from public.project_financials), 0, 'foreman sees no financials');
select tests.eq((select count(*) from public.equipment), 0, 'foreman cannot read machine rates');
select tests.eq((select count(*) from public.equipment_site), 1, 'foreman reads the machine list');
reset role;

-- ---------------------------------------------------------------------------
-- Documents, RFIs and the client portal
-- ---------------------------------------------------------------------------
select tests.login(tests.v('pm'));
set local role authenticated;
insert into public.documents (company_id, project_id, title, file_path, shared_with_client, document_key)
values (tests.v('ca'), tests.v('p'), 'Marché', tests.v('ca') || '/' || tests.v('p') || '/documents/1-marche.pdf', true, '99990000-0000-0000-0000-000000000001'),
       (tests.v('ca'), tests.v('p'), 'Notes internes', tests.v('ca') || '/' || tests.v('p') || '/documents/2-notes.pdf', false, gen_random_uuid());
insert into public.documents (company_id, project_id, title, file_path, shared_with_client, document_key, version)
values (tests.v('ca'), tests.v('p'), 'Marché', tests.v('ca') || '/' || tests.v('p') || '/documents/3-marche-v2.pdf', true, '99990000-0000-0000-0000-000000000001', 2);
select tests.eq((select version from public.documents_current where document_key = '99990000-0000-0000-0000-000000000001'), 2, 'current document = latest version');
select tests.eq((select version_count from public.documents_current where document_key = '99990000-0000-0000-0000-000000000001'), 2, 'version history is kept');
insert into public.rfis (company_id, project_id, subject, question) values (tests.v('ca'), tests.v('p'), 'Enrobage', 'Quel enrobage ?'), (tests.v('ca'), tests.v('p'), 'Joint', 'Où ?');
select tests.ok((select array_agg(number order by number) from public.rfis) = array[1, 2], 'RFIs are numbered');
update public.rfis set response = '3 cm' where number = 1;
select tests.ok((select status = 'answered' and responded_at is not null from public.rfis where number = 1), 'answering an RFI marks it answered');
reset role;

select tests.login(tests.v('client'));
set local role authenticated;
select tests.eq((select count(*) from public.documents), 2, 'client sees shared documents only');
select tests.ok(public.can_read_storage_path(tests.v('ca') || '/' || tests.v('p') || '/documents/1-marche.pdf'), 'client can download a shared file');
select tests.ok(not public.can_read_storage_path(tests.v('ca') || '/' || tests.v('p') || '/documents/2-notes.pdf'), 'client cannot download an unshared file');
select tests.ok(not public.can_read_storage_path(tests.v('ca') || '/' || tests.v('p') || '/expenses/receipt.jpg'), 'client cannot download receipts');
select tests.eq((select progress from public.client_project_overview where project_id = tests.v('p')), 93.33, 'portal shows physical progress (value-weighted: 140 000 of 150 000)');
select tests.eq((select count(*) from public.rfis), 0, 'client cannot read RFIs');
select tests.eq((select count(*) from public.workers_site), 0, 'client cannot read workers');
reset role;

-- ---------------------------------------------------------------------------
-- Company B sees nothing of company A
-- ---------------------------------------------------------------------------
select tests.login(tests.v('ownerb'));
set local role authenticated;
select tests.eq((select count(*) from public.progress_claim_values), 0, 'company B: no claims of A');
select tests.eq((select count(*) from public.purchase_order_lines_site), 0, 'company B: no orders of A');
select tests.eq((select count(*) from public.stock_balances), 0, 'company B: no stock of A');
select tests.eq((select count(*) from public.equipment_status_view), 0, 'company B: no equipment of A');
select tests.eq((select count(*) from public.client_project_overview where company_id = tests.v('ca')), 0, 'company B: no portal of A');
select tests.eq((select count(*) from public.progress_claim_lines_client), 0, 'company B: no claim lines of A');
select tests.throws(format('select public.create_progress_claim(%L, ''2026-03-31'')', tests.v('p')), 'company B cannot bill A');
select tests.throws(format('select public.generate_payroll(%L)', '77770000-0000-0000-0000-000000000001'), 'company B cannot run A payroll');
select tests.throws(format('insert into public.attendance (company_id, project_id, worker_id, work_date) values (%L, %L, %L, ''2026-03-01'')',
  tests.v('ca'), tests.v('p'), '66660000-0000-0000-0000-000000000001'), 'company B cannot write A attendance');
reset role;

-- Every table: company B reads none of A's rows and cannot change them.
create temp table a_rows on commit drop as
select c.relname::text as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'company_id' and not a.attisdropped);
do $$
declare r record; n int; total int := 0;
begin
  for r in select t from a_rows loop
    execute format('select count(*) from public.%I where company_id = %L', r.t, tests.v('ca')) into n;
    if n > 0 then total := total + 1; end if;
  end loop;
  perform tests.ok(total >= 40, format('fixtures cover %s tables', total));
end $$;
grant select on a_rows to authenticated;
select tests.login(tests.v('ownerb'));
set local role authenticated;
do $$
declare r record; n int;
begin
  for r in select t from a_rows loop
    execute format('select count(*) from public.%I where company_id = %L', r.t, tests.v('ca')) into n;
    if n <> 0 then raise exception 'FAILED: company B reads % rows of A in %', n, r.t; end if;
    begin
      execute format('update public.%I set company_id = company_id where company_id = %L', r.t, tests.v('ca'));
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'FAILED: company B updated % rows of A in %', n, r.t; end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform tests.ok(true, 'company B can neither read nor update any row of A, in every table');
end $$;
reset role;

\o
select format('Module tests passed: %s assertions', count(*)) from tests.results;
rollback;
