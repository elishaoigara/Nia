-- Review in staging before production.
--
-- The live project contains additional functions created outside the original
-- checked-in migration chain. Every privilege/search_path change below is
-- therefore conditional so a clean install does not fail when an optional
-- function is not present yet.

do $$
declare
  function_name text;
  function_signature text;
  function_names text[] := array[
    'accept_circle_join_request(uuid)',
    'accept_follow_request(uuid)',
    'apply_default_audience()',
    'fn_create_message_request()',
    'increment_poll_vote()',
    'is_account_active(uuid)',
    'notify_circle_join()',
    'notify_comment()',
    'notify_like()'
  ];
begin
  foreach function_signature in array function_names loop
    if to_regprocedure('public.' || function_signature) is not null then
      execute format(
        'alter function public.%s set search_path = public, pg_temp',
        function_signature
      );
    end if;
  end loop;
end
$$;

-- Trigger-only functions are not API operations. PostgreSQL triggers can still
-- invoke them internally after direct execution is revoked.
do $$
declare
  function_signature text;
  function_names text[] := array[
    'apply_default_audience()',
    'fn_create_message_request()',
    'increment_poll_vote()',
    'notify_circle_join()',
    'notify_comment()',
    'notify_like()'
  ];
begin
  foreach function_signature in array function_names loop
    if to_regprocedure('public.' || function_signature) is not null then
      execute format(
        'revoke all on function public.%s from public, anon, authenticated',
        function_signature
      );
    end if;
  end loop;
end
$$;

-- User-invoked workflows require a signed-in caller. Their function bodies must
-- still perform authorization checks as a second line of defense.
do $$
declare
  function_signature text;
  function_names text[] := array[
    'accept_circle_join_request(uuid)',
    'accept_follow_request(uuid)',
    'is_account_active(uuid)'
  ];
begin
  foreach function_signature in array function_names loop
    if to_regprocedure('public.' || function_signature) is not null then
      execute format(
        'revoke all on function public.%s from public, anon, authenticated',
        function_signature
      );
      execute format(
        'grant execute on function public.%s to authenticated',
        function_signature
      );
    end if;
  end loop;
end
$$;
