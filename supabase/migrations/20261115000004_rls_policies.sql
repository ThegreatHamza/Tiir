-- Tiir · Phase 0 · 0004 — Row Level Security
-- RLS is enabled on every table. No table has a DELETE policy: rows are
-- soft-deleted by setting deleted_at. Hard deletes are revoked from clients.

alter table public.companies            enable row level security;
alter table public.profiles             enable row level security;
alter table public.company_members      enable row level security;
alter table public.company_invitations  enable row level security;
alter table public.clients              enable row level security;
alter table public.projects             enable row level security;
alter table public.project_members      enable row level security;
alter table public.company_settings     enable row level security;
alter table public.project_settings     enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_log            enable row level security;

-- Anonymous users get nothing from the public schema.
revoke all on all tables in schema public from anon;
-- Clients never hard-delete; audit_log is written by triggers only.
revoke delete, truncate on all tables in schema public from authenticated;
revoke insert, update on public.audit_log from authenticated;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (public.is_company_member(id));

-- Created only through public.create_company() (security definer).
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to authenticated
  using (public.has_company_role(id, array['owner','admin']::public.app_role[]))
  with check (public.has_company_role(id, array['owner','admin']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_company_with(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (last_company_id is null or public.is_company_member(last_company_id))
  );

-- ---------------------------------------------------------------------------
-- company_members
-- ---------------------------------------------------------------------------
drop policy if exists company_members_select on public.company_members;
create policy company_members_select on public.company_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_company_role(company_id,
         array['owner','admin','project_manager','estimator','site_foreman','storekeeper','accountant']::public.app_role[])
  );

drop policy if exists company_members_insert on public.company_members;
create policy company_members_insert on public.company_members
  for insert to authenticated
  with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

drop policy if exists company_members_update on public.company_members;
create policy company_members_update on public.company_members
  for update to authenticated
  using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

-- Guard: only owners grant/alter owner or admin; nobody edits their own role;
-- a company always keeps at least one active owner.
-- Runs as the invoker on purpose: current_user is 'authenticated' for API
-- calls and the function owner inside trusted security-definer RPCs.
create or replace function public.tg_company_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_caller_role public.app_role;
  v_remaining int;
begin
  -- Trusted server code (security definer functions, service role) is not restricted here.
  if current_user not in ('authenticated', 'anon') then
    null; -- trusted server code: only the last-owner rule below applies
  else
    select m.role into v_caller_role
    from public.company_members m
    where m.company_id = new.company_id and m.user_id = auth.uid()
      and m.deleted_at is null and m.status = 'active';

    if tg_op = 'UPDATE' and old.user_id = auth.uid()
       and (new.role <> old.role or new.status <> old.status or new.deleted_at is distinct from old.deleted_at) then
      raise exception 'you cannot change your own membership' using errcode = 'insufficient_privilege';
    end if;

    if v_caller_role is distinct from 'owner' then
      if new.role in ('owner', 'admin') or (tg_op = 'UPDATE' and old.role in ('owner', 'admin')) then
        raise exception 'only an owner can manage owners and admins' using errcode = 'insufficient_privilege';
      end if;
    end if;

    if tg_op = 'UPDATE' and (new.company_id <> old.company_id or new.user_id <> old.user_id) then
      raise exception 'membership company and user are fixed' using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner'
     and (new.role <> 'owner' or new.status <> 'active' or new.deleted_at is not null) then
    select count(*) into v_remaining
    from public.company_members m
    where m.company_id = old.company_id and m.role = 'owner'
      and m.status = 'active' and m.deleted_at is null and m.id <> old.id;
    if v_remaining = 0 then
      raise exception 'a company must keep at least one owner' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
create or replace trigger company_members_guard before insert or update on public.company_members
  for each row execute function public.tg_company_members_guard();

-- ---------------------------------------------------------------------------
-- company_invitations (owners and admins)
-- ---------------------------------------------------------------------------
drop policy if exists company_invitations_select on public.company_invitations;
create policy company_invitations_select on public.company_invitations
  for select to authenticated
  using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

drop policy if exists company_invitations_update on public.company_invitations;
create policy company_invitations_update on public.company_invitations
  for update to authenticated
  using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
-- Inserts go through public.create_invitation() which validates role rules.

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (public.has_company_role(company_id,
           array['owner','admin','project_manager','estimator','accountant']::public.app_role[]));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.has_company_role(company_id,
           array['owner','admin','project_manager','estimator','accountant']::public.app_role[]));

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (public.has_company_role(company_id,
           array['owner','admin','project_manager','estimator','accountant']::public.app_role[]))
  with check (public.has_company_role(company_id,
           array['owner','admin','project_manager','estimator','accountant']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (public.has_project_access(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.has_company_role(company_id,
           array['owner','admin','project_manager']::public.app_role[]));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (
    public.has_company_role(company_id, array['owner','admin']::public.app_role[])
    or (public.has_project_access(id)
        and public.has_company_role(company_id, array['project_manager']::public.app_role[]))
  )
  with check (
    public.has_company_role(company_id, array['owner','admin']::public.app_role[])
    or (public.has_project_access(id)
        and public.has_company_role(company_id, array['project_manager']::public.app_role[]))
  );

-- The creator is assigned to the project and its settings are copied from
-- the company defaults.
create or replace function public.tg_projects_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    insert into public.project_members (company_id, project_id, user_id, created_by)
    values (new.company_id, new.id, auth.uid(), auth.uid())
    on conflict do nothing;
  end if;

  insert into public.project_settings
    (company_id, project_id, vat_rate, retention_rate, advance_recovery_rate, price_coefficient, created_by)
  select new.company_id, new.id, s.vat_rate, s.retention_rate, s.advance_recovery_rate, s.price_coefficient, auth.uid()
  from public.company_settings s
  where s.company_id = new.company_id
  union all
  select new.company_id, new.id, 0, 0, 0, 1, auth.uid()
  where not exists (select 1 from public.company_settings s where s.company_id = new.company_id)
  on conflict (project_id) do nothing;

  return null;
end;
$$;
create or replace trigger projects_after_insert after insert on public.projects
  for each row execute function public.tg_projects_after_insert();

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or (public.has_project_access(project_id)
        and not public.has_company_role(company_id, array['client_viewer']::public.app_role[]))
  );

drop policy if exists project_members_insert on public.project_members;
create policy project_members_insert on public.project_members
  for insert to authenticated
  with check (
    (public.has_company_role(company_id, array['owner','admin']::public.app_role[])
     or (public.has_project_access(project_id)
         and public.has_company_role(company_id, array['project_manager']::public.app_role[])))
    -- the assigned user must belong to the company
    and exists (select 1 from public.company_members m
                where m.company_id = project_members.company_id
                  and m.user_id = project_members.user_id
                  and m.deleted_at is null)
  );

drop policy if exists project_members_update on public.project_members;
create policy project_members_update on public.project_members
  for update to authenticated
  using (
    public.has_company_role(company_id, array['owner','admin']::public.app_role[])
    or (public.has_project_access(project_id)
        and public.has_company_role(company_id, array['project_manager']::public.app_role[]))
  )
  with check (
    public.has_company_role(company_id, array['owner','admin']::public.app_role[])
    or (public.has_project_access(project_id)
        and public.has_company_role(company_id, array['project_manager']::public.app_role[]))
  );

-- ---------------------------------------------------------------------------
-- company_settings
-- ---------------------------------------------------------------------------
drop policy if exists company_settings_select on public.company_settings;
create policy company_settings_select on public.company_settings
  for select to authenticated
  using (public.can_see_costs(company_id));

drop policy if exists company_settings_update on public.company_settings;
create policy company_settings_update on public.company_settings
  for update to authenticated
  using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- project_settings (financial rates: hidden from foremen, storekeepers, clients)
-- ---------------------------------------------------------------------------
drop policy if exists project_settings_select on public.project_settings;
create policy project_settings_select on public.project_settings
  for select to authenticated
  using (public.has_project_access(project_id) and public.can_see_costs(company_id));

drop policy if exists project_settings_update on public.project_settings;
create policy project_settings_update on public.project_settings
  for update to authenticated
  using (
    public.has_project_access(project_id)
    and public.has_company_role(company_id, array['owner','admin','project_manager','accountant']::public.app_role[])
  )
  with check (
    public.has_project_access(project_id)
    and public.has_company_role(company_id, array['owner','admin','project_manager','accountant']::public.app_role[])
  );

-- ---------------------------------------------------------------------------
-- notifications (own only)
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid() and public.is_company_member(company_id));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- audit_log (owners and admins read; triggers write)
-- ---------------------------------------------------------------------------
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
