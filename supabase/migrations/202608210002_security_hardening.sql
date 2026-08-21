-- Security hardening for the Nia Supabase project.
-- Review in staging before production. This migration does not change row data.
-- It fixes mutable search paths and restricts RPC execution privileges.

-- Pin every flagged function to a trusted search path.
alter function public.accept_circle_join_request(uuid) set search_path = public, pg_temp;
alter function public.accept_follow_request(uuid) set search_path = public, pg_temp;
alter function public.apply_default_audience() set search_path = public, pg_temp;
alter function public.fn_create_message_request() set search_path = public, pg_temp;
alter function public.increment_poll_vote() set search_path = public, pg_temp;
alter function public.is_account_active(uuid) set search_path = public, pg_temp;
alter function public.notify_circle_join() set search_path = public, pg_temp;
alter function public.notify_comment() set search_path = public, pg_temp;
alter function public.notify_like() set search_path = public, pg_temp;

-- Trigger-only functions are not API operations. Remove direct execution from
-- every exposed role; PostgreSQL triggers can still invoke them internally.
revoke all on function public.apply_default_audience() from public, anon, authenticated;
revoke all on function public.fn_create_message_request() from public, anon, authenticated;
revoke all on function public.increment_poll_vote() from public, anon, authenticated;
revoke all on function public.notify_circle_join() from public, anon, authenticated;
revoke all on function public.notify_comment() from public, anon, authenticated;
revoke all on function public.notify_like() from public, anon, authenticated;

-- User-invoked workflows require a signed-in caller. Their function bodies
-- perform their own authorization checks as a second line of defense.
revoke all on function public.accept_circle_join_request(uuid) from public, anon, authenticated;
grant execute on function public.accept_circle_join_request(uuid) to authenticated;

revoke all on function public.accept_follow_request(uuid) from public, anon, authenticated;
grant execute on function public.accept_follow_request(uuid) to authenticated;

-- Account status is a read-only authenticated helper; anonymous callers do not
-- need to query it through PostgREST.
revoke all on function public.is_account_active(uuid) from public, anon, authenticated;
grant execute on function public.is_account_active(uuid) to authenticated;
