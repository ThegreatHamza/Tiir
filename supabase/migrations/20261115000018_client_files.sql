-- Client viewers: storage access limited to shared documents and photos.
create or replace function public.can_read_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.storage_company_id(p_name);
  v_scope   text := split_part(p_name, '/', 2);
  v_project uuid := public.storage_project_id(p_name);
  v_module  text := public.storage_module(p_name);
begin
  if v_company is null or v_module = '' then
    return false;
  end if;
  if v_scope = '_company' then
    -- Company-level files: branding is visible to all members; finance and
    -- payroll only to owners, admins and accountants.
    if v_module in ('payroll', 'finance') then
      return public.can_see_finance(v_company);
    end if;
    return public.is_company_member(v_company);
  end if;
  if v_project is null then
    return false;
  end if;
  -- Client viewers only reach files the contractor shared with them.
  if public.has_company_role(v_company, array['client_viewer']::public.app_role[]) then
    return public.has_project_access(v_project) and (
      exists (select 1 from public.documents d where d.file_path = p_name and d.shared_with_client and d.deleted_at is null)
      or exists (select 1 from public.photos ph where ph.storage_path = p_name and ph.shared_with_client and ph.deleted_at is null));
  end if;
  if not exists (select 1 from public.projects p where p.id = v_project and p.company_id = v_company) then
    return false;
  end if;
  if v_module in ('payroll', 'finance') then
    return public.can_see_finance(v_company) and public.has_project_access(v_project);
  end if;
  return public.has_project_access(v_project);
end;
$$;

-- Claim lines with their BoQ wording, for the client portal (clients cannot
-- read the BoQ itself) and cost roles. Draft claims stay internal.
create or replace view public.progress_claim_lines_client
with (security_barrier = true) as
select l.id, l.company_id, l.project_id, l.claim_id, i.code, i.description, i.unit, i.position,
       l.previous_quantity, l.cumulative_quantity, l.unit_price
from public.progress_claim_lines l
join public.progress_claims c on c.id = l.claim_id and c.deleted_at is null and c.status <> 'draft'
join public.boq_items i on i.id = l.boq_item_id
where l.deleted_at is null
  and public.has_project_access(l.project_id)
  and public.has_company_role(l.company_id, '{client_viewer,owner,admin,project_manager,accountant,estimator}'::public.app_role[]);
revoke all on public.progress_claim_lines_client from anon;
grant select on public.progress_claim_lines_client to authenticated;
