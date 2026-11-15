-- Tiir · Row Level Security tests
-- Proves tenant isolation (company A cannot read or write company B data)
-- and role restrictions (a site foreman cannot read prices/rates).
--
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Everything runs in one transaction and is rolled back at the end.
-- Any failed assertion raises an exception and stops the run (non-zero exit).

\set QUIET on
\pset tuples_only on
\o /dev/null
begin;

create schema tests;
grant usage on schema tests to authenticated, anon;

create table tests.results (n serial, name text);
grant insert, select on tests.results to authenticated, anon;
grant usage on sequence tests.results_n_seq to authenticated, anon;

create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create function tests.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FAILED: %', p_name;
  end if;
  insert into tests.results (name) values (p_name);
end $$;

create function tests.throws(p_sql text, p_name text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    insert into tests.results (name) values (p_name);
    return;
  end;
  raise exception 'FAILED (no error raised): %', p_name;
end $$;

create function tests.affected(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema tests to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'owner.a@test.dj',   '{"full_name":"Owner A","company_name":"Alpha BTP","country":"DJ"}'),
  ('b0000000-0000-0000-0000-000000000001', 'owner.b@test.et',   '{"full_name":"Owner B","company_name":"Bravo Construction","country":"ET"}'),
  ('a0000000-0000-0000-0000-000000000002', 'admin.a@test.dj',   '{"full_name":"Admin A"}'),
  ('a0000000-0000-0000-0000-000000000003', 'pm.a@test.dj',      '{"full_name":"PM A"}'),
  ('a0000000-0000-0000-0000-000000000004', 'foreman.a@test.dj', '{"full_name":"Foreman A"}'),
  ('a0000000-0000-0000-0000-000000000005', 'client.a@test.dj',  '{"full_name":"Client A"}'),
  ('a0000000-0000-0000-0000-000000000006', 'store.a@test.dj',   '{"full_name":"Store A"}'),
  ('c0000000-0000-0000-0000-000000000001', 'invitee@test.dj',   '{"full_name":"Invitee"}'),
  ('d0000000-0000-0000-0000-000000000001', 'outsider@test.dj',  '{"full_name":"Outsider"}');

-- Sign-up created companies, owners, profiles and settings.
select tests.ok((select count(*) from public.companies) = 2, 'signup with company_name creates a company');
select tests.ok((select count(*) from public.profiles) = 9, 'signup creates a profile for every user');
select tests.ok(
  (select role from public.company_members m join public.companies c on c.id = m.company_id
    where c.name = 'Alpha BTP' and m.user_id = 'a0000000-0000-0000-0000-000000000001') = 'owner',
  'signup makes the user owner of the new company');
select tests.ok(
  (select default_currency from public.companies where name = 'Bravo Construction') = 'ETB',
  'Ethiopian company defaults to ETB');

create temp table ids as
select (select id from public.companies where name = 'Alpha BTP') as ca,
       (select id from public.companies where name = 'Bravo Construction') as cb;
grant select on ids to authenticated, anon;

insert into public.company_members (company_id, user_id, role)
select ca, u, r::public.app_role from ids, (values
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'admin'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'project_manager'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'site_foreman'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'client_viewer'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'storekeeper')) v(u, r);

update public.company_settings set vat_rate = 10, retention_rate = 5, price_coefficient = 1.25
 where company_id = (select ca from ids);

insert into public.clients (id, company_id, name) select 'aaaa0000-0000-0000-0000-00000000c001', ca, 'Client Alpha' from ids;
insert into public.clients (id, company_id, name) select 'bbbb0000-0000-0000-0000-00000000c001', cb, 'Client Bravo' from ids;

insert into public.projects (id, company_id, code, name, currency, client_id)
select 'aaaa0000-0000-0000-0000-000000000001', ca, 'A-001', 'École Balbala', 'DJF', 'aaaa0000-0000-0000-0000-00000000c001' from ids;
insert into public.projects (id, company_id, code, name, currency)
select 'aaaa0000-0000-0000-0000-000000000002', ca, 'A-002', 'Route PK12', 'DJF' from ids;
insert into public.projects (id, company_id, code, name, currency)
select 'bbbb0000-0000-0000-0000-000000000001', cb, 'B-001', 'Dire Dawa Warehouse', 'ETB' from ids;

select tests.ok(
  (select vat_rate from public.project_settings where project_id = 'aaaa0000-0000-0000-0000-000000000001') = 10,
  'project settings are copied from company defaults');

