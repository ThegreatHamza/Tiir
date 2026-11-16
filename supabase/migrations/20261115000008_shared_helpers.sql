-- Tiir · 0008 — shared helpers used by the operational modules (Phases 2–9)

-- ---------------------------------------------------------------------------
-- setup_table: one call gives a table the standard Tiir treatment:
--   standard triggers (updated_at, created_by), audit trigger, RLS enabled,
--   no hard delete, anon locked out, and select/insert/update policies.
--   p_scope = 'company' → access by company role
--   p_scope = 'project' → project access AND company role; company_id is
--                          derived from project_id by trigger.
-- Role lists are Postgres array literals, e.g. '{owner,admin,accountant}'.
-- ---------------------------------------------------------------------------
-- Creates a policy, or changes it in place when it already exists (re-runs).
create or replace function public.put_policy(p_table text, p_name text, p_cmd text, p_using text, p_check text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_rest text := coalesce(' using (' || p_using || ')', '') || coalesce(' with check (' || p_check || ')', '');
begin
  if exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = p_table and policyname = p_name) then
    execute format('alter policy %I on public.%I', p_name, p_table) || v_rest;
  else
    execute format('create policy %I on public.%I for %s to authenticated', p_name, p_table, p_cmd) || v_rest;
  end if;
end;
$$;
revoke all on function public.put_policy(text, text, text, text, text) from public, anon, authenticated;

