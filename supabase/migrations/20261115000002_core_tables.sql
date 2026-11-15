-- Tiir · Phase 0 · 0002 — tenancy and people
-- Every table: uuid pk, created_at, updated_at, created_by, deleted_at (soft delete).

-- ---------------------------------------------------------------------------
-- companies (the tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) between 1 and 200),
  legal_name       text,
  tax_id           text,
  country          public.country_code not null default 'DJ',
  address          text,
  city             text,
  phone            text,
  email            text,
  logo_path        text,
  default_language public.app_language not null default 'fr',
  default_currency public.currency_code not null default 'DJF',
  timezone         text not null default 'Africa/Djibouti',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
select public.attach_standard_triggers('public.companies');

-- ---------------------------------------------------------------------------
-- profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text,
  full_name       text not null default '',
  phone           text,
  language        public.app_language,           -- null → company default
  theme           public.theme_mode not null default 'light',
  last_company_id uuid references public.companies (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at      timestamptz
);
select public.attach_standard_triggers('public.profiles');
create index if not exists profiles_last_company_idx on public.profiles (last_company_id);

-- ---------------------------------------------------------------------------
-- company_members (role per company)
-- ---------------------------------------------------------------------------
create table if not exists public.company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.app_role not null,
  status      public.member_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
select public.attach_standard_triggers('public.company_members');
create index if not exists company_members_company_idx on public.company_members (company_id);
create index if not exists company_members_user_idx on public.company_members (user_id);
create unique index if not exists company_members_unique_live
  on public.company_members (company_id, user_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- company_invitations (pending invites by email)
-- ---------------------------------------------------------------------------
create table if not exists public.company_invitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  email        extensions.citext not null,
  role         public.app_role not null,
  project_ids  uuid[] not null default '{}',
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null default now() + interval '14 days',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
select public.attach_standard_triggers('public.company_invitations');
create index if not exists company_invitations_company_idx on public.company_invitations (company_id);
create index if not exists company_invitations_email_idx on public.company_invitations (email);
create unique index if not exists company_invitations_unique_pending
  on public.company_invitations (company_id, email)
  where deleted_at is null and accepted_at is null;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 200),
  contact_name  text,
  email         text,
  phone         text,
  address       text,
  tax_id        text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
select public.attach_standard_triggers('public.clients');
create index if not exists clients_company_idx on public.clients (company_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  client_id    uuid references public.clients (id) on delete set null,
  code         text not null check (length(trim(code)) between 1 and 40),
  name         text not null check (length(trim(name)) between 1 and 200),
  description  text,
  site_address text,
  city         text,
  country      public.country_code not null default 'DJ',
  currency     public.currency_code not null,
  status       public.project_status not null default 'draft',
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz,
  constraint projects_dates_chk check (end_date is null or start_date is null or end_date >= start_date)
);
select public.attach_standard_triggers('public.projects');
create index if not exists projects_company_idx on public.projects (company_id);
create index if not exists projects_client_idx on public.projects (client_id);
create unique index if not exists projects_code_unique_live
  on public.projects (company_id, lower(code)) where deleted_at is null;

-- The currency of a project is fixed once the project exists (amounts depend on it).
create or replace function public.tg_projects_lock_currency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency <> old.currency then
    raise exception 'project currency cannot be changed' using errcode = 'check_violation';
  end if;
  if new.company_id <> old.company_id then
    raise exception 'project company cannot be changed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists projects_lock_currency on public.projects;
create trigger projects_lock_currency before update on public.projects
  for each row execute function public.tg_projects_lock_currency();

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
create table if not exists public.project_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
select public.attach_standard_triggers('public.project_members');
create index if not exists project_members_company_idx on public.project_members (company_id);
create index if not exists project_members_project_idx on public.project_members (project_id);
create index if not exists project_members_user_idx on public.project_members (user_id);
create unique index if not exists project_members_unique_live
  on public.project_members (project_id, user_id) where deleted_at is null;

-- company_id on project_members must match the project's company.
create or replace function public.tg_project_child_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
begin
  select p.company_id into v_company from public.projects p where p.id = new.project_id;
  if v_company is null then
    raise exception 'unknown project' using errcode = 'foreign_key_violation';
  end if;
  new.company_id := v_company;
  return new;
