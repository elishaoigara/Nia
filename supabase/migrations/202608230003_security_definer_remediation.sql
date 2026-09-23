-- Remove exposed SECURITY DEFINER implementations from the public API surface.
--
-- The live database contains optional features that are not present in every
-- clean-install migration path. The follow-request and account-status sections
-- are conditional so this migration remains safe when those tables are absent.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Circle approval is still called by the current web client through the public
-- RPC name. Keep the privileged implementation private and expose only a thin
-- SECURITY INVOKER wrapper. The private function derives the caller from auth.uid
-- and never trusts a caller-supplied user identity.
create or replace function private.accept_circle_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.circle_join_requests%rowtype;
begin
  select *
  into req
  from public.circle_join_requests
  where id = request_id
    and status = 'pending';

  if not found then
    raise exception 'Request not found or already handled';
  end if;

  if not exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = req.circle_id
      and cm.user_id = (select auth.uid())
  ) then
    raise exception 'Not authorized to accept requests for this circle';
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (req.circle_id, req.user_id)
  on conflict do nothing;

  update public.circle_join_requests
  set status = 'accepted'
  where id = request_id
    and status = 'pending';
end;
$$;

revoke all on function private.accept_circle_join_request(uuid) from public, anon;
grant execute on function private.accept_circle_join_request(uuid) to authenticated;

create or replace function public.accept_circle_join_request(request_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.accept_circle_join_request($1);
$$;

revoke all on function public.accept_circle_join_request(uuid) from public, anon;
grant execute on function public.accept_circle_join_request(uuid) to authenticated;

-- Follow-request acceptance is not used by the current Nia repository. Keep a
-- private copy only when the live optional table exists, and remove the public
-- RPC so it cannot be invoked through PostgREST.
do $$
begin
  if to_regclass('public.follow_requests') is not null
     and to_regclass('public.follows') is not null then
    execute $function$
      create or replace function private.accept_follow_request(requester uuid)
      returns void
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      begin
        if not exists (
          select 1
          from public.follow_requests fr
          where fr.requester_id = $1
            and fr.target_id = (select auth.uid())
            and fr.status = 'pending'
        ) then
          raise exception 'Follow request not found';
        end if;

        insert into public.follows (follower_id, following_id)
        values ($1, (select auth.uid()))
        on conflict do nothing;

        update public.follow_requests
        set status = 'accepted'
        where requester_id = $1
          and target_id = (select auth.uid())
          and status = 'pending';
      end;
      $body$;
    $function$;

    revoke all on function private.accept_follow_request(uuid) from public, anon, authenticated;
    drop function if exists public.accept_follow_request(uuid);
  else
    drop function if exists public.accept_follow_request(uuid);
  end if;
end
$$;

-- Account status is an internal policy helper, not an API operation. Create the
-- private helper only when the optional account_settings table exists.
do $$
begin
  if to_regclass('public.account_settings') is not null then
    execute $function$
      create or replace function private.is_account_active(target_user uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select coalesce((
          select account_status = 'active'
            or (
              account_status = 'suspended'
              and status_until is not null
              and status_until <= now()
            )
          from public.account_settings
          where user_id = $1
        ), true);
      $body$;
    $function$;

    revoke all on function private.is_account_active(uuid) from public, anon, authenticated;
    grant execute on function private.is_account_active(uuid) to authenticated;

    if to_regclass('public.messages') is not null then
      execute 'drop policy if exists "active accounts send messages" on public.messages';
      execute $policy$
        create policy "active accounts send messages"
        on public.messages for insert to authenticated
        with check (private.is_account_active((select auth.uid())))
      $policy$;
    end if;

    if to_regclass('public.reports') is not null then
      execute 'drop policy if exists "active accounts submit reports" on public.reports';
      execute $policy$
        create policy "active accounts submit reports"
        on public.reports for insert to authenticated
        with check (private.is_account_active((select auth.uid())))
      $policy$;
    end if;

    if to_regclass('storage.objects') is not null then
      -- The original bucket policies were assigned to the public role and only
      -- checked auth.uid(). Recreate those three upload policies with the same
      -- bucket boundaries plus the private account-status check.
      execute 'drop policy if exists "active accounts upload media" on storage.objects';
      execute 'drop policy if exists "Auth upload" on storage.objects';
      execute $policy$
        create policy "Auth upload"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'post-media'
          and private.is_account_active((select auth.uid()))
        )
      $policy$;

      execute 'drop policy if exists "Auth upload avatar" on storage.objects';
      execute $policy$
        create policy "Auth upload avatar"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'avatars'
          and private.is_account_active((select auth.uid()))
        )
      $policy$;

      execute 'drop policy if exists "Auth upload message media" on storage.objects';
      execute $policy$
        create policy "Auth upload message media"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'message-media'
          and private.is_account_active((select auth.uid()))
        )
      $policy$;

      execute 'drop policy if exists "active accounts delete media" on storage.objects';
      execute $policy$
        create policy "active accounts delete media"
        on storage.objects for delete to authenticated
        using (private.is_account_active((select auth.uid())))
      $policy$;

      execute 'drop policy if exists "active accounts update media" on storage.objects';
      execute $policy$
        create policy "active accounts update media"
        on storage.objects for update to authenticated
        using (private.is_account_active((select auth.uid())))
        with check (private.is_account_active((select auth.uid())))
      $policy$;
    end if;

    drop function if exists public.is_account_active(uuid);
  else
    drop function if exists public.is_account_active(uuid);
  end if;
end
$$;
