-- Tiir · Phase 0 · 0003 — RLS helper functions
-- SECURITY DEFINER so they can read membership tables without recursing
-- through RLS. search_path is pinned; every reference is schema-qualified.

-- Is the current user an active member of this company?
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.companies c on c.id = m.company_id and c.deleted_at is null
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

-- Does the current user hold one of these roles in this company?
create or replace function public.has_company_role(p_company_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.companies c on c.id = m.company_id and c.deleted_at is null
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.deleted_at is null
      and m.role = any (p_roles)
  );
$$;

-- The current user's role in a company (null if not a member).
create or replace function public.current_company_role(p_company_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.company_members m
  where m.company_id = p_company_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and m.deleted_at is null
  limit 1;
$$;

-- Can the current user see this project?
-- Owners and admins: every project of their company.
-- Everyone else: only projects they are assigned to.
create or replace function public.has_project_access(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.company_members m
      on m.company_id = p.company_id
     and m.user_id = auth.uid()
     and m.status = 'active'
     and m.deleted_at is null
    join public.companies c on c.id = p.company_id and c.deleted_at is null
    where p.id = p_project_id
      and (
        m.role in ('owner', 'admin')
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
            and pm.deleted_at is null
        )
      )
  );
$$;

-- Project access AND one of the given roles.
create or replace function public.has_project_role(p_project_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_project_access(p_project_id)
     and public.has_company_role(
           (select p.company_id from public.projects p where p.id = p_project_id),
           p_roles);
$$;

-- Roles allowed to see unit prices, costs and margins.
-- Site foremen, storekeepers and client viewers never do.
create or replace function public.can_see_costs(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_company_role(
    p_company_id,
    array['owner','admin','project_manager','estimator','accountant']::public.app_role[]);
$$;

-- Only owners, admins and accountants see payroll and company-wide finance.
create or replace function public.can_see_finance(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_company_role(
    p_company_id,
    array['owner','admin','accountant']::public.app_role[]);
$$;

-- Do the current user and another user share an active company?
create or replace function public.shares_company_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members a
    join public.company_members b on b.company_id = a.company_id
    where a.user_id = auth.uid() and a.deleted_at is null and a.status = 'active'
      and b.user_id = p_user_id and b.deleted_at is null
      and a.role <> 'client_viewer'
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.has_company_role(uuid, public.app_role[]) from public;
revoke all on function public.current_company_role(uuid) from public;
revoke all on function public.has_project_access(uuid) from public;
revoke all on function public.has_project_role(uuid, public.app_role[]) from public;
revoke all on function public.can_see_costs(uuid) from public;
revoke all on function public.can_see_finance(uuid) from public;
revoke all on function public.shares_company_with(uuid) from public;

grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.has_company_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.current_company_role(uuid) to authenticated;
grant execute on function public.has_project_access(uuid) to authenticated;
grant execute on function public.has_project_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.can_see_costs(uuid) to authenticated;
grant execute on function public.can_see_finance(uuid) to authenticated;
grant execute on function public.shares_company_with(uuid) to authenticated;
