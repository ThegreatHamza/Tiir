-- Tiir · Phase 7 · 0014 — Equipment
-- Register of owned and rented equipment, daily hours and fuel per project
-- (offline from the phone), maintenance schedule with alerts, cost to projects.

do $$ begin
  create type public.equipment_ownership as enum ('owned', 'rented');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.equipment_status as enum ('active', 'maintenance', 'retired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.maintenance_status as enum ('planned', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.equipment (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  code          text not null check (length(trim(code)) between 1 and 40),
  name          text not null check (length(trim(name)) between 1 and 200),
  category      text,
  ownership     public.equipment_ownership not null default 'owned',
  supplier_id   uuid references public.suppliers (id) on delete set null,
  hourly_rate   numeric(18,2) not null default 0 check (hourly_rate >= 0),
  currency      public.currency_code not null default 'DJF',
  status        public.equipment_status not null default 'active',
  registration  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists equipment_company_idx on public.equipment (company_id);
create unique index if not exists equipment_code_unique_live on public.equipment (company_id, lower(code)) where deleted_at is null;
select public.setup_table('equipment', 'company', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}');
select public.add_same_project_check('equipment', 'suppliers', 'supplier_id', 'company_id');

create or replace view public.equipment_site
with (security_barrier = true) as
select e.id, e.company_id, e.code, e.name, e.category, e.ownership, e.status, e.registration
from public.equipment e
where e.deleted_at is null
  and public.has_company_role(e.company_id, '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}'::public.app_role[]);
revoke all on public.equipment_site from anon;
grant select on public.equipment_site to authenticated;

create table if not exists public.equipment_logs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  equipment_id  uuid not null references public.equipment (id) on delete cascade,
  log_date      date not null,
  hours         numeric(5,2) not null default 0 check (hours between 0 and 24),
  fuel_litres   numeric(10,2) not null default 0 check (fuel_litres >= 0),
  operator_name text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists equipment_logs_company_idx on public.equipment_logs (company_id);
create index if not exists equipment_logs_project_idx on public.equipment_logs (project_id, log_date);
create index if not exists equipment_logs_equipment_idx on public.equipment_logs (equipment_id, log_date);
select public.setup_table('equipment_logs', 'project', '{owner,admin,project_manager,site_foreman,accountant,estimator}', '{owner,admin,project_manager,site_foreman}', false);
select public.add_same_project_check('equipment_logs', 'equipment', 'equipment_id', 'company_id');
select public.add_last_write_wins('equipment_logs');

create table if not exists public.maintenance_records (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  equipment_id    uuid not null references public.equipment (id) on delete cascade,
  title           text not null check (length(trim(title)) between 1 and 200),
  status          public.maintenance_status not null default 'planned',
  due_date        date,
  due_hours       numeric(10,1),
  done_date       date,
  cost            numeric(18,2) not null default 0 check (cost >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at      timestamptz
);
create index if not exists maintenance_company_idx on public.maintenance_records (company_id);
create index if not exists maintenance_equipment_idx on public.maintenance_records (equipment_id, due_date);
select public.setup_table('maintenance_records', 'company', '{owner,admin,project_manager,site_foreman,accountant,estimator}', '{owner,admin,project_manager,accountant}');
select public.add_same_project_check('maintenance_records', 'equipment', 'equipment_id', 'company_id');

-- Hours run by each machine (all projects) and maintenance due.
create or replace view public.equipment_status_view
with (security_barrier = true) as
select e.id, e.company_id, e.code, e.name, e.ownership, e.status,
  coalesce((select sum(l.hours) from public.equipment_logs l where l.equipment_id = e.id and l.deleted_at is null), 0) as total_hours,
  m.id as next_maintenance_id, m.title as next_maintenance, m.due_date, m.due_hours,
  (m.id is not null and (
     (m.due_date is not null and m.due_date <= (now() at time zone 'utc')::date + cs.maintenance_alert_days) or
     (m.due_hours is not null and coalesce((select sum(l.hours) from public.equipment_logs l where l.equipment_id = e.id and l.deleted_at is null), 0) >= m.due_hours)
  )) as maintenance_due
from public.equipment e
join public.company_settings cs on cs.company_id = e.company_id
left join lateral (
  select r.* from public.maintenance_records r
  where r.equipment_id = e.id and r.status = 'planned' and r.deleted_at is null
  order by r.due_date nulls last, r.due_hours nulls last limit 1
) m on true
where e.deleted_at is null
  and public.has_company_role(e.company_id, '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}'::public.app_role[]);
revoke all on public.equipment_status_view from anon;
grant select on public.equipment_status_view to authenticated;

-- Equipment cost to projects: hours × hourly rate + fuel × company fuel price.
create or replace view public.project_cost_entries
with (security_invoker = true) as
select e.company_id, e.project_id, e.expense_date as entry_date, e.category::text as category, e.boq_item_id,
       e.amount::numeric as amount, 'expense'::text as source, e.id as source_id, e.description
from public.expenses e where e.deleted_at is null
union all
select c.company_id, c.project_id, c.claim_date, 'subcontract', s.boq_item_id, c.amount::numeric, 'subcontract', c.id, s.title
from public.subcontractor_claims c join public.subcontracts s on s.id = c.subcontract_id
where c.deleted_at is null and c.status in ('approved', 'paid')
union all
select dl.company_id, dl.project_id, d.delivery_date, 'materials', pol.boq_item_id,
       public.round_money(dl.quantity_received * pol.unit_price, p.currency), 'delivery', dl.id, dl.description
from public.delivery_lines dl
join public.deliveries d on d.id = dl.delivery_id and d.deleted_at is null
join public.purchase_order_lines pol on pol.id = dl.purchase_order_line_id
join public.projects p on p.id = dl.project_id
where dl.deleted_at is null
union all
select a.company_id, a.project_id, a.work_date, 'labour', null::uuid,
       public.round_money(a.days * w.daily_rate + a.overtime_hours * w.daily_rate / cs.working_hours_per_day * cs.overtime_multiplier, p.currency),
       'attendance', a.id, w.full_name
from public.attendance a
join public.workers w on w.id = a.worker_id
join public.projects p on p.id = a.project_id
join public.company_settings cs on cs.company_id = a.company_id
where a.deleted_at is null
union all
select l.company_id, l.project_id, l.log_date, 'equipment', null::uuid,
       public.round_money(l.hours * q.hourly_rate + l.fuel_litres * cs.fuel_unit_cost, p.currency),
       'equipment', l.id, q.name
from public.equipment_logs l
join public.equipment q on q.id = l.equipment_id
join public.projects p on p.id = l.project_id
join public.company_settings cs on cs.company_id = l.company_id
where l.deleted_at is null;