-- Assign PM, foreman, storekeeper and client viewer to project A-001 only.
insert into public.project_members (company_id, project_id, user_id)
select ca, 'aaaa0000-0000-0000-0000-000000000001', u from ids, (values
  ('a0000000-0000-0000-0000-000000000003'::uuid),
  ('a0000000-0000-0000-0000-000000000004'::uuid),
  ('a0000000-0000-0000-0000-000000000005'::uuid),
  ('a0000000-0000-0000-0000-000000000006'::uuid)) v(u);

insert into storage.objects (bucket_id, name)
select 'tiir', ca || '/aaaa0000-0000-0000-0000-000000000001/photos/p1.jpg' from ids union all
select 'tiir', ca || '/aaaa0000-0000-0000-0000-000000000002/photos/p2.jpg' from ids union all
select 'tiir', ca || '/_company/payroll/2026-10.pdf' from ids union all
select 'tiir', cb || '/bbbb0000-0000-0000-0000-000000000001/photos/b1.jpg' from ids;

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
set local role anon;
select tests.throws('select count(*) from public.projects', 'anon cannot read projects');
select tests.throws('select count(*) from public.companies', 'anon cannot read companies');
reset role;

-- ---------------------------------------------------------------------------
-- Owner of company A vs company B data
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000001');
set local role authenticated;

select tests.ok((select count(*) from public.companies) = 1, 'owner A sees only company A');
select tests.ok((select count(*) from public.companies where id = (select cb from ids)) = 0, 'owner A cannot read company B');
select tests.ok((select count(*) from public.projects) = 2, 'owner A sees all company A projects');
select tests.ok((select count(*) from public.projects where company_id = (select cb from ids)) = 0, 'owner A cannot read company B projects');
select tests.ok((select count(*) from public.clients where company_id = (select cb from ids)) = 0, 'owner A cannot read company B clients');
select tests.ok((select count(*) from public.company_members where company_id = (select cb from ids)) = 0, 'owner A cannot read company B members');
select tests.ok((select count(*) from public.company_settings where company_id = (select cb from ids)) = 0, 'owner A cannot read company B settings');
select tests.ok((select count(*) from public.project_settings where company_id = (select cb from ids)) = 0, 'owner A cannot read company B project settings');
select tests.ok((select count(*) from public.audit_log where company_id = (select cb from ids)) = 0, 'owner A cannot read company B audit log');
select tests.ok((select count(*) from public.project_list) = 2, 'project_list view respects RLS');
select tests.ok((select count(*) from public.company_member_directory where company_id = (select cb from ids)) = 0, 'member directory respects RLS');

select tests.throws(
  format('insert into public.projects (company_id, code, name, currency) values (%L, ''X'', ''X'', ''ETB'')', (select cb from ids)),
  'owner A cannot create a project in company B');
select tests.throws(
  format('insert into public.clients (company_id, name) values (%L, ''X'')', (select cb from ids)),
  'owner A cannot create a client in company B');
select tests.ok(
  tests.affected('update public.projects set name = ''hacked'' where id = ''bbbb0000-0000-0000-0000-000000000001''') = 0,
  'owner A cannot update company B project');
select tests.ok(
  tests.affected(format('update public.companies set name = ''hacked'' where id = %L', (select cb from ids))) = 0,
  'owner A cannot update company B');
select tests.throws(
  format('insert into public.company_members (company_id, user_id, role) values (%L, ''a0000000-0000-0000-0000-000000000001'', ''owner'')', (select cb from ids)),
  'owner A cannot add themselves to company B');
select tests.throws(
  'insert into public.project_members (company_id, project_id, user_id) values (gen_random_uuid(), ''bbbb0000-0000-0000-0000-000000000001'', ''a0000000-0000-0000-0000-000000000001'')',
  'owner A cannot assign themselves to a company B project');
select tests.throws(
  format('select public.create_invitation(%L, ''x@test.dj'', ''site_foreman'')', (select cb from ids)),
  'owner A cannot invite into company B');
select tests.throws(
  'update public.profiles set last_company_id = (select cb from ids) where id = auth.uid()',
  'owner A cannot switch to company B');
select tests.throws('delete from public.projects', 'hard delete is not allowed');