end;
$$;
drop trigger if exists project_members_company on public.project_members;
create trigger project_members_company before insert or update on public.project_members
  for each row execute function public.tg_project_child_company();

-- ---------------------------------------------------------------------------
-- company_settings (one row per company) — rates are settings, never constants
-- ---------------------------------------------------------------------------
create table if not exists public.company_settings (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 uuid not null unique references public.companies (id) on delete cascade,
  vat_rate                   numeric(6,3) not null default 0 check (vat_rate between 0 and 100),
  retention_rate             numeric(6,3) not null default 0 check (retention_rate between 0 and 100),
  advance_recovery_rate      numeric(6,3) not null default 0 check (advance_recovery_rate between 0 and 100),
  price_coefficient          numeric(8,4) not null default 1 check (price_coefficient > 0),
  overtime_multiplier        numeric(6,3) not null default 1 check (overtime_multiplier > 0),
  working_hours_per_day      numeric(5,2) not null default 8 check (working_hours_per_day > 0),
  low_stock_alerts           boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  created_by                 uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at                 timestamptz
);
select public.attach_standard_triggers('public.company_settings');
create index if not exists company_settings_company_idx on public.company_settings (company_id);

-- ---------------------------------------------------------------------------
-- project_settings (one row per project; copied from company defaults)
-- ---------------------------------------------------------------------------
create table if not exists public.project_settings (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 uuid not null references public.companies (id) on delete cascade,
  project_id                 uuid not null unique references public.projects (id) on delete cascade,
  vat_rate                   numeric(6,3) not null default 0 check (vat_rate between 0 and 100),
  retention_rate             numeric(6,3) not null default 0 check (retention_rate between 0 and 100),
  retention_cap_rate         numeric(6,3) check (retention_cap_rate between 0 and 100),
  advance_amount             numeric(18,2) not null default 0 check (advance_amount >= 0),
  advance_recovery_rate      numeric(6,3) not null default 0 check (advance_recovery_rate between 0 and 100),
  price_coefficient          numeric(8,4) not null default 1 check (price_coefficient > 0),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  created_by                 uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at                 timestamptz
);
select public.attach_standard_triggers('public.project_settings');
create index if not exists project_settings_company_idx on public.project_settings (company_id);
create index if not exists project_settings_project_idx on public.project_settings (project_id);
drop trigger if exists project_settings_company on public.project_settings;
create trigger project_settings_company before insert or update on public.project_settings
  for each row execute function public.tg_project_child_company();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null,                 -- i18n key suffix, e.g. 'invitation_accepted'
  payload     jsonb not null default '{}'::jsonb,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
select public.attach_standard_triggers('public.notifications');
create index if not exists notifications_company_idx on public.notifications (company_id);
create index if not exists notifications_project_idx on public.notifications (project_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read_at);

-- ---------------------------------------------------------------------------
-- audit_log (append-only, written by triggers)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete set null,
  table_name  text not null,
  record_id   uuid,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
create index if not exists audit_log_company_idx on public.audit_log (company_id, created_at desc);
create index if not exists audit_log_project_idx on public.audit_log (project_id);
create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id);

create or replace function public.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_action text := tg_op;
  v_company uuid;
begin
  if tg_op = 'UPDATE' then
    if (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null then
      v_action := 'SOFT_DELETE';
    elsif (v_old ->> 'deleted_at') is not null and (v_new ->> 'deleted_at') is null then
      v_action := 'RESTORE';
    end if;
  end if;
  v_company := case when tg_table_name = 'companies' then (v_row ->> 'id')::uuid
                    else (v_row ->> 'company_id')::uuid end;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, old_data, new_data, created_by)
  values (
    v_company,
    case when tg_table_name = 'projects' then (v_row ->> 'id')::uuid else (v_row ->> 'project_id')::uuid end,
    tg_table_name,
    (v_row ->> 'id')::uuid,
    v_action,
    v_old,
    v_new,
    auth.uid()
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['companies','company_members','company_invitations','clients','projects',
                           'project_members','company_settings','project_settings']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_audit()', t || '_audit', t);
  end loop;
end $$;
