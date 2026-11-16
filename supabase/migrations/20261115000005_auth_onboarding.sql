-- Tiir · Phase 0 · 0005 — sign-up, companies, invitations, member management

-- ---------------------------------------------------------------------------
-- Internal: create a company with its owner and default settings.
-- ---------------------------------------------------------------------------
create or replace function public._create_company_for(
  p_user_id  uuid,
  p_name     text,
  p_country  public.country_code,
  p_currency public.currency_code,
  p_language public.app_language
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'company name is required' using errcode = 'check_violation';
  end if;

  insert into public.companies (name, country, default_currency, default_language, timezone, created_by)
  values (
    trim(p_name),
    coalesce(p_country, 'DJ'),
    coalesce(p_currency, case when p_country = 'ET' then 'ETB'::public.currency_code else 'DJF'::public.currency_code end),
    coalesce(p_language, 'fr'),
    case when p_country = 'ET' then 'Africa/Addis_Ababa' else 'Africa/Djibouti' end,
    p_user_id
  )
  returning id into v_company;

  insert into public.company_members (company_id, user_id, role, created_by)
  values (v_company, p_user_id, 'owner', p_user_id);

  -- Rates start at zero: the owner sets them in Settings (see DECISIONS.md).
  insert into public.company_settings (company_id, created_by)
  values (v_company, p_user_id);

  update public.profiles set last_company_id = v_company where id = p_user_id;
  return v_company;
end;
$$;
revoke all on function public._create_company_for(uuid, text, public.country_code, public.currency_code, public.app_language) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up hook: profile + (optionally) a first company.
-- raw_user_meta_data keys: full_name, language, company_name, country, currency
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_lang public.app_language;
  v_country public.country_code;
  v_currency public.currency_code;
begin
  v_lang := case when v_meta ->> 'language' in ('fr','en','ar','so')
                 then (v_meta ->> 'language')::public.app_language end;
  v_country := case when v_meta ->> 'country' in ('DJ','ET')
                    then (v_meta ->> 'country')::public.country_code end;
  v_currency := case when v_meta ->> 'currency' in ('DJF','ETB','USD')
                     then (v_meta ->> 'currency')::public.currency_code end;

  insert into public.profiles (id, email, full_name, phone, language, created_by)
  values (new.id, new.email, coalesce(v_meta ->> 'full_name', ''), v_meta ->> 'phone', v_lang, new.id)
  on conflict (id) do nothing;

  if coalesce(trim(v_meta ->> 'company_name'), '') <> '' then
    perform public._create_company_for(new.id, v_meta ->> 'company_name', v_country, v_currency, coalesce(v_lang, 'fr'));
  end if;
  return new;
end;
$$;
create or replace trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync after an email change is confirmed.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;
create or replace trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- RPC: create another company (user becomes owner)
-- ---------------------------------------------------------------------------
create or replace function public.create_company(
  p_name     text,
  p_country  public.country_code default 'DJ',
  p_currency public.currency_code default null,
  p_language public.app_language default 'fr'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  return public._create_company_for(auth.uid(), p_name, p_country, p_currency, p_language);
end;
$$;
revoke all on function public.create_company(text, public.country_code, public.currency_code, public.app_language) from public, anon;
grant execute on function public.create_company(text, public.country_code, public.currency_code, public.app_language) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: invite a member (owner/admin). Email delivery is done by the
-- invite-member Edge Function, which calls this first with the user's JWT.
-- ---------------------------------------------------------------------------
create or replace function public.create_invitation(
  p_company_id  uuid,
  p_email       text,
  p_role        public.app_role,
  p_project_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
  v_bad int;
begin
  if not public.has_company_role(p_company_id, array['owner','admin']::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_role in ('owner','admin') and not public.has_company_role(p_company_id, array['owner']::public.app_role[]) then
    raise exception 'only an owner can invite owners and admins' using errcode = 'insufficient_privilege';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = 'check_violation';
  end if;
  select count(*) into v_bad
  from unnest(coalesce(p_project_ids, '{}')) pid
  where not exists (select 1 from public.projects p
                    where p.id = pid and p.company_id = p_company_id and p.deleted_at is null);
  if v_bad > 0 then
    raise exception 'project does not belong to company' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.company_members m join public.profiles pr on pr.id = m.user_id
             where m.company_id = p_company_id and lower(pr.email) = v_email and m.deleted_at is null) then
    raise exception 'already a member' using errcode = 'unique_violation';
  end if;

  -- Replace any pending invitation for the same email.
  update public.company_invitations
     set deleted_at = now()
   where company_id = p_company_id and email = v_email
     and accepted_at is null and deleted_at is null;

  insert into public.company_invitations (company_id, email, role, project_ids, created_by)
  values (p_company_id, v_email, p_role, coalesce(p_project_ids, '{}'), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_invitation(uuid, text, public.app_role, uuid[]) from public, anon;
grant execute on function public.create_invitation(uuid, text, public.app_role, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: invitations addressed to the signed-in user's email
-- ---------------------------------------------------------------------------
create or replace function public.my_invitations()
returns table (
  id uuid, company_id uuid, company_name text, role public.app_role,
  invited_by_name text, created_at timestamptz, expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.company_id, c.name, i.role, coalesce(p.full_name, ''), i.created_at, i.expires_at
  from public.company_invitations i
  join public.companies c on c.id = i.company_id and c.deleted_at is null
  left join public.profiles p on p.id = i.created_by
  where i.email = (select lower(u.email) from auth.users u where u.id = auth.uid())
    and i.accepted_at is null
    and i.deleted_at is null
    and i.expires_at > now()
  order by i.created_at desc;
$$;
revoke all on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: accept or decline an invitation
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.company_invitations;
  v_email text;
  v_existing uuid;
begin
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid();
  select * into v_inv from public.company_invitations i
   where i.id = p_invitation_id and i.deleted_at is null and i.accepted_at is null
     and i.expires_at > now()
   for update;
  if v_inv.id is null or v_inv.email::text <> v_email then
    raise exception 'invitation not found' using errcode = 'no_data_found';
  end if;

  select m.id into v_existing from public.company_members m
   where m.company_id = v_inv.company_id and m.user_id = auth.uid() and m.deleted_at is null;
  if v_existing is null then
    insert into public.company_members (company_id, user_id, role, created_by)
    values (v_inv.company_id, auth.uid(), v_inv.role, v_inv.created_by);
  end if;

  insert into public.project_members (company_id, project_id, user_id, created_by)
  select v_inv.company_id, pid, auth.uid(), v_inv.created_by
  from unnest(v_inv.project_ids) pid
  join public.projects p on p.id = pid and p.company_id = v_inv.company_id and p.deleted_at is null
  on conflict do nothing;

  update public.company_invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_inv.id;

  update public.profiles set last_company_id = v_inv.company_id where id = auth.uid();

  if v_inv.created_by is not null then
    insert into public.notifications (company_id, user_id, kind, payload, link, created_by)
    values (v_inv.company_id, v_inv.created_by, 'invitation_accepted',
            jsonb_build_object('email', v_email), '/members', auth.uid());
  end if;
  return v_inv.company_id;
end;
$$;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

create or replace function public.decline_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.company_invitations i
     set deleted_at = now()
   where i.id = p_invitation_id
     and i.accepted_at is null and i.deleted_at is null
     and i.email = (select lower(u.email) from auth.users u where u.id = auth.uid());
end;
$$;
revoke all on function public.decline_invitation(uuid) from public, anon;
grant execute on function public.decline_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: set the exact list of projects a member is assigned to.
-- ---------------------------------------------------------------------------
create or replace function public.set_member_projects(
  p_company_id  uuid,
  p_user_id     uuid,
  p_project_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_company_role(p_company_id, array['owner','admin']::public.app_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.company_members m
                 where m.company_id = p_company_id and m.user_id = p_user_id and m.deleted_at is null) then
    raise exception 'not a member' using errcode = 'no_data_found';
  end if;

  update public.project_members pm
     set deleted_at = now()
   where pm.company_id = p_company_id and pm.user_id = p_user_id and pm.deleted_at is null
     and not (pm.project_id = any (coalesce(p_project_ids, '{}')));

  insert into public.project_members (company_id, project_id, user_id, created_by)
  select p_company_id, p.id, p_user_id, auth.uid()
  from public.projects p
  where p.id = any (coalesce(p_project_ids, '{}'))
    and p.company_id = p_company_id and p.deleted_at is null
    and not exists (select 1 from public.project_members pm
                    where pm.project_id = p.id and pm.user_id = p_user_id and pm.deleted_at is null);
end;
$$;
revoke all on function public.set_member_projects(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.set_member_projects(uuid, uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- View: member directory (name, email, role, assigned project count)
-- security_invoker so the caller's RLS applies.
-- ---------------------------------------------------------------------------
create or replace view public.company_member_directory
with (security_invoker = true) as
select
  m.id,
  m.company_id,
  m.user_id,
  m.role,
  m.status,
  m.created_at,
  m.updated_at,
  m.deleted_at,
  coalesce(p.full_name, '') as full_name,
  coalesce(p.email, '') as email,
  p.phone,
  (select count(*) from public.project_members pm
    where pm.user_id = m.user_id and pm.company_id = m.company_id and pm.deleted_at is null)::int as project_count,
  coalesce((select array_agg(pm.project_id) from public.project_members pm
    where pm.user_id = m.user_id and pm.company_id = m.company_id and pm.deleted_at is null), '{}') as project_ids
from public.company_members m
left join public.profiles p on p.id = m.user_id;

revoke all on public.company_member_directory from anon;
grant select on public.company_member_directory to authenticated;

-- View: projects with client name (security_invoker → projects RLS applies).
create or replace view public.project_list
with (security_invoker = true) as
select
  p.*,
  c.name as client_name,
  (select count(*) from public.project_members pm
    where pm.project_id = p.id and pm.deleted_at is null)::int as member_count
from public.projects p
left join public.clients c on c.id = p.client_id;

revoke all on public.project_list from anon;
grant select on public.project_list to authenticated;
