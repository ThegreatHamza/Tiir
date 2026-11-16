-- Tiir · Phase 4 · 0011 — Cost control and billing
-- Suppliers, expenses, progress claims (situations de travaux) with client
-- approval, client payments, subcontracts. Actual costs are gathered in the
-- project_cost_entries view, which later phases extend (deliveries, labour,
-- equipment). Amounts are always computed, never stored twice.

do $$ begin
  create type public.expense_category as enum ('materials', 'labour', 'equipment', 'subcontract', 'transport', 'fuel', 'site_overheads', 'fees', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.claim_status as enum ('draft', 'submitted', 'approved', 'rejected', 'paid');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.supplier_kind as enum ('supplier', 'subcontractor', 'both');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.subcontract_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.subclaim_status as enum ('submitted', 'approved', 'rejected', 'paid');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- suppliers (company register, also used by procurement)
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 200),
  kind          public.supplier_kind not null default 'supplier',
  contact_name  text,
  phone         text,
  email         text,
  address       text,
  tax_id        text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists suppliers_company_idx on public.suppliers (company_id);
select public.setup_table('suppliers', 'company',
  '{owner,admin,project_manager,estimator,storekeeper,accountant}', '{owner,admin,project_manager,accountant,storekeeper}');

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  expense_date  date not null,
  category      public.expense_category not null default 'other',
  boq_item_id   uuid references public.boq_items (id) on delete set null,
  supplier_id   uuid references public.suppliers (id) on delete set null,
  description   text not null check (length(trim(description)) between 1 and 500),
  amount        numeric(18,2) not null check (amount >= 0),
  receipt_path  text,
  reference     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists expenses_company_idx on public.expenses (company_id);
create index if not exists expenses_project_idx on public.expenses (project_id, expense_date);
create index if not exists expenses_item_idx on public.expenses (boq_item_id);
create index if not exists expenses_supplier_idx on public.expenses (supplier_id);
select public.setup_table('expenses', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}');
select public.add_same_project_check('expenses', 'boq_items', 'boq_item_id');
select public.add_same_project_check('expenses', 'suppliers', 'supplier_id', 'company_id');

-- ---------------------------------------------------------------------------
-- progress claims
-- ---------------------------------------------------------------------------
create table if not exists public.progress_claims (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies (id) on delete cascade,
  project_id             uuid not null references public.projects (id) on delete cascade,
  number                 int not null check (number > 0),
  period_start           date,
  period_end             date not null,
  status                 public.claim_status not null default 'draft',
  retention_rate         numeric(6,3) not null default 0 check (retention_rate between 0 and 100),
  advance_recovery_rate  numeric(6,3) not null default 0 check (advance_recovery_rate between 0 and 100),
  vat_rate               numeric(6,3) not null default 0 check (vat_rate between 0 and 100),
  submitted_at           timestamptz,
  decided_at             timestamptz,
  decided_by             uuid references auth.users (id) on delete set null,
  client_comment         text,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at             timestamptz
);
create index if not exists progress_claims_company_idx on public.progress_claims (company_id);
create index if not exists progress_claims_project_idx on public.progress_claims (project_id, number);
create unique index if not exists progress_claims_number_live on public.progress_claims (project_id, number) where deleted_at is null;
select public.setup_table('progress_claims', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}');

create table if not exists public.progress_claim_lines (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete cascade,
  project_id           uuid not null references public.projects (id) on delete cascade,
  claim_id             uuid not null references public.progress_claims (id) on delete cascade,
  boq_item_id          uuid not null references public.boq_items (id) on delete restrict,
  cumulative_quantity  numeric(18,3) not null default 0 check (cumulative_quantity >= 0),
  previous_quantity    numeric(18,3) not null default 0 check (previous_quantity >= 0),
  unit_price           numeric(18,2) not null default 0 check (unit_price >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at           timestamptz
);
create index if not exists pcl_company_idx on public.progress_claim_lines (company_id);
create index if not exists pcl_project_idx on public.progress_claim_lines (project_id);
create index if not exists pcl_claim_idx on public.progress_claim_lines (claim_id);
create index if not exists pcl_item_idx on public.progress_claim_lines (boq_item_id);
select public.setup_table('progress_claim_lines', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}', false);
select public.add_same_project_check('progress_claim_lines', 'progress_claims', 'claim_id');
select public.add_same_project_check('progress_claim_lines', 'boq_items', 'boq_item_id');

-- A claim can only be edited as a draft; status moves forward only.
create or replace function public.tg_claim_lines_locked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.progress_claims c where c.id = new.claim_id and c.status <> 'draft') then
    raise exception 'claim is locked' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create or replace trigger progress_claim_lines_locked before insert or update on public.progress_claim_lines
  for each row execute function public.tg_claim_lines_locked();

