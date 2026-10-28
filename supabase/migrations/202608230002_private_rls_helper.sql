-- Move the Circle-membership helper out of the API-exposed public schema.
-- This follows 202608230001_private_circle_rls.sql and is safe to apply to the
-- currently deployed database, where the first version created public helper.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_circle_member(target_circle uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = target_circle
      and cm.user_id = target_user
  );
$$;

revoke all on function private.is_circle_member(uuid, uuid) from public, anon;
grant execute on function private.is_circle_member(uuid, uuid) to authenticated;

-- Policies are ORed together, so remove every policy that still references the
-- public helper before dropping that function.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%is_circle_member%'
        or coalesce(with_check, '') like '%is_circle_member%'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

drop function if exists public.is_circle_member(uuid, uuid);

create policy "authenticated users read permitted circle members"
on public.circle_members for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.circles c
    where c.id = circle_members.circle_id
      and (
        not c.is_private
        or c.created_by = (select auth.uid())
        or private.is_circle_member(c.id, (select auth.uid()))
      )
  )
);

create policy "users read own or member circle requests"
on public.circle_join_requests for select to authenticated
using (
  user_id = (select auth.uid())
  or private.is_circle_member(circle_id, (select auth.uid()))
);

create policy "members update circle requests"
on public.circle_join_requests for update to authenticated
using (private.is_circle_member(circle_id, (select auth.uid())))
with check (private.is_circle_member(circle_id, (select auth.uid())));

create policy "authenticated users read permitted posts"
on public.posts for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    circle_id is not null
    and exists (
      select 1
      from public.circles c
      where c.id = posts.circle_id
        and (
          not c.is_private
          or c.created_by = (select auth.uid())
          or private.is_circle_member(c.id, (select auth.uid()))
        )
    )
  )
  or (
    circle_id is null
    and (
      (
        audience = 'public'
        and exists (
          select 1
          from public.profiles p
          where p.id = posts.user_id
            and not p.is_private
        )
      )
      or (
        audience = 'followers'
        and exists (
          select 1
          from public.follows f
          where f.follower_id = (select auth.uid())
            and f.following_id = posts.user_id
        )
      )
    )
  )
);

create policy "authenticated users create own posts"
on public.posts for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    circle_id is null
    or exists (
      select 1
      from public.circles c
      where c.id = posts.circle_id
        and (
          not c.is_private
          or c.created_by = (select auth.uid())
          or private.is_circle_member(c.id, (select auth.uid()))
        )
    )
  )
);

create policy "users update own posts"
on public.posts for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    circle_id is null
    or exists (
      select 1
      from public.circles c
      where c.id = posts.circle_id
        and (
          not c.is_private
          or c.created_by = (select auth.uid())
          or private.is_circle_member(c.id, (select auth.uid()))
        )
    )
  )
);
