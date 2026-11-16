-- Sequential numbers per project (per subcontract for subcontractor claims),
-- assigned by the server on insert so two phones never pick the same number.
create or replace function public.tg_auto_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope_col text := coalesce(tg_argv[0], 'project_id');
  v_scope uuid;
begin
  v_scope := (to_jsonb(new) ->> v_scope_col)::uuid;
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || v_scope::text));
  execute format('select coalesce(max(number), 0) + 1 from public.%I where %I = $1', tg_table_name, v_scope_col)
    into new.number using v_scope;
  return new;
end;
$$;

create or replace trigger purchase_requests_number before insert on public.purchase_requests
  for each row execute function public.tg_auto_number('project_id');
create or replace trigger purchase_orders_number before insert on public.purchase_orders
  for each row execute function public.tg_auto_number('project_id');
create or replace trigger subcontractor_claims_number before insert on public.subcontractor_claims
  for each row execute function public.tg_auto_number('subcontract_id');

-- Turns an approved purchase request into a draft order (prices filled in afterwards).
create or replace function public.order_from_request(p_request_id uuid, p_supplier_id uuid default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  r public.purchase_requests;
  v_id uuid;
begin
  select * into r from public.purchase_requests where id = p_request_id and deleted_at is null;
  if r.id is null or not public.has_project_role(r.project_id, '{owner,admin,project_manager,accountant}'::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if r.status <> 'approved' then
    raise exception 'request is not approved' using errcode = 'check_violation';
  end if;
  insert into public.purchase_orders (company_id, project_id, supplier_id, purchase_request_id, order_date, expected_date, notes)
  values (r.company_id, r.project_id, p_supplier_id, r.id, (now() at time zone 'Africa/Djibouti')::date, r.needed_by, r.title)
  returning id into v_id;
  insert into public.purchase_order_lines (company_id, project_id, purchase_order_id, resource_id, description, unit, quantity, unit_price)
  select l.company_id, l.project_id, v_id, l.resource_id, l.description, l.unit, l.quantity,
         coalesce((select pr.unit_cost from public.price_resources pr where pr.id = l.resource_id), 0)
  from public.purchase_request_lines l
  where l.purchase_request_id = r.id and l.deleted_at is null;
  update public.purchase_requests set status = 'ordered' where id = r.id;
  return v_id;
end;
$$;
revoke all on function public.order_from_request(uuid, uuid) from public, anon;
grant execute on function public.order_from_request(uuid, uuid) to authenticated;