create or replace function public.tg_claim_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' and (new.period_end <> old.period_end or new.retention_rate <> old.retention_rate
       or new.advance_recovery_rate <> old.advance_recovery_rate or new.vat_rate <> old.vat_rate or new.number <> old.number) then
    raise exception 'claim is locked' using errcode = 'check_violation';
  end if;
  if new.status <> old.status and not (
       (old.status = 'draft' and new.status = 'submitted') or
       (old.status = 'submitted' and new.status in ('approved', 'rejected', 'draft')) or
       (old.status = 'rejected' and new.status = 'draft') or
       (old.status = 'approved' and new.status = 'paid')) then
    raise exception 'invalid claim status change' using errcode = 'check_violation';
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;
create or replace trigger progress_claims_guard before update on public.progress_claims
  for each row execute function public.tg_claim_guard();

-- Client viewers see submitted and decided claims of their projects.
drop policy if exists progress_claims_select_client on public.progress_claims;
create policy progress_claims_select_client on public.progress_claims for select to authenticated
  using (status in ('submitted', 'approved', 'rejected', 'paid') and deleted_at is null
         and public.has_project_access(project_id) and public.has_company_role(company_id, '{client_viewer}'::public.app_role[]));
drop policy if exists progress_claim_lines_select_client on public.progress_claim_lines;
create policy progress_claim_lines_select_client on public.progress_claim_lines for select to authenticated
  using (public.has_project_access(project_id) and public.has_company_role(company_id, '{client_viewer}'::public.app_role[])
         and exists (select 1 from public.progress_claims c where c.id = claim_id and c.status in ('submitted', 'approved', 'rejected', 'paid')));

-- Contract value = selling total of the current BoQ version (no money leaves the function except for claims).
create or replace function public.project_contract_total(p_project_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(public.round_money(
           (case when i.quantity_source = 'takeoff'
                 then coalesce((select sum(l.result) from public.takeoff_lines l where l.item_id = i.id and l.deleted_at is null), 0)
                 else i.quantity end)
           * coalesce(i.unit_price,
                      case when i.upa_id is not null then u.selling_price else public.round_money(i.unit_cost * v.coefficient, p.currency) end, 0),
           p.currency)), 0)
  from public.boq_items i
  join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
  join public.boq_versions v on v.id = i.version_id and v.is_current and v.deleted_at is null
  join public.projects p on p.id = i.project_id
  left join public.upa_values u on u.id = i.upa_id
  where i.project_id = p_project_id and i.deleted_at is null;
$$;
revoke all on function public.project_contract_total(uuid) from public, anon;

