-- Tiir · 0020 · Function privileges
--
-- No function in the public schema is meant to be called before sign-in.
-- Postgres grants EXECUTE to PUBLIC by default and Supabase also grants it to
-- anon, so both are revoked here; signed-in users and the service role keep it.
-- Trigger functions still fire normally: EXECUTE is checked when a trigger is
-- created, not each time it runs.

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

-- Sign-up and email-change triggers run as the auth service.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user(), public.handle_user_email_change() to supabase_auth_admin;
  end if;
end $$;
