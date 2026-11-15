-- Tiir · Phase 3 · 0010 — Site
-- Daily reports and their lines, progress per BoQ item, photos, incidents,
-- site issues. Every row captured on a phone carries a client-generated uuid
-- (so retries never duplicate) and client_updated_at (last write wins).

do $$ begin
  create type public.weather_kind as enum ('sunny', 'cloudy', 'windy', 'rain', 'storm', 'sandstorm', 'heat');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.report_status as enum ('draft', 'submitted');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.severity_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.issue_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.incident_kind as enum ('injury', 'near_miss', 'damage', 'theft', 'environment', 'other');
exception when duplicate_object then null; end $$;

-- Site roles: who writes reports.
-- Read: all project staff. Write: owner, admin, project_manager, site_foreman.

create table if not exists public.daily_reports (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  project_id         uuid not null references public.projects (id) on delete cascade,
  report_date        date not null,
  weather            public.weather_kind,
  temperature_c      numeric(4,1),
  summary            text not null default '',
  status             public.report_status not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at         timestamptz
);
create index if not exists daily_reports_company_idx on public.daily_reports (company_id);
create index if not exists daily_reports_project_idx on public.daily_reports (project_id, report_date desc);
create unique index if not exists daily_reports_one_per_day on public.daily_reports (project_id, report_date) where deleted_at is null;
select public.setup_table('daily_reports', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}');
select public.add_last_write_wins('daily_reports');