select tests.ok(public.can_read_storage_path((select ca from ids) || '/_company/payroll/2026-10.pdf'), 'owner A reads company A payroll files');
select tests.ok((select count(*) from storage.objects where name like (select cb from ids) || '%') = 0, 'owner A cannot list company B files');
select tests.throws(
  format('insert into storage.objects (bucket_id, name) values (''tiir'', %L)', (select cb from ids) || '/_company/branding/logo.png'),
  'owner A cannot upload into company B storage');

-- Soft delete works for owners.
select tests.ok(
  tests.affected('update public.clients set deleted_at = now() where id = ''aaaa0000-0000-0000-0000-00000000c001''') = 1,
  'owner A can soft-delete own client');
select tests.ok(
  tests.affected('update public.clients set deleted_at = null where id = ''aaaa0000-0000-0000-0000-00000000c001''') = 1,
  'owner A can restore own client');

-- Membership guard.
select tests.throws(
  'update public.company_members set role = ''admin'' where user_id = auth.uid()',
  'owner cannot change their own role');
select tests.ok(public.create_invitation((select ca from ids), 'invitee@test.dj', 'estimator',
                array['aaaa0000-0000-0000-0000-000000000002'::uuid]) is not null,
  'owner A can invite a member');
reset role;

-- ---------------------------------------------------------------------------
-- Owner of company B vs company A data
-- ---------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000001');
set local role authenticated;
select tests.ok((select count(*) from public.projects) = 1, 'owner B sees only company B projects');
select tests.ok((select count(*) from public.clients where company_id = (select ca from ids)) = 0, 'owner B cannot read company A clients');
select tests.ok((select count(*) from public.profiles where id = 'a0000000-0000-0000-0000-000000000004') = 0, 'owner B cannot read company A profiles');
select tests.ok((select count(*) from public.company_invitations) = 0, 'owner B cannot read company A invitations');
select tests.ok(
  tests.affected('update public.project_settings set vat_rate = 99 where project_id = ''aaaa0000-0000-0000-0000-000000000001''') = 0,
  'owner B cannot change company A project settings');
select tests.ok(not public.can_read_storage_path((select ca from ids) || '/aaaa0000-0000-0000-0000-000000000001/photos/p1.jpg'),
  'owner B cannot read company A photos');
reset role;

-- ---------------------------------------------------------------------------
-- Admin of company A
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000002');
set local role authenticated;
select tests.ok((select count(*) from public.projects) = 2, 'admin sees every company project');
select tests.throws(
  'update public.company_members set role = ''owner'' where user_id = ''a0000000-0000-0000-0000-000000000003''',
  'admin cannot promote a member to owner');
select tests.throws(
  'update public.company_members set deleted_at = now() where user_id = ''a0000000-0000-0000-0000-000000000001''',
  'admin cannot remove the owner');
select tests.ok(
  tests.affected('update public.company_members set role = ''estimator'' where user_id = ''a0000000-0000-0000-0000-000000000003''') = 1,
  'admin can change a non-admin role');
update public.company_members set role = 'project_manager' where user_id = 'a0000000-0000-0000-0000-000000000003';
reset role;

-- ---------------------------------------------------------------------------
-- Project manager of company A (assigned to A-001 only)
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000003');
set local role authenticated;
select tests.ok((select count(*) from public.projects) = 1, 'PM sees only assigned projects');
select tests.ok(
  tests.affected('update public.projects set description = ''ok'' where id = ''aaaa0000-0000-0000-0000-000000000001''') = 1,
  'PM can update assigned project');
select tests.ok(
  tests.affected('update public.projects set description = ''no'' where id = ''aaaa0000-0000-0000-0000-000000000002''') = 0,
  'PM cannot update unassigned project');
select tests.throws(
  'update public.projects set currency = ''USD'' where id = ''aaaa0000-0000-0000-0000-000000000001''',
  'project currency is locked');
select tests.ok((select count(*) from public.project_settings) = 1, 'PM reads settings of assigned project');
reset role;

