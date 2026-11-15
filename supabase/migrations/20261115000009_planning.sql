-- Tiir · Phase 2 · 0009 — Planning
-- Calendars and holidays, tasks (WBS), dependencies with lag, task ↔ BoQ
-- links, baselines. Critical path is computed by the app (pure, tested
-- functions in src/lib/calc/schedule.ts) from these tables.

do $$ begin
  create type public.dependency_type as enum ('FS', 'SS', 'FF', 'SF');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.progress_source as enum ('manual', 'boq');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- calendars / holidays (company level)
-- working_days uses ISO numbers: 1 = Monday … 7 = Sunday.
-- ---------------------------------------------------------------------------
create table if not exists public.calendars (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 120),
  working_days  smallint[] not null default '{6,7,1,2,3,4}'
                check (working_days <@ '{1,2,3,4,5,6,7}'::smallint[] and cardinality(working_days) between 1 and 7),
  hours_per_day numeric(5,2) not null default 8 check (hours_per_day > 0 and hours_per_day <= 24),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists calendars_company_idx on public.calendars (company_id);
create unique index if not exists calendars_one_default on public.calendars (company_id) where is_default and deleted_at is null;
select public.setup_table('calendars', 'company',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager}');

create table if not exists public.holidays (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  calendar_id  uuid not null references public.calendars (id) on delete cascade,
  date         date not null,
  name         text not null check (length(trim(name)) between 1 and 120),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
create index if not exists holidays_company_idx on public.holidays (company_id);
create index if not exists holidays_calendar_idx on public.holidays (calendar_id, date);
create unique index if not exists holidays_unique_live on public.holidays (calendar_id, date) where deleted_at is null;
select public.setup_table('holidays', 'company',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager}');
select public.add_same_project_check('holidays', 'calendars', 'calendar_id', 'company_id');

alter table public.project_settings add column if not exists calendar_id uuid references public.calendars (id) on delete set null;

-- Every company gets a default calendar matching its country:
-- Djibouti: Saturday–Thursday; Ethiopia: Monday–Saturday (see DECISIONS.md).
create or replace function public.tg_company_default_calendar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.calendars (company_id, name, working_days, is_default, created_by)
  values (new.id,
          case when new.country = 'ET' then 'Standard (lun.–sam.)' else 'Standard (sam.–jeu.)' end,
          case when new.country = 'ET' then '{1,2,3,4,5,6}'::smallint[] else '{6,7,1,2,3,4}'::smallint[] end,
          true, new.created_by);
  return null;
end;
$$;
drop trigger if exists companies_default_calendar on public.companies;
create trigger companies_default_calendar after insert on public.companies
  for each row execute function public.tg_company_default_calendar();

insert into public.calendars (company_id, name, working_days, is_default, created_by)
select c.id,
       case when c.country = 'ET' then 'Standard (lun.–sam.)' else 'Standard (sam.–jeu.)' end,
       case when c.country = 'ET' then '{1,2,3,4,5,6}'::smallint[] else '{6,7,1,2,3,4}'::smallint[] end,
       true, c.created_by
from public.companies c
where not exists (select 1 from public.calendars k where k.company_id = c.id);

-- ---------------------------------------------------------------------------
-- tasks
-- start/end/duration are kept consistent by the planner: duration is in
-- working days of the project calendar; 0 = milestone.
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  parent_id        uuid references public.tasks (id) on delete cascade,
  position         int not null default 0,
  wbs_code         text not null default '' check (length(wbs_code) <= 40),
  name             text not null check (length(trim(name)) between 1 and 300),
  start_date       date not null,
  end_date         date not null,
  duration         int not null default 1 check (duration >= 0 and duration <= 3650),
  progress         numeric(5,2) not null default 0 check (progress between 0 and 100),
  progress_source  public.progress_source not null default 'manual',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz,
  constraint tasks_dates_chk check (end_date >= start_date)
);
create index if not exists tasks_company_idx on public.tasks (company_id);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_parent_idx on public.tasks (parent_id, position);
select public.setup_table('tasks', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant,client_viewer}', '{owner,admin,project_manager}');
select public.add_same_project_check('tasks', 'tasks', 'parent_id');

create table if not exists public.task_dependencies (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  predecessor_id   uuid not null references public.tasks (id) on delete cascade,
  successor_id     uuid not null references public.tasks (id) on delete cascade,
  type             public.dependency_type not null default 'FS',
  lag_days         int not null default 0 check (lag_days between -3650 and 3650),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz,
  constraint task_dependencies_not_self check (predecessor_id <> successor_id)
);
create index if not exists task_dependencies_company_idx on public.task_dependencies (company_id);
create index if not exists task_dependencies_project_idx on public.task_dependencies (project_id);
create index if not exists task_dependencies_pred_idx on public.task_dependencies (predecessor_id);
create index if not exists task_dependencies_succ_idx on public.task_dependencies (successor_id);
create unique index if not exists task_dependencies_unique_live
  on public.task_dependencies (predecessor_id, successor_id) where deleted_at is null;
select public.setup_table('task_dependencies', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant,client_viewer}', '{owner,admin,project_manager}');
select public.add_same_project_check('task_dependencies', 'tasks', 'predecessor_id');
select public.add_same_project_check('task_dependencies', 'tasks', 'successor_id');