create table if not exists public.daily_report_labour (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  daily_report_id  uuid not null references public.daily_reports (id) on delete cascade,
  trade            text not null check (length(trim(trade)) between 1 and 80),
  headcount        int not null default 1 check (headcount between 0 and 10000),
  hours            numeric(6,2) not null default 8 check (hours between 0 and 24),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
create index if not exists drl_company_idx on public.daily_report_labour (company_id);
create index if not exists drl_project_idx on public.daily_report_labour (project_id);
create index if not exists drl_report_idx on public.daily_report_labour (daily_report_id);
select public.setup_table('daily_report_labour', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}', false);
select public.add_same_project_check('daily_report_labour', 'daily_reports', 'daily_report_id');
select public.add_last_write_wins('daily_report_labour');

create table if not exists public.daily_report_equipment (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  daily_report_id  uuid not null references public.daily_reports (id) on delete cascade,
  equipment_name   text not null check (length(trim(equipment_name)) between 1 and 120),
  hours            numeric(6,2) not null default 0 check (hours between 0 and 24),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
create index if not exists dre_company_idx on public.daily_report_equipment (company_id);
create index if not exists dre_project_idx on public.daily_report_equipment (project_id);
create index if not exists dre_report_idx on public.daily_report_equipment (daily_report_id);
select public.setup_table('daily_report_equipment', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}', false);
select public.add_same_project_check('daily_report_equipment', 'daily_reports', 'daily_report_id');
select public.add_last_write_wins('daily_report_equipment');

create table if not exists public.daily_report_materials (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  daily_report_id  uuid not null references public.daily_reports (id) on delete cascade,
  resource_id      uuid references public.price_resources (id) on delete set null,
  material_name    text not null check (length(trim(material_name)) between 1 and 200),
  quantity         numeric(18,3) not null default 0 check (quantity >= 0),
  unit             public.unit_code not null default 'u',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
create index if not exists drm_company_idx on public.daily_report_materials (company_id);
create index if not exists drm_project_idx on public.daily_report_materials (project_id);
create index if not exists drm_report_idx on public.daily_report_materials (daily_report_id);
select public.setup_table('daily_report_materials', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}', false);
select public.add_same_project_check('daily_report_materials', 'daily_reports', 'daily_report_id');
select public.add_last_write_wins('daily_report_materials');

-- Quantity done per BoQ item per date (incremental, not cumulative).
create table if not exists public.progress_entries (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  boq_item_id      uuid not null references public.boq_items (id) on delete cascade,
  daily_report_id  uuid references public.daily_reports (id) on delete set null,
  entry_date       date not null,
  quantity         numeric(18,3) not null check (quantity <> 0),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
create index if not exists progress_entries_company_idx on public.progress_entries (company_id);
create index if not exists progress_entries_project_idx on public.progress_entries (project_id, entry_date);
create index if not exists progress_entries_item_idx on public.progress_entries (boq_item_id);
create index if not exists progress_entries_report_idx on public.progress_entries (daily_report_id);
select public.setup_table('progress_entries', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}');
select public.add_same_project_check('progress_entries', 'boq_items', 'boq_item_id');
select public.add_same_project_check('progress_entries', 'daily_reports', 'daily_report_id');
select public.add_last_write_wins('progress_entries');

create table if not exists public.site_issues (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null check (length(trim(title)) between 1 and 200),
  description   text,
  location      text,
  priority      public.severity_level not null default 'medium',
  status        public.issue_status not null default 'open',
  assignee_id   uuid references auth.users (id) on delete set null,
  due_date      date,
  photo_path    text,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists site_issues_company_idx on public.site_issues (company_id);
create index if not exists site_issues_project_idx on public.site_issues (project_id, status);
create index if not exists site_issues_assignee_idx on public.site_issues (assignee_id);
select public.setup_table('site_issues', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,estimator,site_foreman,storekeeper}');
select public.add_last_write_wins('site_issues');

create table if not exists public.photos (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  daily_report_id     uuid references public.daily_reports (id) on delete set null,
  site_issue_id       uuid references public.site_issues (id) on delete set null,
  storage_path        text not null check (length(storage_path) between 1 and 500),
  caption             text,
  taken_at            timestamptz not null default now(),
  shared_with_client  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at          timestamptz
);
create index if not exists photos_company_idx on public.photos (company_id);
create index if not exists photos_project_idx on public.photos (project_id, taken_at desc);
create index if not exists photos_report_idx on public.photos (daily_report_id);
create index if not exists photos_issue_idx on public.photos (site_issue_id);
select public.setup_table('photos', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman,storekeeper}');
select public.add_same_project_check('photos', 'daily_reports', 'daily_report_id');
select public.add_same_project_check('photos', 'site_issues', 'site_issue_id');
select public.add_last_write_wins('photos');
-- Client viewers see shared photos only (Phase 9 portal).
drop policy if exists photos_select_client on public.photos;
create policy photos_select_client on public.photos for select to authenticated
  using (shared_with_client and deleted_at is null and public.has_project_access(project_id)
         and public.has_company_role(company_id, '{client_viewer}'::public.app_role[]));

create table if not exists public.incidents (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  daily_report_id  uuid references public.daily_reports (id) on delete set null,
  occurred_at      timestamptz not null default now(),
  kind             public.incident_kind not null default 'other',
  severity         public.severity_level not null default 'low',
  description      text not null check (length(trim(description)) between 1 and 4000),
  action_taken     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
create index if not exists incidents_company_idx on public.incidents (company_id);
create index if not exists incidents_project_idx on public.incidents (project_id, occurred_at desc);
create index if not exists incidents_report_idx on public.incidents (daily_report_id);
select public.setup_table('incidents', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}');
select public.add_same_project_check('incidents', 'daily_reports', 'daily_report_id');
select public.add_last_write_wins('incidents');

-- ---------------------------------------------------------------------------
-- Progress views. Quantities follow the work across BoQ versions (origin_id).
-- ---------------------------------------------------------------------------
create or replace view public.boq_item_progress
with (security_barrier = true) as
select
  i.id as boq_item_id,
  i.project_id,
  i.company_id,
  i.version_id,
  i.code,
  i.description,
  i.unit,
  i.quantity as planned_quantity,
  coalesce(p.done, 0) as done_quantity,
  case when i.quantity > 0 then round(least(coalesce(p.done, 0) / i.quantity, 1) * 100, 2) else 0 end as percent_complete,
  p.last_date
from public.boq_items_site i
left join lateral (
  select sum(e.quantity) as done, max(e.entry_date) as last_date
  from public.progress_entries e
  join public.boq_items bi on bi.id = e.boq_item_id
  where bi.origin_id = i.origin_id and e.deleted_at is null
) p on true;
revoke all on public.boq_item_progress from anon;
grant select on public.boq_item_progress to authenticated;

-- Task progress from linked BoQ items, weighted by item value (selling
-- price × quantity). Prices are used inside the view only; it returns a
-- percentage, so site roles may read it. Items without a price weigh equally.
create or replace view public.task_progress
with (security_barrier = true) as
select
  t.id as task_id,
  t.project_id,
  t.company_id,
  coalesce(round(
    case when sum(w.value) > 0
         then sum(w.value * w.ratio) / sum(w.value) * 100
         else avg(w.ratio) * 100 end, 2), 0) as progress
from public.tasks t
join lateral (
  select
    q.planned * coalesce(bi.unit_price, bi.unit_cost, 0) as value,
    case when q.planned > 0 then least(coalesce(d.done, 0) / q.planned, 1) else 0 end as ratio
  from public.task_boq_links l
  join public.boq_items bi on bi.id = l.boq_item_id
  cross join lateral (
    select case when bi.quantity_source = 'takeoff'
                then coalesce((select sum(tl.result) from public.takeoff_lines tl where tl.item_id = bi.id and tl.deleted_at is null), 0)
                else bi.quantity end as planned
  ) q
  left join lateral (
    select sum(e.quantity) as done
    from public.progress_entries e join public.boq_items x on x.id = e.boq_item_id
    where x.origin_id = bi.origin_id and e.deleted_at is null
  ) d on true
  where l.task_id = t.id and l.deleted_at is null
) w on true
where t.deleted_at is null
  and public.has_project_access(t.project_id)
group by t.id, t.project_id, t.company_id;
revoke all on public.task_progress from anon;
grant select on public.task_progress to authenticated;

-- Report summary for lists (counts, no money).
create or replace view public.daily_report_list
with (security_invoker = true) as
select
  r.*,
  (select coalesce(sum(l.headcount), 0) from public.daily_report_labour l where l.daily_report_id = r.id and l.deleted_at is null)::int as labour_count,
  (select count(*) from public.photos p where p.daily_report_id = r.id and p.deleted_at is null)::int as photo_count,
  (select count(*) from public.progress_entries e where e.daily_report_id = r.id and e.deleted_at is null)::int as progress_count,
  (select count(*) from public.incidents i where i.daily_report_id = r.id and i.deleted_at is null)::int as incident_count,
  coalesce(p.full_name, '') as author_name
from public.daily_reports r
left join public.profiles p on p.id = r.created_by;
revoke all on public.daily_report_list from anon;
grant select on public.daily_report_list to authenticated;
