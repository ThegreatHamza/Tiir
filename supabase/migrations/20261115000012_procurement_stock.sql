-- Tiir · Phase 5 · 0012 — Procurement and stock
-- Purchase request → approval → purchase order → delivery receipt (checked
-- against the order) → stock movement. Storekeepers never see order prices:
-- they read *_site views.

do $$ begin
  create type public.pr_status as enum ('draft', 'submitted', 'approved', 'rejected', 'ordered');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.po_status as enum ('draft', 'sent', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.movement_kind as enum ('in', 'out', 'transfer', 'adjustment');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Purchase requests (no prices)
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  number        int not null default 1,
  title         text not null check (length(trim(title)) between 1 and 200),
  needed_by     date,
  status        public.pr_status not null default 'draft',
  decided_by    uuid references auth.users (id) on delete set null,
  decided_at    timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists purchase_requests_company_idx on public.purchase_requests (company_id);
create index if not exists purchase_requests_project_idx on public.purchase_requests (project_id, status);
select public.setup_table('purchase_requests', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman,storekeeper}');

create table if not exists public.purchase_request_lines (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete cascade,
  project_id           uuid not null references public.projects (id) on delete cascade,
  purchase_request_id  uuid not null references public.purchase_requests (id) on delete cascade,
  resource_id          uuid references public.price_resources (id) on delete set null,
  description          text not null check (length(trim(description)) between 1 and 300),
  unit                 public.unit_code not null default 'u',
  quantity             numeric(18,3) not null check (quantity > 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at           timestamptz
);
create index if not exists prl_company_idx on public.purchase_request_lines (company_id);
create index if not exists prl_project_idx on public.purchase_request_lines (project_id);
create index if not exists prl_request_idx on public.purchase_request_lines (purchase_request_id);
select public.setup_table('purchase_request_lines', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant}', '{owner,admin,project_manager,site_foreman,storekeeper}', false);
select public.add_same_project_check('purchase_request_lines', 'purchase_requests', 'purchase_request_id');

-- Only owners, admins and project managers approve requests.
create or replace function public.tg_pr_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected')
     and not public.has_company_role(new.company_id, '{owner,admin,project_manager}'::public.app_role[])
     and current_user in ('authenticated', 'anon') then
    raise exception 'only a project manager can approve' using errcode = 'insufficient_privilege';
  end if;
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists purchase_requests_approval on public.purchase_requests;
create trigger purchase_requests_approval before update on public.purchase_requests
  for each row execute function public.tg_pr_approval();

-- ---------------------------------------------------------------------------
-- Purchase orders (prices: cost roles only)
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete cascade,
  project_id           uuid not null references public.projects (id) on delete cascade,
  number               int not null default 1,
  supplier_id          uuid references public.suppliers (id) on delete set null,
  purchase_request_id  uuid references public.purchase_requests (id) on delete set null,
  order_date           date not null,
  expected_date        date,
  status               public.po_status not null default 'draft',
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at           timestamptz
);
create index if not exists purchase_orders_company_idx on public.purchase_orders (company_id);
create index if not exists purchase_orders_project_idx on public.purchase_orders (project_id, status);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id);
create unique index if not exists purchase_orders_number_live on public.purchase_orders (project_id, number) where deleted_at is null;
select public.setup_table('purchase_orders', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}');
select public.add_same_project_check('purchase_orders', 'suppliers', 'supplier_id', 'company_id');
select public.add_same_project_check('purchase_orders', 'purchase_requests', 'purchase_request_id');