-- Refuse dependency cycles (the critical path needs a DAG).
create or replace function public.tg_task_dependency_no_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;
  if exists (
    with recursive chain(id) as (
      select d.successor_id from public.task_dependencies d
       where d.predecessor_id = new.successor_id and d.deleted_at is null and d.id <> new.id
      union
      select d.successor_id from public.task_dependencies d join chain c on d.predecessor_id = c.id
       where d.deleted_at is null and d.id <> new.id
    )
    select 1 from chain where id = new.predecessor_id
  ) then
    raise exception 'dependency cycle' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists task_dependencies_no_cycle on public.task_dependencies;
create trigger task_dependencies_no_cycle before insert or update on public.task_dependencies
  for each row execute function public.tg_task_dependency_no_cycle();

-- Task ↔ BoQ item: site progress on the item drives task progress.
create table if not exists public.task_boq_links (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete cascade,
  boq_item_id  uuid not null references public.boq_items (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
create index if not exists task_boq_links_company_idx on public.task_boq_links (company_id);
create index if not exists task_boq_links_project_idx on public.task_boq_links (project_id);
create index if not exists task_boq_links_task_idx on public.task_boq_links (task_id);
create index if not exists task_boq_links_item_idx on public.task_boq_links (boq_item_id);
create unique index if not exists task_boq_links_unique_live on public.task_boq_links (task_id, boq_item_id) where deleted_at is null;
select public.setup_table('task_boq_links', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager}');
select public.add_same_project_check('task_boq_links', 'tasks', 'task_id');
select public.add_same_project_check('task_boq_links', 'boq_items', 'boq_item_id');

-- ---------------------------------------------------------------------------
-- baselines (+ frozen task dates)
-- ---------------------------------------------------------------------------
create table if not exists public.baselines (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 200),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
create index if not exists baselines_company_idx on public.baselines (company_id);
create index if not exists baselines_project_idx on public.baselines (project_id);
create unique index if not exists baselines_one_active on public.baselines (project_id) where is_active and deleted_at is null;
select public.setup_table('baselines', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant,client_viewer}', '{owner,admin,project_manager}');

create table if not exists public.baseline_tasks (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  baseline_id  uuid not null references public.baselines (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  duration     int not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
create index if not exists baseline_tasks_company_idx on public.baseline_tasks (company_id);
create index if not exists baseline_tasks_project_idx on public.baseline_tasks (project_id);
create index if not exists baseline_tasks_baseline_idx on public.baseline_tasks (baseline_id, task_id);
select public.setup_table('baseline_tasks', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant,client_viewer}', '{owner,admin,project_manager}', false);

create or replace function public.create_baseline(p_project_id uuid, p_name text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.has_project_role(p_project_id, array['owner','admin','project_manager']::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.baselines set is_active = false where project_id = p_project_id and is_active;
  insert into public.baselines (project_id, name, is_active) values (p_project_id, coalesce(nullif(trim(p_name), ''), 'Baseline'), true)
  returning id into v_id;
  insert into public.baseline_tasks (project_id, baseline_id, task_id, start_date, end_date, duration)
  select t.project_id, v_id, t.id, t.start_date, t.end_date, t.duration
  from public.tasks t where t.project_id = p_project_id and t.deleted_at is null;
  return v_id;
end;
$$;

-- Batch save of dates computed by the scheduler, and of the task tree order.
create or replace function public.save_task_schedule(p_project_id uuid, p_rows jsonb)
returns int
language plpgsql
set search_path = ''
as $$
declare
  n int;
begin
  update public.tasks t
     set start_date = (r ->> 'start_date')::date,
         end_date = (r ->> 'end_date')::date,
         duration = coalesce((r ->> 'duration')::int, t.duration),
         wbs_code = coalesce(r ->> 'wbs_code', t.wbs_code),
         position = coalesce((r ->> 'position')::int, t.position)
    from jsonb_array_elements(p_rows) r
   where t.id = (r ->> 'id')::uuid and t.project_id = p_project_id
     and (t.start_date, t.end_date, t.duration, t.wbs_code, t.position) is distinct from (
          (r ->> 'start_date')::date, (r ->> 'end_date')::date, coalesce((r ->> 'duration')::int, t.duration),
          coalesce(r ->> 'wbs_code', t.wbs_code), coalesce((r ->> 'position')::int, t.position));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.create_baseline(uuid, text) from public, anon;
revoke all on function public.save_task_schedule(uuid, jsonb) from public, anon;
grant execute on function public.create_baseline(uuid, text) to authenticated;
grant execute on function public.save_task_schedule(uuid, jsonb) to authenticated;

-- Deleting a summary task deletes its subtasks and their links.
create or replace function public.tg_tasks_soft_delete_children()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.tasks set deleted_at = new.deleted_at where parent_id = new.id and deleted_at is null;
    update public.task_dependencies set deleted_at = new.deleted_at
     where (predecessor_id = new.id or successor_id = new.id) and deleted_at is null;
  end if;
  return null;
end;
$$;
drop trigger if exists tasks_soft_delete_children on public.tasks;
create trigger tasks_soft_delete_children after update of deleted_at on public.tasks
  for each row execute function public.tg_tasks_soft_delete_children();