create or replace function public.setup_table(
  p_table text,
  p_scope text,
  p_read_roles text,
  p_write_roles text,
  p_audit boolean default true
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t text := format('public.%I', p_table);
  read_expr text;
  write_expr text;
begin
  perform public.attach_standard_triggers(t::regclass);
  if p_audit then
    execute format('create or replace trigger %I after insert or update or delete on %s for each row execute function public.tg_audit()', p_table || '_audit', t);
  end if;

  execute format('alter table %s enable row level security', t);
  execute format('revoke all on %s from anon', t);
  execute format('revoke delete, truncate on %s from authenticated', t);

  if p_scope = 'project' then
    execute format('create or replace trigger %I before insert or update on %s for each row execute function public.tg_project_child_company()', p_table || '_company', t);
    read_expr := format('public.has_project_access(project_id) and public.has_company_role(company_id, %L::public.app_role[])', p_read_roles);
    write_expr := format('public.has_project_access(project_id) and public.has_company_role(company_id, %L::public.app_role[])', p_write_roles);
  elsif p_scope = 'company' then
    read_expr := format('public.has_company_role(company_id, %L::public.app_role[])', p_read_roles);
    write_expr := format('public.has_company_role(company_id, %L::public.app_role[])', p_write_roles);
  else
    raise exception 'unknown scope %', p_scope;
  end if;

  perform public.put_policy(p_table, p_table || '_select', 'select', read_expr, null);
  perform public.put_policy(p_table, p_table || '_insert', 'insert', null, write_expr);
  perform public.put_policy(p_table, p_table || '_update', 'update', write_expr, write_expr);
end;
$$;
revoke all on function public.setup_table(text, text, text, text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- tg_same_project(parent_table, fk_column): a child row must point at a
-- parent of the same project (or company for company-scoped parents).
-- ---------------------------------------------------------------------------
create or replace function public.tg_same_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
  v_col text := coalesce(tg_argv[2], 'project_id');
  v_found uuid;
begin
  if v_parent is null then
    return new;
  end if;
  execute format('select %I from public.%I where id = $1', v_col, tg_argv[0]) into v_found using v_parent;
  if v_found is null or v_found <> (to_jsonb(new) ->> v_col)::uuid then
    raise exception '% does not belong to the same %', tg_argv[1], v_col using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.add_same_project_check(p_table text, p_parent text, p_fk text, p_col text default 'project_id')
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('create or replace trigger %I before insert or update of %I on public.%I for each row execute function public.tg_same_project(%L, %L, %L)',
                 p_table || '_' || p_fk || '_same', p_fk, p_table, p_parent, p_fk, p_col);
end;
$$;
revoke all on function public.add_same_project_check(text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Offline sync: last write wins, decided by the time the user made the edit
-- on the device (client_updated_at), not by when the phone came back online.
-- An older edit arriving late is ignored; the app reads the row back and
-- tells the user their entry was overwritten.
-- ---------------------------------------------------------------------------
create or replace function public.tg_last_write_wins()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.client_updated_at is not null and new.client_updated_at is not null
     and new.client_updated_at < old.client_updated_at then
    return null;
  end if;
  return new;
end;
$$;

create or replace function public.add_last_write_wins(p_table text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table public.%I add column if not exists client_updated_at timestamptz', p_table);
  execute format('create or replace trigger %I before update on public.%I for each row execute function public.tg_last_write_wins()', p_table || '_a_lww', p_table);
end;
$$;
revoke all on function public.add_last_write_wins(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Price library without prices, for site roles (stock, daily reports).
-- ---------------------------------------------------------------------------
create or replace view public.resources_site
with (security_barrier = true) as
select r.id, r.company_id, r.code, r.name, r.kind, r.unit
from public.price_resources r
where r.deleted_at is null
  and public.is_company_member(r.company_id)
  and not public.has_company_role(r.company_id, array['client_viewer']::public.app_role[]);
revoke all on public.resources_site from anon;
grant select on public.resources_site to authenticated;

-- ---------------------------------------------------------------------------
-- BoQ item lineage: a copied item keeps the id of the item it came from, so
-- site progress and claims follow the work across BoQ versions.
-- ---------------------------------------------------------------------------
alter table public.boq_items add column if not exists origin_id uuid;
update public.boq_items set origin_id = id where origin_id is null;
create index if not exists boq_items_origin_idx on public.boq_items (origin_id);

create or replace function public.tg_boq_item_origin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origin_id is null then
    new.origin_id := new.id;
  end if;
  return new;
end;
$$;
create or replace trigger boq_items_origin before insert on public.boq_items
  for each row execute function public.tg_boq_item_origin();

-- Copy keeps lineage (redefines the Phase 1 function with origin_id).
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

  -- Copy ids are derived from (old id, new version), so parents and children
  -- map to each other without a lookup table.
  insert into public.boq_sections (id, version_id, code, title, position)
  select md5(s.id::text || v_id::text)::uuid, v_id, s.code, s.title, s.position
  from public.boq_sections s where s.version_id = p_source_id and s.deleted_at is null;

  insert into public.unit_price_analyses (id, version_id, code, title, unit, coefficient, notes)
  select md5(a.id::text || v_id::text)::uuid, v_id, a.code, a.title, a.unit, a.coefficient, a.notes
  from public.unit_price_analyses a where a.version_id = p_source_id and a.deleted_at is null;

  insert into public.unit_price_components (version_id, upa_id, resource_id, kind, designation, unit, quantity, unit_cost, waste_rate, position)
  select v_id, md5(c.upa_id::text || v_id::text)::uuid, c.resource_id, c.kind, c.designation, c.unit, c.quantity, c.unit_cost, c.waste_rate, c.position
  from public.unit_price_components c
  join public.unit_price_analyses a on a.id = c.upa_id and a.deleted_at is null
  where c.version_id = p_source_id and c.deleted_at is null;

  insert into public.boq_items (id, version_id, section_id, upa_id, position, code, description, unit, quantity_source, quantity, unit_cost, unit_price, notes, origin_id)
  select md5(i.id::text || v_id::text)::uuid, v_id, md5(i.section_id::text || v_id::text)::uuid,
         case when a.id is not null then md5(a.id::text || v_id::text)::uuid end,
         i.position, i.code, i.description, i.unit, i.quantity_source, i.quantity, i.unit_cost, i.unit_price, i.notes, coalesce(i.origin_id, i.id)
  from public.boq_items i
  join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
  left join public.unit_price_analyses a on a.id = i.upa_id and a.deleted_at is null
  where i.version_id = p_source_id and i.deleted_at is null;

  insert into public.takeoff_lines (version_id, item_id, position, label, count, length, width, height)
  select v_id, md5(l.item_id::text || v_id::text)::uuid, l.position, l.label, l.count, l.length, l.width, l.height
  from public.takeoff_lines l
  join public.boq_items i on i.id = l.item_id and i.deleted_at is null
  join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
  where l.version_id = p_source_id and l.deleted_at is null;

  return v_id;
end;
$$;

-- Site view exposes the lineage too.
create or replace view public.boq_items_site
with (security_barrier = true) as
select
  i.id, i.company_id, i.project_id, i.version_id, i.section_id, i.position, i.code, i.description, i.unit,
  case when i.quantity_source = 'takeoff'
       then coalesce((select sum(l.result) from public.takeoff_lines l where l.item_id = i.id and l.deleted_at is null), 0)
       else i.quantity end as quantity,
  i.origin_id
from public.boq_items i
join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
where i.deleted_at is null
  and public.has_project_access(i.project_id)
  and not public.has_company_role(i.company_id, array['client_viewer']::public.app_role[]);

-- Current BoQ version of each project (no prices), used by site screens.
create or replace view public.current_boq_items_site
with (security_barrier = true) as
select i.*
from public.boq_items_site i
join public.boq_versions v on v.id = i.version_id and v.is_current and v.deleted_at is null;
revoke all on public.current_boq_items_site from anon;
grant select on public.current_boq_items_site to authenticated;

-- ---------------------------------------------------------------------------
-- New settings used by later modules (still settings, never constants).
-- ---------------------------------------------------------------------------
alter table public.company_settings add column if not exists fuel_unit_cost numeric(18,2) not null default 0 check (fuel_unit_cost >= 0);
alter table public.company_settings add column if not exists maintenance_alert_days int not null default 7 check (maintenance_alert_days between 0 and 90);