-- ---------------------------------------------------------------------------
-- Site foreman of company A: no prices, no rates, no finance
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000004');
set local role authenticated;
select tests.ok((select count(*) from public.projects) = 1, 'foreman sees only assigned project');
select tests.ok((select count(*) from public.projects where id = 'aaaa0000-0000-0000-0000-000000000002') = 0, 'foreman cannot read unassigned project');
select tests.ok(not public.can_see_costs((select ca from ids)), 'foreman cannot see costs or prices');
select tests.ok(not public.can_see_finance((select ca from ids)), 'foreman cannot see finance or payroll');
select tests.ok((select count(*) from public.project_settings) = 0, 'foreman cannot read project price coefficient and rates');
select tests.ok((select count(*) from public.company_settings) = 0, 'foreman cannot read company rates');
select tests.ok((select count(*) from public.clients) = 0, 'foreman cannot read clients');
select tests.ok((select count(*) from public.audit_log) = 0, 'foreman cannot read audit log');
select tests.ok(
  tests.affected('update public.projects set name = ''x'' where id = ''aaaa0000-0000-0000-0000-000000000001''') = 0,
  'foreman cannot edit projects');
select tests.throws(
  format('insert into public.projects (company_id, code, name, currency) values (%L, ''F'', ''F'', ''DJF'')', (select ca from ids)),
  'foreman cannot create projects');
select tests.throws(
  format('select public.create_invitation(%L, ''y@test.dj'', ''owner'')', (select ca from ids)),
  'foreman cannot invite');
select tests.ok(public.can_read_storage_path((select ca from ids) || '/aaaa0000-0000-0000-0000-000000000001/photos/p1.jpg'), 'foreman reads assigned project photos');
select tests.ok(not public.can_read_storage_path((select ca from ids) || '/aaaa0000-0000-0000-0000-000000000002/photos/p2.jpg'), 'foreman cannot read unassigned project photos');
select tests.ok(not public.can_read_storage_path((select ca from ids) || '/_company/payroll/2026-10.pdf'), 'foreman cannot read payroll files');
select tests.ok((select count(*) from storage.objects) = 1, 'foreman lists only assigned project files');
reset role;

-- ---------------------------------------------------------------------------
-- Storekeeper of company A
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000006');
set local role authenticated;
select tests.ok(not public.can_see_costs((select ca from ids)), 'storekeeper cannot see costs or prices');
select tests.ok((select count(*) from public.project_settings) = 0, 'storekeeper cannot read rates');
reset role;

-- ---------------------------------------------------------------------------
-- Client viewer of company A
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000005');
set local role authenticated;
select tests.ok((select count(*) from public.projects) = 1, 'client viewer sees only their project');
select tests.ok((select count(*) from public.company_members) = 1, 'client viewer sees only their own membership');
select tests.ok((select count(*) from public.clients) = 0, 'client viewer cannot read client register');
select tests.ok((select count(*) from public.project_settings) = 0, 'client viewer cannot read rates');
select tests.throws(
  format('insert into storage.objects (bucket_id, name) values (''tiir'', %L)',
         (select ca from ids) || '/aaaa0000-0000-0000-0000-000000000001/photos/x.jpg'),
  'client viewer cannot upload files');
reset role;

-- ---------------------------------------------------------------------------
-- Outsider (no company)
-- ---------------------------------------------------------------------------
select tests.login('d0000000-0000-0000-0000-000000000001');
set local role authenticated;
select tests.ok((select count(*) from public.companies) = 0, 'outsider sees no companies');
select tests.ok((select count(*) from public.projects) = 0, 'outsider sees no projects');
select tests.ok((select count(*) from public.profiles) = 1, 'outsider sees only own profile');
select tests.ok((select count(*) from public.my_invitations()) = 0, 'outsider has no invitations');
select tests.throws(
  format('select public.accept_invitation(%L)', (select id from public.company_invitations limit 1)),
  'outsider cannot accept someone else''s invitation');
select tests.ok(public.create_company('Outsider SARL', 'DJ', null, 'fr') is not null, 'any user can create a new company');
select tests.ok((select count(*) from public.companies) = 1, 'new company is visible to its creator');
reset role;

-- ---------------------------------------------------------------------------
-- Invitee accepts invitation
-- ---------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
set local role authenticated;
select tests.ok((select count(*) from public.my_invitations()) = 1, 'invitee sees their invitation');
select tests.ok(public.accept_invitation((select id from public.my_invitations() limit 1)) = (select ca from ids), 'invitee accepts invitation');
select tests.ok((select role from public.company_members where user_id = auth.uid()) = 'estimator', 'invitee gets the invited role');
select tests.ok((select count(*) from public.projects) = 1
                and (select id from public.projects limit 1) = 'aaaa0000-0000-0000-0000-000000000002',
                'invitee is assigned the invited projects only');
reset role;

\o
-- ---------------------------------------------------------------------------
select format('RLS tests passed: %s assertions', count(*)) as result from tests.results;
rollback;
