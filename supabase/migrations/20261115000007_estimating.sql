-- Tiir · Phase 1 · 0007 — Estimating
-- Price library, unit price analyses (sous-détails de prix), BoQ (DQE)
-- versions, sections, items and quantity takeoff (métré).
--
-- Rules:
--  * Totals are never stored: they come from the views at the end of this file.
--  * A BoQ version that is not 'draft' is read-only (trigger).
--  * Prices, costs and coefficients are visible only to owner, admin,
--    project_manager, estimator and accountant. Site roles read the BoQ
--    through the *_site views, which carry no money columns.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.unit_code as enum ('m', 'm2', 'm3', 'kg', 't', 'u', 'ml', 'ff', 'h', 'day', 'l');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.resource_kind as enum ('material', 'labour', 'equipment', 'subcontract');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.boq_status as enum ('draft', 'submitted', 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quantity_source as enum ('manual', 'takeoff');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Money rounding — mirrors src/lib/calc/money.ts (half away from zero).
-- DJF: whole francs. ETB, USD: 2 decimals.
-- ---------------------------------------------------------------------------
create or replace function public.currency_decimals(p_currency public.currency_code)
returns int
language sql
immutable
set search_path = ''
as $$ select case p_currency when 'DJF' then 0 else 2 end; $$;

create or replace function public.round_money(p_amount numeric, p_currency public.currency_code)
returns numeric
language sql
immutable
set search_path = ''
as $$ select round(p_amount, public.currency_decimals(p_currency)); $$;

-- ---------------------------------------------------------------------------
-- Access helpers for estimating
-- ---------------------------------------------------------------------------
create or replace function public.can_read_estimate(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_project_access(p_project_id)
     and public.can_see_costs((select p.company_id from public.projects p where p.id = p_project_id));
$$;

create or replace function public.can_edit_estimate(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_project_role(p_project_id,
    array['owner','admin','project_manager','estimator']::public.app_role[]);
$$;

revoke all on function public.can_read_estimate(uuid) from public;
revoke all on function public.can_edit_estimate(uuid) from public;
grant execute on function public.can_read_estimate(uuid) to authenticated;
grant execute on function public.can_edit_estimate(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- price_resources — company price library
-- ---------------------------------------------------------------------------
create table if not exists public.price_resources (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  code          text not null check (length(trim(code)) between 1 and 40),
  name          text not null check (length(trim(name)) between 1 and 300),
  kind          public.resource_kind not null,
  unit          public.unit_code not null,
  unit_cost     numeric(18,2) not null default 0 check (unit_cost >= 0),
  currency      public.currency_code not null,
  supplier_name text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
select public.attach_standard_triggers('public.price_resources');
create index if not exists price_resources_company_idx on public.price_resources (company_id);
create index if not exists price_resources_kind_idx on public.price_resources (company_id, kind);
create unique index if not exists price_resources_code_unique_live
  on public.price_resources (company_id, lower(code)) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- boq_versions
-- ---------------------------------------------------------------------------
create table if not exists public.boq_versions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  number        int not null check (number > 0),
  name          text not null check (length(trim(name)) between 1 and 200),
  status        public.boq_status not null default 'draft',
  is_current    boolean not null default false,
  coefficient   numeric(8,4) not null default 1 check (coefficient > 0),
  based_on_id   uuid references public.boq_versions (id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
select public.attach_standard_triggers('public.boq_versions');
create index if not exists boq_versions_company_idx on public.boq_versions (company_id);
create index if not exists boq_versions_project_idx on public.boq_versions (project_id);
create unique index if not exists boq_versions_number_unique_live
  on public.boq_versions (project_id, number) where deleted_at is null;
create unique index if not exists boq_versions_one_current
  on public.boq_versions (project_id) where is_current and deleted_at is null;
drop trigger if exists boq_versions_company on public.boq_versions;
create trigger boq_versions_company before insert or update on public.boq_versions
  for each row execute function public.tg_project_child_company();

-- A version's pricing is frozen once it leaves 'draft'.
create or replace function public.tg_boq_versions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id <> old.project_id then
    raise exception 'version project is fixed' using errcode = 'check_violation';
  end if;
  if old.status <> 'draft' and new.coefficient <> old.coefficient then
    raise exception 'boq version is locked' using errcode = 'check_violation';
  end if;
  if old.status = 'approved' and new.status <> 'approved' then
    raise exception 'an approved boq version cannot be reopened' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists boq_versions_guard on public.boq_versions;
create trigger boq_versions_guard before update on public.boq_versions
  for each row execute function public.tg_boq_versions_guard();

-- ---------------------------------------------------------------------------
-- boq_sections
-- ---------------------------------------------------------------------------
create table if not exists public.boq_sections (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  version_id  uuid not null references public.boq_versions (id) on delete cascade,
  code        text not null default '' check (length(code) <= 40),
  title       text not null check (length(trim(title)) between 1 and 300),
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
select public.attach_standard_triggers('public.boq_sections');
create index if not exists boq_sections_company_idx on public.boq_sections (company_id);
create index if not exists boq_sections_project_idx on public.boq_sections (project_id);
create index if not exists boq_sections_version_idx on public.boq_sections (version_id, position);

-- ---------------------------------------------------------------------------
-- unit_price_analyses (sous-détail de prix) — one unit of work
-- ---------------------------------------------------------------------------
create table if not exists public.unit_price_analyses (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  version_id   uuid not null references public.boq_versions (id) on delete cascade,
  code         text not null check (length(trim(code)) between 1 and 40),
  title        text not null check (length(trim(title)) between 1 and 300),
  unit         public.unit_code not null,
  coefficient  numeric(8,4) check (coefficient > 0),   -- null → version coefficient
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
select public.attach_standard_triggers('public.unit_price_analyses');
create index if not exists upa_company_idx on public.unit_price_analyses (company_id);
create index if not exists upa_project_idx on public.unit_price_analyses (project_id);
create index if not exists upa_version_idx on public.unit_price_analyses (version_id);
create unique index if not exists upa_code_unique_live
  on public.unit_price_analyses (version_id, lower(code)) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- unit_price_components — resources consumed per unit of work
-- ---------------------------------------------------------------------------
create table if not exists public.unit_price_components (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  version_id   uuid not null references public.boq_versions (id) on delete cascade,
  upa_id       uuid not null references public.unit_price_analyses (id) on delete cascade,
  resource_id  uuid references public.price_resources (id) on delete set null,
  kind         public.resource_kind not null,
  designation  text not null check (length(trim(designation)) between 1 and 300),
  unit         public.unit_code not null,
  quantity     numeric(18,4) not null default 0 check (quantity >= 0),   -- consumption per unit of work
  unit_cost    numeric(18,2) not null default 0 check (unit_cost >= 0),  -- snapshot of the resource price
  waste_rate   numeric(6,3) not null default 0 check (waste_rate between 0 and 100),
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at   timestamptz
);
select public.attach_standard_triggers('public.unit_price_components');
create index if not exists upc_company_idx on public.unit_price_components (company_id);
create index if not exists upc_project_idx on public.unit_price_components (project_id);
create index if not exists upc_upa_idx on public.unit_price_components (upa_id, position);
create index if not exists upc_resource_idx on public.unit_price_components (resource_id);

-- ---------------------------------------------------------------------------
-- boq_items
-- ---------------------------------------------------------------------------
create table if not exists public.boq_items (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  version_id       uuid not null references public.boq_versions (id) on delete cascade,
  section_id       uuid not null references public.boq_sections (id) on delete cascade,
  position         int not null default 0,
  code             text not null default '' check (length(code) <= 40),
  description      text not null check (length(trim(description)) between 1 and 2000),
  unit             public.unit_code not null,
  quantity_source  public.quantity_source not null default 'manual',
  quantity         numeric(18,3) not null default 0 check (quantity >= 0),  -- used when quantity_source = 'manual'
  unit_cost        numeric(18,2) check (unit_cost >= 0),                    -- dry cost when no analysis is linked
  unit_price       numeric(18,2) check (unit_price >= 0),                   -- optional selling price override
  upa_id           uuid references public.unit_price_analyses (id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at       timestamptz
);
select public.attach_standard_triggers('public.boq_items');
create index if not exists boq_items_company_idx on public.boq_items (company_id);
create index if not exists boq_items_project_idx on public.boq_items (project_id);
create index if not exists boq_items_version_idx on public.boq_items (version_id);
create index if not exists boq_items_section_idx on public.boq_items (section_id, position);
create index if not exists boq_items_upa_idx on public.boq_items (upa_id);

-- ---------------------------------------------------------------------------
-- takeoff_lines (métré) — item quantity = sum of results
-- ---------------------------------------------------------------------------
create table if not exists public.takeoff_lines (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  version_id  uuid not null references public.boq_versions (id) on delete cascade,
  item_id     uuid not null references public.boq_items (id) on delete cascade,
  position    int not null default 0,
  label       text not null default '' check (length(label) <= 300),
  count       numeric(18,3) not null default 1,           -- negative for deductions
  length      numeric(18,3),
  width       numeric(18,3),
  height      numeric(18,3),
  result      numeric(18,3) generated always as (
                round(count * coalesce(length, 1) * coalesce(width, 1) * coalesce(height, 1), 3)
              ) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
select public.attach_standard_triggers('public.takeoff_lines');
create index if not exists takeoff_lines_company_idx on public.takeoff_lines (company_id);
create index if not exists takeoff_lines_project_idx on public.takeoff_lines (project_id);
create index if not exists takeoff_lines_item_idx on public.takeoff_lines (item_id, position);

-- ---------------------------------------------------------------------------
-- Children of a version: inherit project/company, stay inside the version,
-- and refuse changes when the version is not 'draft'.
-- ---------------------------------------------------------------------------
create or replace function public.tg_boq_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.boq_versions;
  v_parent_version uuid;
begin
  if tg_op = 'UPDATE' and new.version_id <> old.version_id then
    raise exception 'version is fixed' using errcode = 'check_violation';
  end if;

  select * into v from public.boq_versions where id = new.version_id;
  if v.id is null then
    raise exception 'unknown boq version' using errcode = 'foreign_key_violation';
  end if;
  if v.status <> 'draft' or v.deleted_at is not null then
    raise exception 'boq version is locked' using errcode = 'check_violation';
  end if;
  new.project_id := v.project_id;
  new.company_id := v.company_id;

  -- Parents must belong to the same version.
  if tg_table_name = 'boq_items' then
    select s.version_id into v_parent_version from public.boq_sections s where s.id = new.section_id;
    if v_parent_version is distinct from new.version_id then
      raise exception 'section belongs to another version' using errcode = 'check_violation';
    end if;
    if new.upa_id is not null then
      select a.version_id into v_parent_version from public.unit_price_analyses a where a.id = new.upa_id;
      if v_parent_version is distinct from new.version_id then
        raise exception 'analysis belongs to another version' using errcode = 'check_violation';
      end if;
    end if;
  elsif tg_table_name = 'takeoff_lines' then
    select i.version_id into v_parent_version from public.boq_items i where i.id = new.item_id;
    if v_parent_version is distinct from new.version_id then
      raise exception 'item belongs to another version' using errcode = 'check_violation';
    end if;
  elsif tg_table_name = 'unit_price_components' then
    select a.version_id into v_parent_version from public.unit_price_analyses a where a.id = new.upa_id;
    if v_parent_version is distinct from new.version_id then
      raise exception 'analysis belongs to another version' using errcode = 'check_violation';
    end if;
    if new.resource_id is not null and not exists (
      select 1 from public.price_resources r where r.id = new.resource_id and r.company_id = v.company_id) then
      raise exception 'resource belongs to another company' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['boq_sections','unit_price_analyses','unit_price_components','boq_items','takeoff_lines']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_boq_child', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.tg_boq_child()', t || '_boq_child', t);
  end loop;
  foreach t in array array['price_resources','boq_versions','boq_sections','unit_price_analyses','boq_items']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_audit()', t || '_audit', t);
  end loop;
end $$;

-- Deleting an analysis keeps the items it priced: they get its dry cost as a
-- manual unit cost, so no BoQ line silently loses its price.
create or replace function public.tg_upa_soft_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_dry numeric;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    select coalesce(sum(public.round_money(c.quantity * c.unit_cost * (1 + c.waste_rate / 100), p.currency)), 0)
      into v_dry
      from public.unit_price_components c
      join public.projects p on p.id = c.project_id
     where c.upa_id = new.id and c.deleted_at is null;
    update public.boq_items set upa_id = null, unit_cost = v_dry
     where upa_id = new.id and deleted_at is null;
  end if;
  return null;
end;
$$;
drop trigger if exists upa_soft_delete on public.unit_price_analyses;
create trigger upa_soft_delete after update of deleted_at on public.unit_price_analyses
  for each row execute function public.tg_upa_soft_delete();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.price_resources        enable row level security;
alter table public.boq_versions           enable row level security;
alter table public.boq_sections           enable row level security;
alter table public.unit_price_analyses    enable row level security;
alter table public.unit_price_components  enable row level security;
alter table public.boq_items              enable row level security;
alter table public.takeoff_lines          enable row level security;

revoke all on public.price_resources, public.boq_versions, public.boq_sections, public.unit_price_analyses,
  public.unit_price_components, public.boq_items, public.takeoff_lines from anon;
revoke delete, truncate on public.price_resources, public.boq_versions, public.boq_sections, public.unit_price_analyses,
  public.unit_price_components, public.boq_items, public.takeoff_lines from authenticated;

drop policy if exists price_resources_select on public.price_resources;
create policy price_resources_select on public.price_resources
  for select to authenticated using (public.can_see_costs(company_id));
drop policy if exists price_resources_insert on public.price_resources;
create policy price_resources_insert on public.price_resources
  for insert to authenticated
  with check (public.has_company_role(company_id, array['owner','admin','project_manager','estimator']::public.app_role[]));
drop policy if exists price_resources_update on public.price_resources;
create policy price_resources_update on public.price_resources
  for update to authenticated
  using (public.has_company_role(company_id, array['owner','admin','project_manager','estimator']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','project_manager','estimator']::public.app_role[]));

do $$
declare t text;
begin
  foreach t in array array['boq_versions','boq_sections','unit_price_analyses','unit_price_components','boq_items','takeoff_lines']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_read_estimate(project_id))', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_estimate(project_id))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_estimate(project_id)) with check (public.can_edit_estimate(project_id))', t || '_update', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Value views (security_invoker → the cost-only RLS above applies)
-- ---------------------------------------------------------------------------
create or replace view public.upa_component_values
with (security_invoker = true) as
select
  c.*,
  p.currency,
  public.round_money(c.quantity * c.unit_cost * (1 + c.waste_rate / 100), p.currency) as amount
from public.unit_price_components c
join public.projects p on p.id = c.project_id
where c.deleted_at is null;

create or replace view public.upa_values
with (security_invoker = true) as
select
  a.*,
  p.currency,
  coalesce(a.coefficient, v.coefficient) as effective_coefficient,
  coalesce(c.dry_cost, 0) as dry_cost,
  public.round_money(coalesce(c.dry_cost, 0) * coalesce(a.coefficient, v.coefficient), p.currency) as selling_price,
  coalesce(c.component_count, 0)::int as component_count
from public.unit_price_analyses a
join public.boq_versions v on v.id = a.version_id
join public.projects p on p.id = a.project_id
left join lateral (
  select sum(public.round_money(x.quantity * x.unit_cost * (1 + x.waste_rate / 100), p.currency)) as dry_cost,
         count(*) as component_count
  from public.unit_price_components x
  where x.upa_id = a.id and x.deleted_at is null
) c on true
where a.deleted_at is null;

create or replace view public.boq_item_values
with (security_invoker = true) as
with base as (
  select
    i.*,
    p.currency,
    v.coefficient as version_coefficient,
    coalesce(t.qty, 0) as takeoff_quantity,
    coalesce(t.line_count, 0)::int as takeoff_line_count,
    case when i.quantity_source = 'takeoff' then coalesce(t.qty, 0) else i.quantity end as effective_quantity,
    case when i.upa_id is not null then u.dry_cost else i.unit_cost end as dry_unit_cost,
    coalesce(
      i.unit_price,
      case when i.upa_id is not null then u.selling_price
           else public.round_money(i.unit_cost * v.coefficient, p.currency) end
    ) as effective_unit_price,
    u.code as upa_code
  from public.boq_items i
  join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
  join public.boq_versions v on v.id = i.version_id
  join public.projects p on p.id = i.project_id
  left join lateral (
    select sum(l.result) as qty, count(*) as line_count
    from public.takeoff_lines l
    where l.item_id = i.id and l.deleted_at is null
  ) t on true
  left join public.upa_values u on u.id = i.upa_id
  where i.deleted_at is null
)
select
  b.*,
  public.round_money(b.effective_quantity * coalesce(b.effective_unit_price, 0), b.currency) as total_price,
  public.round_money(b.effective_quantity * coalesce(b.dry_unit_cost, 0), b.currency) as total_dry_cost
from base b;

create or replace view public.boq_section_totals
with (security_invoker = true) as
select
  s.id as section_id,
  s.version_id,
  s.project_id,
  s.company_id,
  coalesce(sum(i.total_price), 0) as total_price,
  coalesce(sum(i.total_dry_cost), 0) as total_dry_cost,
  count(i.id)::int as item_count
from public.boq_sections s
left join public.boq_item_values i on i.section_id = s.id
where s.deleted_at is null
group by s.id, s.version_id, s.project_id, s.company_id;

create or replace view public.boq_version_totals
with (security_invoker = true) as
select
  v.id as version_id,
  v.project_id,
  v.company_id,
  p.currency,
  coalesce(t.total_price, 0) as total_ht,
  coalesce(t.total_dry_cost, 0) as total_dry_cost,
  coalesce(t.total_price, 0) - coalesce(t.total_dry_cost, 0) as margin,
  coalesce(ps.vat_rate, 0) as vat_rate,
  public.round_money(coalesce(t.total_price, 0) * coalesce(ps.vat_rate, 0) / 100, p.currency) as vat_amount,
  coalesce(t.total_price, 0)
    + public.round_money(coalesce(t.total_price, 0) * coalesce(ps.vat_rate, 0) / 100, p.currency) as total_ttc,
  coalesce(t.item_count, 0)::int as item_count
from public.boq_versions v
join public.projects p on p.id = v.project_id
left join public.project_settings ps on ps.project_id = v.project_id
left join lateral (
  select sum(st.total_price) as total_price, sum(st.total_dry_cost) as total_dry_cost, sum(st.item_count) as item_count
  from public.boq_section_totals st where st.version_id = v.id
) t on true
where v.deleted_at is null;

-- ---------------------------------------------------------------------------
-- Site views: the BoQ without any money (for foremen and storekeepers).
-- Owner-privileged views with an explicit access filter; security_barrier
-- stops user predicates from running before the filter.
-- ---------------------------------------------------------------------------
create or replace view public.boq_versions_site
with (security_barrier = true) as
select v.id, v.company_id, v.project_id, v.number, v.name, v.status, v.is_current, v.created_at, v.updated_at
from public.boq_versions v
where v.deleted_at is null
  and public.has_project_access(v.project_id)
  and not public.has_company_role(v.company_id, array['client_viewer']::public.app_role[]);

create or replace view public.boq_sections_site
with (security_barrier = true) as
select s.id, s.company_id, s.project_id, s.version_id, s.code, s.title, s.position
from public.boq_sections s
where s.deleted_at is null
  and public.has_project_access(s.project_id)
  and not public.has_company_role(s.company_id, array['client_viewer']::public.app_role[]);

create or replace view public.boq_items_site
with (security_barrier = true) as
select
  i.id, i.company_id, i.project_id, i.version_id, i.section_id, i.position, i.code, i.description, i.unit,
  case when i.quantity_source = 'takeoff'
       then coalesce((select sum(l.result) from public.takeoff_lines l where l.item_id = i.id and l.deleted_at is null), 0)
       else i.quantity end as quantity
from public.boq_items i
join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
where i.deleted_at is null
  and public.has_project_access(i.project_id)
  and not public.has_company_role(i.company_id, array['client_viewer']::public.app_role[]);

revoke all on public.upa_component_values, public.upa_values, public.boq_item_values, public.boq_section_totals,
  public.boq_version_totals, public.boq_versions_site, public.boq_sections_site, public.boq_items_site from anon;
grant select on public.upa_component_values, public.upa_values, public.boq_item_values, public.boq_section_totals,
  public.boq_version_totals, public.boq_versions_site, public.boq_sections_site, public.boq_items_site to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs (security invoker: RLS and the lock trigger apply to the caller)
-- ---------------------------------------------------------------------------

-- New BoQ version, empty or as a full copy of another version of the project.
create or replace function public.create_boq_version(p_project_id uuid, p_name text, p_source_id uuid default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_number int;
  v_first boolean;
  v_coef numeric;
begin
  if not public.can_edit_estimate(p_project_id) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(max(number), 0) + 1, count(*) = 0 into v_number, v_first
  from public.boq_versions where project_id = p_project_id and deleted_at is null;

  if p_source_id is not null then
    select coefficient into v_coef from public.boq_versions
     where id = p_source_id and project_id = p_project_id and deleted_at is null;
    if not found then
      raise exception 'source version not found' using errcode = 'no_data_found';
    end if;
  else
    select price_coefficient into v_coef from public.project_settings where project_id = p_project_id;
  end if;

  insert into public.boq_versions (project_id, number, name, coefficient, is_current, based_on_id)
  values (p_project_id, v_number, coalesce(nullif(trim(p_name), ''), 'V' || v_number), coalesce(v_coef, 1), v_first, p_source_id)
  returning id into v_id;

  if p_source_id is null then
    return v_id;
  end if;

  drop table if exists pg_temp.boq_copy_map;
  create temp table boq_copy_map (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into boq_copy_map select id, gen_random_uuid() from public.boq_sections
   where version_id = p_source_id and deleted_at is null;
  insert into public.boq_sections (id, version_id, code, title, position)
  select m.new_id, v_id, s.code, s.title, s.position
  from public.boq_sections s join boq_copy_map m on m.old_id = s.id;

  insert into boq_copy_map select id, gen_random_uuid() from public.unit_price_analyses
   where version_id = p_source_id and deleted_at is null;
  insert into public.unit_price_analyses (id, version_id, code, title, unit, coefficient, notes)
  select m.new_id, v_id, a.code, a.title, a.unit, a.coefficient, a.notes
  from public.unit_price_analyses a join boq_copy_map m on m.old_id = a.id;

  insert into public.unit_price_components
    (version_id, upa_id, resource_id, kind, designation, unit, quantity, unit_cost, waste_rate, position)
  select v_id, m.new_id, c.resource_id, c.kind, c.designation, c.unit, c.quantity, c.unit_cost, c.waste_rate, c.position
  from public.unit_price_components c join boq_copy_map m on m.old_id = c.upa_id
  where c.deleted_at is null;

  insert into boq_copy_map
  select i.id, gen_random_uuid() from public.boq_items i
  join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
  where i.version_id = p_source_id and i.deleted_at is null;

  insert into public.boq_items
    (id, version_id, section_id, upa_id, position, code, description, unit, quantity_source, quantity, unit_cost, unit_price, notes)
  select mi.new_id, v_id, ms.new_id, mu.new_id, i.position, i.code, i.description, i.unit, i.quantity_source, i.quantity,
         i.unit_cost, i.unit_price, i.notes
  from public.boq_items i
  join boq_copy_map mi on mi.old_id = i.id
  join boq_copy_map ms on ms.old_id = i.section_id
  left join boq_copy_map mu on mu.old_id = i.upa_id;

  insert into public.takeoff_lines (version_id, item_id, position, label, count, length, width, height)
  select v_id, mi.new_id, l.position, l.label, l.count, l.length, l.width, l.height
  from public.takeoff_lines l join boq_copy_map mi on mi.old_id = l.item_id
  where l.deleted_at is null;

  drop table boq_copy_map;
  return v_id;
end;
$$;

create or replace function public.set_current_boq_version(p_version_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select project_id into v_project from public.boq_versions where id = p_version_id and deleted_at is null;
  if v_project is null or not public.can_edit_estimate(v_project) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.boq_versions set is_current = false where project_id = v_project and is_current and id <> p_version_id;
  update public.boq_versions set is_current = true where id = p_version_id;
end;
$$;

create or replace function public.reorder_boq_sections(p_version_id uuid, p_section_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.boq_sections s
     set position = o.ord
    from unnest(p_section_ids) with ordinality as o(id, ord)
   where s.id = o.id and s.version_id = p_version_id;
end;
$$;

-- Puts the given items, in this order, into a section (moves across sections too).
create or replace function public.reorder_boq_items(p_section_id uuid, p_item_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_version uuid;
begin
  select version_id into v_version from public.boq_sections where id = p_section_id;
  if v_version is null then
    raise exception 'section not found' using errcode = 'no_data_found';
  end if;
  update public.boq_items i
     set section_id = p_section_id, position = o.ord
    from unnest(p_item_ids) with ordinality as o(id, ord)
   where i.id = o.id and i.version_id = v_version;
end;
$$;

-- Renumbers sections 1, 2, 3… and items 1.1, 1.2… in display order.
create or replace function public.renumber_boq(p_version_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  with s as (
    select id, row_number() over (order by position, created_at) as n
    from public.boq_sections where version_id = p_version_id and deleted_at is null
  )
  update public.boq_sections x set code = s.n::text, position = s.n from s where x.id = s.id;

  with i as (
    select it.id, sec.code || '.' || row_number() over (partition by it.section_id order by it.position, it.created_at) as c,
           row_number() over (partition by it.section_id order by it.position, it.created_at) as n
    from public.boq_items it
    join public.boq_sections sec on sec.id = it.section_id
    where it.version_id = p_version_id and it.deleted_at is null
  )
  update public.boq_items x set code = i.c, position = i.n from i where x.id = i.id;
end;
$$;

-- Imports price resources (upsert by code). p_rows: [{code,name,kind,unit,unit_cost,currency,supplier_name}]
create or replace function public.import_price_resources(p_company_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r jsonb;
  v_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
begin
  if not public.has_company_role(p_company_id, array['owner','admin','project_manager','estimator']::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 20000 then
    raise exception 'invalid rows' using errcode = 'check_violation';
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    select id into v_id from public.price_resources
     where company_id = p_company_id and lower(code) = lower(trim(r ->> 'code')) and deleted_at is null;
    if v_id is null then
      insert into public.price_resources (company_id, code, name, kind, unit, unit_cost, currency, supplier_name)
      values (p_company_id, trim(r ->> 'code'), trim(r ->> 'name'), (r ->> 'kind')::public.resource_kind,
              (r ->> 'unit')::public.unit_code, (r ->> 'unit_cost')::numeric, (r ->> 'currency')::public.currency_code,
              nullif(trim(coalesce(r ->> 'supplier_name', '')), ''));
      v_inserted := v_inserted + 1;
    else
      update public.price_resources
         set name = trim(r ->> 'name'),
             kind = (r ->> 'kind')::public.resource_kind,
             unit = (r ->> 'unit')::public.unit_code,
             unit_cost = (r ->> 'unit_cost')::numeric,
             currency = (r ->> 'currency')::public.currency_code,
             supplier_name = coalesce(nullif(trim(coalesce(r ->> 'supplier_name', '')), ''), supplier_name)
       where id = v_id;
      v_updated := v_updated + 1;
    end if;
  end loop;
  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
end;
$$;

-- Refreshes component prices of an analysis from the current price library.
create or replace function public.refresh_upa_prices(p_upa_id uuid)
returns int
language plpgsql
set search_path = ''
as $$
declare
  n int;
begin
  update public.unit_price_components c
     set unit_cost = r.unit_cost
    from public.price_resources r
   where c.upa_id = p_upa_id and c.resource_id = r.id and c.deleted_at is null
     and r.deleted_at is null and c.unit_cost <> r.unit_cost;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.create_boq_version(uuid, text, uuid) from public, anon;
revoke all on function public.set_current_boq_version(uuid) from public, anon;
revoke all on function public.reorder_boq_sections(uuid, uuid[]) from public, anon;
revoke all on function public.reorder_boq_items(uuid, uuid[]) from public, anon;
revoke all on function public.renumber_boq(uuid) from public, anon;
revoke all on function public.import_price_resources(uuid, jsonb) from public, anon;
revoke all on function public.refresh_upa_prices(uuid) from public, anon;
grant execute on function public.create_boq_version(uuid, text, uuid) to authenticated;
grant execute on function public.set_current_boq_version(uuid) to authenticated;
grant execute on function public.reorder_boq_sections(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_boq_items(uuid, uuid[]) to authenticated;
grant execute on function public.renumber_boq(uuid) to authenticated;
grant execute on function public.import_price_resources(uuid, jsonb) to authenticated;
grant execute on function public.refresh_upa_prices(uuid) to authenticated;
