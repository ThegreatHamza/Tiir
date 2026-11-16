-- Tiir · Phase 6 · 0013 — Labour and payroll
-- Worker register, daily attendance per project (offline from the phone),
-- payroll periods, payslips, advances. Foremen record attendance but never
-- see rates or pay: they read workers_site.

do $$ begin
  create type public.payroll_status as enum ('draft', 'approved', 'paid');
exception when duplicate_object then null; end $$;

create table if not exists public.workers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  full_name   text not null check (length(trim(full_name)) between 1 and 160),
  trade       text not null default '' check (length(trade) <= 80),
  daily_rate  numeric(18,2) not null default 0 check (daily_rate >= 0),
  currency    public.currency_code not null default 'DJF',
  phone       text,
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
create index if not exists workers_company_idx on public.workers (company_id);
-- Rates are payroll data: owners, admins, accountants (and project managers who hire).
select public.setup_table('workers', 'company', '{owner,admin,accountant,project_manager}', '{owner,admin,accountant,project_manager}');

create or replace view public.workers_site
with (security_barrier = true) as
select w.id, w.company_id, w.full_name, w.trade, w.phone, w.active
from public.workers w
where w.deleted_at is null
  and public.has_company_role(w.company_id, '{owner,admin,project_manager,site_foreman,accountant}'::public.app_role[]);
revoke all on public.workers_site from anon;
grant select on public.workers_site to authenticated;

create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  worker_id       uuid not null references public.workers (id) on delete cascade,
  work_date       date not null,
  days            numeric(3,2) not null default 1 check (days in (0, 0.5, 1)),
  overtime_hours  numeric(5,2) not null default 0 check (overtime_hours between 0 and 16),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at      timestamptz
);
create index if not exists attendance_company_idx on public.attendance (company_id);
create index if not exists attendance_project_idx on public.attendance (project_id, work_date);
create index if not exists attendance_worker_idx on public.attendance (worker_id, work_date);
create unique index if not exists attendance_one_per_day on public.attendance (worker_id, project_id, work_date) where deleted_at is null;
select public.setup_table('attendance', 'project', '{owner,admin,project_manager,site_foreman,accountant}', '{owner,admin,project_manager,site_foreman}', false);
select public.add_same_project_check('attendance', 'workers', 'worker_id', 'company_id');
select public.add_last_write_wins('attendance');

create table if not exists public.payroll_periods (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  start_date  date not null,
  end_date    date not null,
  status      public.payroll_status not null default 'draft',
  currency    public.currency_code not null default 'DJF',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz,
  constraint payroll_periods_dates_chk check (end_date >= start_date)
);
create index if not exists payroll_periods_company_idx on public.payroll_periods (company_id, start_date);
select public.setup_table('payroll_periods', 'company', '{owner,admin,accountant}', '{owner,admin,accountant}');

create table if not exists public.payroll_lines (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  payroll_period_id uuid not null references public.payroll_periods (id) on delete cascade,
  worker_id         uuid not null references public.workers (id) on delete cascade,
  daily_rate        numeric(18,2) not null check (daily_rate >= 0),     -- rate frozen for this payslip
  bonus             numeric(18,2) not null default 0 check (bonus >= 0),
  deduction         numeric(18,2) not null default 0 check (deduction >= 0),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at        timestamptz
);
create index if not exists payroll_lines_company_idx on public.payroll_lines (company_id);
create index if not exists payroll_lines_period_idx on public.payroll_lines (payroll_period_id);
create unique index if not exists payroll_lines_unique_live on public.payroll_lines (payroll_period_id, worker_id) where deleted_at is null;
select public.setup_table('payroll_lines', 'company', '{owner,admin,accountant}', '{owner,admin,accountant}', false);
select public.add_same_project_check('payroll_lines', 'payroll_periods', 'payroll_period_id', 'company_id');
select public.add_same_project_check('payroll_lines', 'workers', 'worker_id', 'company_id');