-- Amounts of every claim of a project, in claim order. Mirrors claimAmounts()
-- in src/lib/calc/billing.ts. Retention stops at the cap; advance recovery
-- stops when the advance is repaid. Rejected claims do not count.
create or replace function public.progress_claim_amounts(p_project_id uuid)
returns table (
  claim_id uuid,
  gross_cumulative numeric,
  previous_cumulative numeric,
  this_period numeric,
  retention numeric,
  advance_recovery numeric,
  vat numeric,
  net_payable numeric,
  retention_to_date numeric,
  advance_recovered_to_date numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c record;
  v_currency public.currency_code;
  v_cap numeric;
  v_advance numeric;
  v_retained numeric := 0;
  v_recovered numeric := 0;
  v_gross numeric;
  v_prev numeric;
  v_period numeric;
  v_ret numeric;
  v_adv numeric;
  v_vat numeric;
begin
  if not public.has_project_access(p_project_id) then
    return;
  end if;
  select p.currency into v_currency from public.projects p where p.id = p_project_id;
  select case when ps.retention_cap_rate is null then null
              else public.round_money(public.project_contract_total(p_project_id) * ps.retention_cap_rate / 100, v_currency) end,
         coalesce(ps.advance_amount, 0)
    into v_cap, v_advance
    from public.project_settings ps where ps.project_id = p_project_id;

  for c in
    select pc.* from public.progress_claims pc
    where pc.project_id = p_project_id and pc.deleted_at is null
    order by pc.number
  loop
    select coalesce(sum(public.round_money(l.cumulative_quantity * l.unit_price, v_currency)), 0),
           coalesce(sum(public.round_money(l.previous_quantity * l.unit_price, v_currency)), 0)
      into v_gross, v_prev
      from public.progress_claim_lines l where l.claim_id = c.id and l.deleted_at is null;
    v_period := v_gross - v_prev;
    v_ret := public.round_money(v_period * c.retention_rate / 100, v_currency);
    if v_cap is not null then
      v_ret := greatest(0, least(v_ret, v_cap - v_retained));
    end if;
    v_adv := greatest(0, least(public.round_money(v_period * c.advance_recovery_rate / 100, v_currency), v_advance - v_recovered));
    v_vat := public.round_money(v_period * c.vat_rate / 100, v_currency);
    if c.status <> 'rejected' then
      v_retained := v_retained + v_ret;
      v_recovered := v_recovered + v_adv;
    end if;
    claim_id := c.id;
    gross_cumulative := v_gross;
    previous_cumulative := v_prev;
    this_period := v_period;
    retention := v_ret;
    advance_recovery := v_adv;
    vat := v_vat;
    net_payable := v_period - v_ret - v_adv + v_vat;
    retention_to_date := v_retained;
    advance_recovered_to_date := v_recovered;
    return next;
  end loop;
end;
$$;
revoke all on function public.progress_claim_amounts(uuid) from public, anon;
grant execute on function public.progress_claim_amounts(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- client payments
-- ---------------------------------------------------------------------------
create table if not exists public.client_payments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  claim_id      uuid references public.progress_claims (id) on delete set null,
  payment_date  date not null,
  amount        numeric(18,2) not null check (amount > 0),
  method        text,
  reference     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at    timestamptz
);
create index if not exists client_payments_company_idx on public.client_payments (company_id);
create index if not exists client_payments_project_idx on public.client_payments (project_id, payment_date);
create index if not exists client_payments_claim_idx on public.client_payments (claim_id);
select public.setup_table('client_payments', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,accountant}');
select public.add_same_project_check('client_payments', 'progress_claims', 'claim_id');

create or replace view public.progress_claim_values
with (security_invoker = true) as
select c.*, p.currency, a.gross_cumulative, a.previous_cumulative, a.this_period, a.retention, a.advance_recovery, a.vat, a.net_payable,
       a.retention_to_date, a.advance_recovered_to_date,
       coalesce((select sum(cp.amount) from public.client_payments cp where cp.claim_id = c.id and cp.deleted_at is null), 0) as paid_amount
from public.progress_claims c
join public.projects p on p.id = c.project_id
cross join lateral public.progress_claim_amounts(c.project_id) a
where a.claim_id = c.id and c.deleted_at is null;

revoke all on public.progress_claim_values from anon;
grant select on public.progress_claim_values to authenticated;

-- New claim for a period: cumulative quantities from site progress up to the
-- period end, previous quantities and prices carried from the last claim,
-- rates from project settings.
create or replace function public.create_progress_claim(p_project_id uuid, p_period_end date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_number int;
  v_prev uuid;
  v_prev_end date;
  ps public.project_settings;
begin
  if not public.has_project_role(p_project_id, '{owner,admin,project_manager,accountant}'::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.progress_claims where project_id = p_project_id and status = 'draft' and deleted_at is null) then
    raise exception 'a draft claim already exists' using errcode = 'unique_violation';
  end if;
  select coalesce(max(number), 0) + 1 into v_number from public.progress_claims where project_id = p_project_id and deleted_at is null;
  select id, period_end into v_prev, v_prev_end from public.progress_claims
   where project_id = p_project_id and deleted_at is null and status <> 'rejected'
   order by number desc limit 1;
  select * into ps from public.project_settings where project_id = p_project_id;

  insert into public.progress_claims (project_id, number, period_start, period_end, retention_rate, advance_recovery_rate, vat_rate)
  values (p_project_id, v_number, coalesce(v_prev_end + 1, (select start_date from public.projects where id = p_project_id)), p_period_end,
          coalesce(ps.retention_rate, 0), coalesce(ps.advance_recovery_rate, 0), coalesce(ps.vat_rate, 0))
  returning id into v_id;

  insert into public.progress_claim_lines (project_id, claim_id, boq_item_id, cumulative_quantity, previous_quantity, unit_price)
  select p_project_id, v_id, iv.id,
         greatest(coalesce((select sum(e.quantity) from public.progress_entries e join public.boq_items x on x.id = e.boq_item_id
                             where coalesce(x.origin_id, x.id) = coalesce(bi.origin_id, bi.id) and e.deleted_at is null
                               and e.entry_date <= p_period_end), 0), 0),
         coalesce((select l.cumulative_quantity from public.progress_claim_lines l join public.boq_items x on x.id = l.boq_item_id
                    where l.claim_id = v_prev and coalesce(x.origin_id, x.id) = coalesce(bi.origin_id, bi.id) and l.deleted_at is null limit 1), 0),
         coalesce(iv.effective_unit_price, 0)
  from public.boq_item_values iv
  join public.boq_items bi on bi.id = iv.id
  join public.boq_versions v on v.id = iv.version_id and v.is_current
  where iv.project_id = p_project_id and iv.deleted_at is null;
  return v_id;
end;
$$;

-- Client (or owner/admin on the client's behalf) approves or rejects a submitted claim.
create or replace function public.decide_progress_claim(p_claim_id uuid, p_approve boolean, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.progress_claims;
begin
  select * into c from public.progress_claims where id = p_claim_id and deleted_at is null;
  if c.id is null or not public.has_project_access(c.project_id)
     or not public.has_company_role(c.company_id, '{client_viewer,owner,admin}'::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if c.status <> 'submitted' then
    raise exception 'claim is not awaiting approval' using errcode = 'check_violation';
  end if;
  update public.progress_claims
     set status = case when p_approve then 'approved'::public.claim_status else 'rejected'::public.claim_status end,
         decided_at = now(), decided_by = auth.uid(), client_comment = nullif(trim(coalesce(p_comment, '')), '')
   where id = p_claim_id;
  insert into public.notifications (company_id, project_id, user_id, kind, payload, link, created_by)
  select c.company_id, c.project_id, m.user_id, case when p_approve then 'claim_approved' else 'claim_rejected' end,
         jsonb_build_object('number', c.number), '/projects/' || c.project_id || '/billing/claims/' || c.id, auth.uid()
  from public.company_members m
  where m.company_id = c.company_id and m.deleted_at is null and m.role in ('owner', 'admin', 'accountant', 'project_manager');
end;
$$;

revoke all on function public.create_progress_claim(uuid, date) from public, anon;
revoke all on function public.decide_progress_claim(uuid, boolean, text) from public, anon;
grant execute on function public.create_progress_claim(uuid, date) to authenticated;
grant execute on function public.decide_progress_claim(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- subcontracts
-- ---------------------------------------------------------------------------
create table if not exists public.subcontracts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  supplier_id     uuid references public.suppliers (id) on delete set null,
  title           text not null check (length(trim(title)) between 1 and 200),
  scope           text,
  amount          numeric(18,2) not null default 0 check (amount >= 0),
  retention_rate  numeric(6,3) not null default 0 check (retention_rate between 0 and 100),
  start_date      date,
  end_date        date,
  status          public.subcontract_status not null default 'active',
  boq_item_id     uuid references public.boq_items (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at      timestamptz
);
create index if not exists subcontracts_company_idx on public.subcontracts (company_id);
create index if not exists subcontracts_project_idx on public.subcontracts (project_id);
create index if not exists subcontracts_supplier_idx on public.subcontracts (supplier_id);
select public.setup_table('subcontracts', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}');
select public.add_same_project_check('subcontracts', 'suppliers', 'supplier_id', 'company_id');
select public.add_same_project_check('subcontracts', 'boq_items', 'boq_item_id');

create table if not exists public.subcontractor_claims (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  subcontract_id  uuid not null references public.subcontracts (id) on delete cascade,
  number          int not null default 1 check (number > 0),
  claim_date      date not null,
  amount          numeric(18,2) not null check (amount >= 0),
  status          public.subclaim_status not null default 'submitted',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  deleted_at      timestamptz
);
create index if not exists subclaims_company_idx on public.subcontractor_claims (company_id);
create index if not exists subclaims_project_idx on public.subcontractor_claims (project_id);
create index if not exists subclaims_sub_idx on public.subcontractor_claims (subcontract_id);
select public.setup_table('subcontractor_claims', 'project', '{owner,admin,project_manager,estimator,accountant}', '{owner,admin,project_manager,accountant}');
select public.add_same_project_check('subcontractor_claims', 'subcontracts', 'subcontract_id');

create or replace view public.subcontract_values
with (security_invoker = true) as
select s.*, coalesce(sup.name, '') as supplier_name,
  coalesce((select sum(c.amount) from public.subcontractor_claims c where c.subcontract_id = s.id and c.deleted_at is null and c.status in ('approved', 'paid')), 0) as claimed_amount,
  coalesce((select sum(c.amount) from public.subcontractor_claims c where c.subcontract_id = s.id and c.deleted_at is null and c.status = 'paid'), 0) as paid_amount
from public.subcontracts s
left join public.suppliers sup on sup.id = s.supplier_id;
revoke all on public.subcontract_values from anon;
grant select on public.subcontract_values to authenticated;

-- ---------------------------------------------------------------------------
-- Actual costs. Extended by procurement (0012), labour (0013), equipment (0014).
-- ---------------------------------------------------------------------------
create or replace view public.project_cost_entries
with (security_invoker = true) as
select e.company_id, e.project_id, e.expense_date as entry_date, e.category::text as category, e.boq_item_id,
       e.amount::numeric as amount, 'expense'::text as source, e.id as source_id, e.description
from public.expenses e where e.deleted_at is null
union all
select c.company_id, c.project_id, c.claim_date, 'subcontract', s.boq_item_id, c.amount::numeric, 'subcontract', c.id, s.title
from public.subcontractor_claims c join public.subcontracts s on s.id = c.subcontract_id
where c.deleted_at is null and c.status in ('approved', 'paid');
revoke all on public.project_cost_entries from anon;
grant select on public.project_cost_entries to authenticated;
