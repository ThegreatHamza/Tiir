-- Tiir · Phase 9 · 0016 — Dashboards and client portal

-- Physical progress of a project: completion of the current BoQ weighted by
-- item value. Returns only a percentage, so clients and site roles may call it.
create or replace function public.project_physical_progress(p_project_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select i.origin_id,
           (case when i.quantity_source = 'takeoff'
                 then coalesce((select sum(l.result) from public.takeoff_lines l where l.item_id = i.id and l.deleted_at is null), 0)
                 else i.quantity end) as qty,
           coalesce(i.unit_price, case when i.upa_id is not null then u.selling_price else i.unit_cost * v.coefficient end, 0) as price
    from public.boq_items i
    join public.boq_sections s on s.id = i.section_id and s.deleted_at is null
    join public.boq_versions v on v.id = i.version_id and v.is_current and v.deleted_at is null
    left join public.upa_values u on u.id = i.upa_id
    where i.project_id = p_project_id and i.deleted_at is null
  ), done as (
    select it.qty, it.price,
           least(coalesce((select sum(e.quantity) from public.progress_entries e join public.boq_items x on x.id = e.boq_item_id
                           where x.origin_id = it.origin_id and e.deleted_at is null), 0), it.qty) as done_qty
    from items it
  )
  select case when not public.has_project_access(p_project_id) then null
              when sum(qty * price) > 0 then round(sum(done_qty * price) / sum(qty * price) * 100, 2)
              when sum(qty) > 0 then round(avg(case when qty > 0 then done_qty / qty else 0 end) * 100, 2)
              else 0 end
  from done;
$$;
revoke all on function public.project_physical_progress(uuid) from public, anon;
grant execute on function public.project_physical_progress(uuid) to authenticated;

-- Money summary per project (cost roles only: every source view is security_invoker).
create or replace view public.project_financials
with (security_invoker = true) as
select
  p.id as project_id,
  p.company_id,
  p.code,
  p.name,
  p.status,
  p.currency,
  p.start_date,
  p.end_date,
  coalesce(t.total_ht, 0) as contract_total,
  coalesce(t.total_dry_cost, 0) as budget_cost,
  coalesce((select sum(c.amount) from public.project_cost_entries c where c.project_id = p.id), 0) as actual_cost,
  coalesce((select sum(iv.total_dry_cost * coalesce(pr.percent_complete, 0) / 100)
            from public.boq_item_values iv
            join public.boq_versions v on v.id = iv.version_id and v.is_current
            left join public.boq_item_progress pr on pr.boq_item_id = iv.id
            where iv.project_id = p.id), 0) as earned_value,
  coalesce((select sum(cv.net_payable) from public.progress_claim_values cv where cv.project_id = p.id and cv.status in ('approved', 'paid')), 0) as claimed_net,
  coalesce((select sum(cp.amount) from public.client_payments cp where cp.project_id = p.id and cp.deleted_at is null), 0) as received
from public.projects p
left join lateral (
  select vt.total_ht, vt.total_dry_cost from public.boq_version_totals vt
  join public.boq_versions v on v.id = vt.version_id and v.is_current
  where vt.project_id = p.id limit 1
) t on true
where p.deleted_at is null and public.can_see_costs(p.company_id);
revoke all on public.project_financials from anon;
grant select on public.project_financials to authenticated;

-- What a client sees about a project: progress and dates, no costs.
create or replace view public.client_project_overview
with (security_barrier = true) as
select
  p.id as project_id,
  p.company_id,
  p.code,
  p.name,
  p.status,
  p.start_date,
  p.end_date,
  p.city,
  public.project_physical_progress(p.id) as progress,
  (select count(*) from public.photos ph where ph.project_id = p.id and ph.shared_with_client and ph.deleted_at is null)::int as shared_photos,
  (select count(*) from public.documents d where d.project_id = p.id and d.shared_with_client and d.deleted_at is null)::int as shared_documents,
  (select count(*) from public.progress_claims c where c.project_id = p.id and c.status = 'submitted' and c.deleted_at is null)::int as claims_to_approve,
  (select max(r.report_date) from public.daily_reports r where r.project_id = p.id and r.deleted_at is null) as last_report_date
from public.projects p
where p.deleted_at is null and public.has_project_access(p.id);
revoke all on public.client_project_overview from anon;
grant select on public.client_project_overview to authenticated;
