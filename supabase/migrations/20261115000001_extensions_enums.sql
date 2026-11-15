-- Tiir · Phase 0 · 0001 — extensions, enums, shared trigger functions
-- Safe to run on an empty Supabase project.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum (
    'owner', 'admin', 'project_manager', 'estimator',
    'site_foreman', 'storekeeper', 'accountant', 'client_viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.currency_code as enum ('DJF', 'ETB', 'USD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_language as enum ('fr', 'en', 'ar', 'so');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.country_code as enum ('DJ', 'ET');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum (
    'draft', 'tender', 'active', 'on_hold', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.theme_mode as enum ('light', 'dark', 'system');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Fills created_by from the JWT when the client did not send it, and stops
-- clients from forging or rewriting it.
create or replace function public.tg_set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null or (auth.uid() is not null and new.created_by <> auth.uid()) then
      new.created_by := auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- Attaches the standard triggers (updated_at, created_by) to a table.
create or replace function public.attach_standard_triggers(p_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t text := p_table::text;
  n text := replace(replace(p_table::text, 'public.', ''), '"', '');
begin
  execute format('drop trigger if exists %I on %s', n || '_updated_at', t);
  execute format('create trigger %I before update on %s for each row execute function public.tg_set_updated_at()', n || '_updated_at', t);
  execute format('drop trigger if exists %I on %s', n || '_created_by', t);
  execute format('create trigger %I before insert or update on %s for each row execute function public.tg_set_created_by()', n || '_created_by', t);
end;
$$;

-- Safe uuid cast used by storage policies (returns null on bad input).
create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;
