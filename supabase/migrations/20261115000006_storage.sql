-- Tiir · Phase 0 · 0006 — private storage
-- One private bucket. Object paths: {company_id}/{project_id | _company}/{module}/{file}
-- Access is by signed URL; policies mirror the table policies.

insert into storage.buckets (id, name, public, file_size_limit)
values ('tiir', 'tiir', false, 52428800)
on conflict (id) do update set public = false;

-- Path helpers ---------------------------------------------------------------
create or replace function public.storage_company_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$ select public.try_uuid(split_part(p_name, '/', 1)); $$;

create or replace function public.storage_project_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$ select public.try_uuid(split_part(p_name, '/', 2)); $$;

create or replace function public.storage_module(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$ select split_part(p_name, '/', 3); $$;

-- Read access to an object path.
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
  if not exists (select 1 from public.projects p where p.id = v_project and p.company_id = v_company) then
    return false;
  end if;
  if v_module in ('payroll', 'finance') then
    return public.can_see_finance(v_company) and public.has_project_access(v_project);
  end if;
  return public.has_project_access(v_project);
end;
$$;

-- Write access: same scope as read, client viewers never write, and
-- company-level files are managed by owners and admins.
create or replace function public.can_write_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.storage_company_id(p_name);
  v_scope   text := split_part(p_name, '/', 2);
begin
  if v_company is null then
    return false;
  end if;
  if public.has_company_role(v_company, array['client_viewer']::public.app_role[]) then
    return false;
  end if;
  if v_scope = '_company' then
    return public.has_company_role(v_company, array['owner','admin']::public.app_role[])
       or (public.storage_module(p_name) in ('payroll','finance') and public.can_see_finance(v_company));
  end if;
  return public.can_read_storage_path(p_name);
end;
$$;

revoke all on function public.can_read_storage_path(text) from public, anon;
revoke all on function public.can_write_storage_path(text) from public, anon;
grant execute on function public.can_read_storage_path(text) to authenticated;
grant execute on function public.can_write_storage_path(text) to authenticated;

-- Policies -------------------------------------------------------------------
drop policy if exists tiir_objects_select on storage.objects;
create policy tiir_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'tiir' and public.can_read_storage_path(name));

drop policy if exists tiir_objects_insert on storage.objects;
create policy tiir_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tiir' and public.can_write_storage_path(name));

drop policy if exists tiir_objects_update on storage.objects;
create policy tiir_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'tiir' and public.can_write_storage_path(name))
  with check (bucket_id = 'tiir' and public.can_write_storage_path(name));

-- Files are replaced or versioned, but deleting is allowed for writers so
-- that a superseded upload (e.g. an old company logo) can be cleaned up.
drop policy if exists tiir_objects_delete on storage.objects;
create policy tiir_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'tiir' and public.can_write_storage_path(name));
