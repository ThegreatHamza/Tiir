-- Tiir · Phase 8 · 0015 — Documents and quality
-- Documents in folders with versions, drawing revisions (current revision
-- marked), RFIs, checklist templates and inspections, safety observations.

do $$ begin
  create type public.rfi_status as enum ('open', 'answered', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.inspection_status as enum ('draft', 'passed', 'failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.safety_kind as enum ('unsafe_act', 'unsafe_condition', 'near_miss', 'good_practice');
exception when duplicate_object then null; end $$;

-- Each row is one version of a document; rows sharing document_key are the same document.
create table if not exists public.documents (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  document_key        uuid not null default gen_random_uuid(),
  folder              text not null default '' check (length(folder) <= 300),
  title               text not null check (length(trim(title)) between 1 and 300),
  version             int not null default 1 check (version > 0),
  file_path           text not null check (length(file_path) between 1 and 500),
  file_name           text not null default '',
  shared_with_client  boolean not null default false,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at          timestamptz
);
create index if not exists documents_company_idx on public.documents (company_id);
create index if not exists documents_project_idx on public.documents (project_id, folder);
create index if not exists documents_key_idx on public.documents (document_key, version desc);
create unique index if not exists documents_version_live on public.documents (document_key, version) where deleted_at is null;
select public.setup_table('documents', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,estimator,site_foreman}');
drop policy if exists documents_select_client on public.documents;
create policy documents_select_client on public.documents for select to authenticated
  using (shared_with_client and deleted_at is null and public.has_project_access(project_id)
         and public.has_company_role(company_id, '{client_viewer}'::public.app_role[]));

create or replace view public.documents_current
with (security_invoker = true) as
select d.*, (select count(*) from public.documents x where x.document_key = d.document_key and x.deleted_at is null)::int as version_count
from public.documents d
where d.deleted_at is null
  and d.version = (select max(x.version) from public.documents x where x.document_key = d.document_key and x.deleted_at is null);
revoke all on public.documents_current from anon;
grant select on public.documents_current to authenticated;

create table if not exists public.drawing_revisions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  drawing_number  text not null check (length(trim(drawing_number)) between 1 and 60),
  title           text not null check (length(trim(title)) between 1 and 300),
  discipline      text,
  revision        text not null check (length(trim(revision)) between 1 and 10),
  issued_date     date not null,
  file_path       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at      timestamptz
);
create index if not exists drawing_revisions_company_idx on public.drawing_revisions (company_id);
create index if not exists drawing_revisions_project_idx on public.drawing_revisions (project_id, drawing_number);
create unique index if not exists drawing_revisions_unique_live on public.drawing_revisions (project_id, drawing_number, revision) where deleted_at is null;
select public.setup_table('drawing_revisions', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,estimator}');

-- The latest issued revision of each drawing is the current one.
create or replace view public.drawing_revision_list
with (security_invoker = true) as
select r.*,
  r.id = (select x.id from public.drawing_revisions x
          where x.project_id = r.project_id and x.drawing_number = r.drawing_number and x.deleted_at is null
          order by x.issued_date desc, x.created_at desc limit 1) as is_current
from public.drawing_revisions r
where r.deleted_at is null;
revoke all on public.drawing_revision_list from anon;
grant select on public.drawing_revision_list to authenticated;

create table if not exists public.rfis (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  number        int not null default 1,
  subject       text not null check (length(trim(subject)) between 1 and 300),
  question      text not null check (length(trim(question)) between 1 and 8000),
  status        public.rfi_status not null default 'open',
  addressed_to  text,
  assigned_to   uuid references auth.users (id) on delete set null,
  due_date      date,
  response      text,
  responded_at  timestamptz,
  attachment_path text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists rfis_company_idx on public.rfis (company_id);
create index if not exists rfis_project_idx on public.rfis (project_id, status);
select public.setup_table('rfis', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,estimator,site_foreman}');

create or replace function public.tg_rfi_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select coalesce(max(number), 0) + 1 into new.number from public.rfis where project_id = new.project_id;
  end if;
  if new.response is not null and length(trim(new.response)) > 0 and (tg_op = 'INSERT' or old.response is distinct from new.response) then
    new.responded_at := now();
    if new.status = 'open' then new.status := 'answered'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists rfis_number on public.rfis;
create trigger rfis_number before insert or update on public.rfis
  for each row execute function public.tg_rfi_number();

create table if not exists public.checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 200),
  category    text,
  items       jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
create index if not exists checklist_templates_company_idx on public.checklist_templates (company_id);
select public.setup_table('checklist_templates', 'company',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager}');

-- results: [{ "label": "...", "result": "pass" | "fail" | "na", "note": "..." }]
create table if not exists public.inspections (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  template_id      uuid references public.checklist_templates (id) on delete set null,
  title            text not null check (length(trim(title)) between 1 and 200),
  inspection_date  date not null,
  location         text,
  results          jsonb not null default '[]'::jsonb check (jsonb_typeof(results) = 'array'),
  status           public.inspection_status not null default 'draft',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
create index if not exists inspections_company_idx on public.inspections (company_id);
create index if not exists inspections_project_idx on public.inspections (project_id, inspection_date);
select public.setup_table('inspections', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman}');
select public.add_same_project_check('inspections', 'checklist_templates', 'template_id', 'company_id');

create table if not exists public.safety_observations (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  observed_on   date not null,
  kind          public.safety_kind not null,
  severity      public.severity_level not null default 'low',
  description   text not null check (length(trim(description)) between 1 and 4000),
  action        text,
  status        public.issue_status not null default 'open',
  photo_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists safety_company_idx on public.safety_observations (company_id);
create index if not exists safety_project_idx on public.safety_observations (project_id, observed_on);
select public.setup_table('safety_observations', 'project',
  '{owner,admin,project_manager,estimator,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman,storekeeper}');