create table if not exists public.purchase_order_lines (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  purchase_order_id   uuid not null references public.purchase_orders (id) on delete cascade,
  resource_id         uuid references public.price_resources (id) on delete set null,
  boq_item_id         uuid references public.boq_items (id) on delete set null,
  description         text not null check (length(trim(description)) between 1 and 300),
  unit                public.unit_code not null default 'u',
  quantity            numeric(18,3) not null check (quantity > 0),
  unit_price          numeric(18,2) not null default 0 check (unit_price >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at          timestamptz
);
create index if not exists pol_company_idx on public.purchase_order_lines (company_id);
create index if not exists pol_project_idx on public.purchase_order_lines (project_id);
create index if not exists pol_order_idx on public.purchase_order_lines (purchase_order_id);
create index if not exists pol_item_idx on public.purchase_order_lines (boq_item_id);
select public.setup_table('purchase_order_lines', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}', false);
select public.add_same_project_check('purchase_order_lines', 'purchase_orders', 'purchase_order_id');
select public.add_same_project_check('purchase_order_lines', 'boq_items', 'boq_item_id');

-- ---------------------------------------------------------------------------
-- Stock locations (site stores)
-- ---------------------------------------------------------------------------
create table if not exists public.stock_locations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at  timestamptz
);
create index if not exists stock_locations_company_idx on public.stock_locations (company_id);
create index if not exists stock_locations_project_idx on public.stock_locations (project_id);
select public.setup_table('stock_locations', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant,estimator}', '{owner,admin,project_manager,storekeeper}');