create table if not exists public.advances (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  worker_id    uuid not null references public.workers (id) on delete cascade,
  advance_date date not null,
  amount       numeric(18,2) not null check (amount > 0),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
create index if not exists advances_company_idx on public.advances (company_id);
create index if not exists advances_worker_idx on public.advances (worker_id, advance_date);
select public.setup_table('advances', 'company', '{owner,admin,accountant}', '{owner,admin,accountant}');
select public.add_same_project_check('advances', 'workers', 'worker_id', 'company_id');

-- Approved or paid periods freeze attendance, payslip lines and advances.
create or replace function public.tg_payroll_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date;
  v_period uuid;
begin
  if tg_table_name = 'attendance' then
    v_date := new.work_date;
  elsif tg_table_name = 'advances' then
    v_date := new.advance_date;
  else
    v_period := new.payroll_period_id;
  end if;
  if (v_period is not null and exists (select 1 from public.payroll_periods p where p.id = v_period and p.status <> 'draft'))
     or (v_date is not null and exists (select 1 from public.payroll_periods p where p.company_id = new.company_id
           and p.deleted_at is null and p.status <> 'draft' and v_date between p.start_date and p.end_date)) then
    raise exception 'payroll period is closed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['attendance', 'advances', 'payroll_lines'] loop
    execute format('create or replace trigger %I before insert or update on public.%I for each row execute function public.tg_payroll_lock()', t || '_payroll_lock', t);
  end loop;
end $$;

-- Payslip figures. Mirrors payslip() in src/lib/calc/payroll.ts:
-- gross = days × rate + overtime hours × (rate / hours per day) × overtime multiplier + bonus
-- net = gross − advances in the period − other deductions.
create or replace view public.payroll_line_values
with (security_invoker = true) as
select l.*, w.full_name, w.trade, w.phone, p.start_date, p.end_date, p.currency, p.status as period_status,
  coalesce(a.days, 0) as days_worked,
  coalesce(a.ot, 0) as overtime_hours,
  public.round_money(coalesce(a.days, 0) * l.daily_rate, p.currency) as base_pay,
  public.round_money(coalesce(a.ot, 0) * l.daily_rate / cs.working_hours_per_day * cs.overtime_multiplier, p.currency) as overtime_pay,
  coalesce(adv.total, 0) as advances,
  public.round_money(coalesce(a.days, 0) * l.daily_rate, p.currency)
    + public.round_money(coalesce(a.ot, 0) * l.daily_rate / cs.working_hours_per_day * cs.overtime_multiplier, p.currency)
    + l.bonus as gross_pay,
  public.round_money(coalesce(a.days, 0) * l.daily_rate, p.currency)
    + public.round_money(coalesce(a.ot, 0) * l.daily_rate / cs.working_hours_per_day * cs.overtime_multiplier, p.currency)
    + l.bonus - coalesce(adv.total, 0) - l.deduction as net_pay
from public.payroll_lines l
join public.payroll_periods p on p.id = l.payroll_period_id
join public.workers w on w.id = l.worker_id
join public.company_settings cs on cs.company_id = l.company_id
left join lateral (
  select sum(at.days) as days, sum(at.overtime_hours) as ot from public.attendance at
  where at.worker_id = l.worker_id and at.deleted_at is null and at.work_date between p.start_date and p.end_date
) a on true
left join lateral (
  select sum(ad.amount) as total from public.advances ad
  where ad.worker_id = l.worker_id and ad.deleted_at is null and ad.advance_date between p.start_date and p.end_date
) adv on true
where l.deleted_at is null;
revoke all on public.payroll_line_values from anon;
grant select on public.payroll_line_values to authenticated;

-- Fills a draft period with one line per worker who has attendance in it.
create or replace function public.generate_payroll(p_period_id uuid)
returns int
language plpgsql
set search_path = ''
as $$
declare
  p public.payroll_periods;
  n int;
begin
  select * into p from public.payroll_periods where id = p_period_id and deleted_at is null;
  if p.id is null or not public.has_company_role(p.company_id, '{owner,admin,accountant}'::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  insert into public.payroll_lines (company_id, payroll_period_id, worker_id, daily_rate)
  select p.company_id, p.id, w.id, w.daily_rate
  from public.workers w
  where w.company_id = p.company_id and w.deleted_at is null
    and exists (select 1 from public.attendance a where a.worker_id = w.id and a.deleted_at is null and a.work_date between p.start_date and p.end_date)
    and not exists (select 1 from public.payroll_lines l where l.payroll_period_id = p.id and l.worker_id = w.id and l.deleted_at is null);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.generate_payroll(uuid) from public, anon;
grant execute on function public.generate_payroll(uuid) to authenticated;

-- Labour cost per project (days × current rate + overtime) joins the actual costs.
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
where a.deleted_at is null;