-- ---------------------------------------------------------------------------
-- Deliveries (offline from the storekeeper's phone)
-- ---------------------------------------------------------------------------
create table if not exists public.deliveries (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  project_id         uuid not null references public.projects (id) on delete cascade,
  purchase_order_id  uuid references public.purchase_orders (id) on delete set null,
  location_id        uuid references public.stock_locations (id) on delete set null,
  delivery_date      date not null,
  delivery_note      text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at         timestamptz
);
create index if not exists deliveries_company_idx on public.deliveries (company_id);
create index if not exists deliveries_project_idx on public.deliveries (project_id, delivery_date);
create index if not exists deliveries_order_idx on public.deliveries (purchase_order_id);
select public.setup_table('deliveries', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant,estimator}', '{owner,admin,project_manager,storekeeper}');
select public.add_same_project_check('deliveries', 'purchase_orders', 'purchase_order_id');
select public.add_same_project_check('deliveries', 'stock_locations', 'location_id');
select public.add_last_write_wins('deliveries');

create table if not exists public.delivery_lines (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies (id) on delete cascade,
  project_id              uuid not null references public.projects (id) on delete cascade,
  delivery_id             uuid not null references public.deliveries (id) on delete cascade,
  purchase_order_line_id  uuid references public.purchase_order_lines (id) on delete set null,
  resource_id             uuid references public.price_resources (id) on delete set null,
  description             text not null check (length(trim(description)) between 1 and 300),
  unit                    public.unit_code not null default 'u',
  quantity_received       numeric(18,3) not null default 0 check (quantity_received >= 0),
  quantity_rejected       numeric(18,3) not null default 0 check (quantity_rejected >= 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at              timestamptz
);
create index if not exists dl_company_idx on public.delivery_lines (company_id);
create index if not exists dl_project_idx on public.delivery_lines (project_id);
create index if not exists dl_delivery_idx on public.delivery_lines (delivery_id);
create index if not exists dl_po_line_idx on public.delivery_lines (purchase_order_line_id);
select public.setup_table('delivery_lines', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant,estimator}', '{owner,admin,project_manager,storekeeper}', false);
select public.add_same_project_check('delivery_lines', 'deliveries', 'delivery_id');
select public.add_same_project_check('delivery_lines', 'purchase_order_lines', 'purchase_order_line_id');
select public.add_last_write_wins('delivery_lines');

-- ---------------------------------------------------------------------------
-- Stock movements and minimum levels
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  project_id        uuid not null references public.projects (id) on delete cascade,
  location_id       uuid not null references public.stock_locations (id) on delete cascade,
  to_location_id    uuid references public.stock_locations (id) on delete set null,
  kind              public.movement_kind not null,
  movement_date     date not null,
  resource_id       uuid references public.price_resources (id) on delete set null,
  item_name         text not null check (length(trim(item_name)) between 1 and 300),
  unit              public.unit_code not null default 'u',
  quantity          numeric(18,3) not null check (quantity <> 0),
  delivery_line_id  uuid unique references public.delivery_lines (id) on delete cascade,
  boq_item_id       uuid references public.boq_items (id) on delete set null,
  reference         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at        timestamptz,
  constraint stock_movements_transfer_chk check ((kind = 'transfer') = (to_location_id is not null)),
  constraint stock_movements_sign_chk check (kind = 'adjustment' or quantity > 0)
);
create index if not exists stock_movements_company_idx on public.stock_movements (company_id);
create index if not exists stock_movements_project_idx on public.stock_movements (project_id, movement_date);
create index if not exists stock_movements_location_idx on public.stock_movements (location_id);
create index if not exists stock_movements_to_idx on public.stock_movements (to_location_id);
select public.setup_table('stock_movements', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant,estimator}', '{owner,admin,project_manager,storekeeper}');
select public.add_same_project_check('stock_movements', 'stock_locations', 'location_id');
select public.add_same_project_check('stock_movements', 'stock_locations', 'to_location_id', 'company_id');
select public.add_last_write_wins('stock_movements');

create table if not exists public.stock_thresholds (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  location_id   uuid not null references public.stock_locations (id) on delete cascade,
  item_name     text not null check (length(trim(item_name)) between 1 and 300),
  unit          public.unit_code not null default 'u',
  min_quantity  numeric(18,3) not null check (min_quantity >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists stock_thresholds_company_idx on public.stock_thresholds (company_id);
create index if not exists stock_thresholds_project_idx on public.stock_thresholds (project_id);
create unique index if not exists stock_thresholds_unique_live on public.stock_thresholds (location_id, lower(item_name), unit) where deleted_at is null;
select public.setup_table('stock_thresholds', 'project',
  '{owner,admin,project_manager,site_foreman,storekeeper,accountant,estimator}', '{owner,admin,project_manager,storekeeper}', false);
select public.add_same_project_check('stock_thresholds', 'stock_locations', 'location_id');

-- A received delivery line puts the goods in stock (one movement per line).
create or replace function public.tg_delivery_line_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deliveries;
  v_item uuid;
begin
  select * into d from public.deliveries where id = new.delivery_id;
  if d.location_id is null then
    return null;
  end if;
  select pol.boq_item_id into v_item from public.purchase_order_lines pol where pol.id = new.purchase_order_line_id;
  if new.deleted_at is not null or new.quantity_received = 0 or d.deleted_at is not null then
    update public.stock_movements set deleted_at = coalesce(new.deleted_at, now()) where delivery_line_id = new.id and deleted_at is null;
    return null;
  end if;
  insert into public.stock_movements (company_id, project_id, location_id, kind, movement_date, resource_id, item_name, unit, quantity,
                                      delivery_line_id, boq_item_id, reference, created_by)
  values (new.company_id, new.project_id, d.location_id, 'in', d.delivery_date, new.resource_id, new.description, new.unit,
          new.quantity_received, new.id, v_item, d.delivery_note, new.created_by)
  on conflict (delivery_line_id) do update
    set quantity = excluded.quantity, item_name = excluded.item_name, unit = excluded.unit, movement_date = excluded.movement_date,
        location_id = excluded.location_id, deleted_at = null;
  return null;
end;
$$;
drop trigger if exists delivery_lines_stock on public.delivery_lines;
create trigger delivery_lines_stock after insert or update on public.delivery_lines
  for each row execute function public.tg_delivery_line_stock();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
-- Order lines with receipts, without prices (storekeepers check deliveries).
create or replace view public.purchase_order_lines_site
with (security_barrier = true) as
select l.id, l.company_id, l.project_id, l.purchase_order_id, o.number as order_number, o.status as order_status, o.order_date,
       coalesce(s.name, '') as supplier_name, l.resource_id, l.description, l.unit, l.quantity as ordered_quantity,
       coalesce(r.received, 0) as received_quantity,
       greatest(l.quantity - coalesce(r.received, 0), 0) as remaining_quantity,
       coalesce(r.received, 0) > l.quantity as over_delivered
from public.purchase_order_lines l
join public.purchase_orders o on o.id = l.purchase_order_id and o.deleted_at is null
left join public.suppliers s on s.id = o.supplier_id
left join lateral (
  select sum(dl.quantity_received) as received
  from public.delivery_lines dl join public.deliveries d on d.id = dl.delivery_id and d.deleted_at is null
  where dl.purchase_order_line_id = l.id and dl.deleted_at is null
) r on true
where l.deleted_at is null and o.status in ('sent', 'closed')
  and public.has_project_access(l.project_id)
  and public.has_company_role(l.company_id, '{owner,admin,project_manager,storekeeper,site_foreman,accountant,estimator}'::public.app_role[]);
revoke all on public.purchase_order_lines_site from anon;
grant select on public.purchase_order_lines_site to authenticated;

create or replace view public.purchase_order_values
with (security_invoker = true) as
select o.*, coalesce(s.name, '') as supplier_name, p.currency,
  coalesce((select sum(public.round_money(l.quantity * l.unit_price, p.currency)) from public.purchase_order_lines l where l.purchase_order_id = o.id and l.deleted_at is null), 0) as total_amount,
  coalesce((select sum(l.quantity) from public.purchase_order_lines l where l.purchase_order_id = o.id and l.deleted_at is null), 0) as ordered_quantity,
  coalesce((select sum(dl.quantity_received) from public.delivery_lines dl join public.purchase_order_lines l on l.id = dl.purchase_order_line_id
             join public.deliveries d on d.id = dl.delivery_id and d.deleted_at is null
            where l.purchase_order_id = o.id and dl.deleted_at is null and l.deleted_at is null), 0) as received_quantity
from public.purchase_orders o
join public.projects p on p.id = o.project_id
left join public.suppliers s on s.id = o.supplier_id;
revoke all on public.purchase_order_values from anon;
grant select on public.purchase_order_values to authenticated;

-- Balance per location and item. Transfers leave one location and enter another.
create or replace view public.stock_balances
with (security_invoker = true) as
with flows as (
  select m.company_id, m.project_id, m.location_id, m.item_name, m.unit,
         case m.kind when 'in' then m.quantity when 'adjustment' then m.quantity else -m.quantity end as qty, m.movement_date
  from public.stock_movements m where m.deleted_at is null
  union all
  select m.company_id, l.project_id, m.to_location_id, m.item_name, m.unit, m.quantity, m.movement_date
  from public.stock_movements m join public.stock_locations l on l.id = m.to_location_id
  where m.deleted_at is null and m.kind = 'transfer'
)
select f.company_id, f.project_id, f.location_id, coalesce(sl.name, '') as location_name, f.item_name, f.unit,
       sum(f.qty) as balance, max(f.movement_date) as last_movement,
       t.min_quantity,
       (t.min_quantity is not null and sum(f.qty) < t.min_quantity) as low_stock
from flows f
join public.stock_locations sl on sl.id = f.location_id and sl.deleted_at is null
left join public.stock_thresholds t on t.location_id = f.location_id and lower(t.item_name) = lower(f.item_name) and t.unit = f.unit and t.deleted_at is null
group by f.company_id, f.project_id, f.location_id, sl.name, f.item_name, f.unit, t.min_quantity;
revoke all on public.stock_balances from anon;
grant select on public.stock_balances to authenticated;

-- Actual costs now include received goods (received quantity × order price).
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
where dl.deleted_at is null;

create or replace function public.next_number(p_table text, p_project_id uuid)
returns int
language plpgsql
stable
set search_path = ''
as $$
declare
  n int;
begin
  if p_table not in ('purchase_requests', 'purchase_orders', 'rfis', 'subcontractor_claims') then
    raise exception 'unsupported';
  end if;
  execute format('select coalesce(max(number), 0) + 1 from public.%I where project_id = $1', p_table) into n using p_project_id;
  return n;
end;
$$;
revoke all on function public.next_number(text, uuid) from public, anon;
grant execute on function public.next_number(text, uuid) to authenticated;
