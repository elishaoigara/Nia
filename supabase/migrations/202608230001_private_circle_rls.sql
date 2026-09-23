-- Private Circle and content-visibility hardening.
--
-- This migration is intentionally compatible with both the checked-in baseline
-- schema and the currently deployed Nia schema, which has additional account and
-- audience features. It removes all existing policies on the content tables it
-- owns, then creates one authoritative policy set so permissive policies cannot
-- remain active through PostgreSQL's OR semantics.

alter table public.profiles
  add column if not exists is_private boolean not null default false;

alter table public.circles
  add column if not exists is_private boolean not null default false;

alter table public.circles
  alter column created_by set default auth.uid();

alter table public.posts
  add column if not exists audience text not null default 'public';

alter table public.stories
  add column if not exists audience text not null default 'followers';

alter table public.posts
  drop constraint if exists posts_audience_check;

alter table public.posts
  add constraint posts_audience_check
  check (audience in ('public', 'followers'));

alter table public.stories
  drop constraint if exists stories_audience_check;

alter table public.stories
  add constraint stories_audience_check
  check (audience in ('public', 'followers', 'close_friends'));

create index if not exists circle_members_user_circle_idx
  on public.circle_members (user_id, circle_id);

create index if not exists posts_circle_created_at_idx
  on public.posts (circle_id, created_at desc)
  where circle_id is not null;

-- Keep the helper functions used by the live policies behind the authenticated
-- role. Trigger-only functions are not API operations.
do $$
declare
  function_signature text;
  trigger_functions text[] := array[
    'apply_default_audience()',
    'fn_create_message_request()',
    'increment_poll_vote()',
    'notify_circle_join()',
    'notify_comment()',
    'notify_like()'
  ];
  caller_functions text[] := array[
    'accept_circle_join_request(uuid)',
    'accept_follow_request(uuid)',
    'is_account_active(uuid)'
  ];
begin
  foreach function_signature in array trigger_functions loop
    if to_regprocedure('public.' || function_signature) is not null then
      execute format(
        'alter function public.%s set search_path = public, pg_temp',
        function_signature
      );
      execute format(
        'revoke all on function public.%s from public, anon, authenticated',
        function_signature
      );
    end if;
  end loop;

  foreach function_signature in array caller_functions loop
    if to_regprocedure('public.' || function_signature) is not null then
      execute format(
        'alter function public.%s set search_path = public, pg_temp',
        function_signature
      );
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

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
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

revoke all on function private.is_circle_member(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_circle_member(uuid, uuid) to authenticated;

-- Drop every existing policy on the content and privacy tables below. This is
-- required because policies are ORed together; adding a stricter policy without
-- removing an old `using (true)` policy does not improve privacy.
do $$
declare
  policy_row record;
  managed_tables text[] := array[
    'profiles', 'circles', 'circle_members', 'circle_join_requests',
    'posts', 'comments', 'likes', 'reactions', 'reposts', 'bookmarks',
    'polls', 'poll_votes', 'hashtags', 'post_views', 'stories'
  ];
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (managed_tables)
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

-- The helper was previously created in public by an earlier version of this
-- migration. The policy drop above removes any dependency before this cleanup.
drop function if exists public.is_circle_member(uuid, uuid);

-- Profiles: a private profile remains visible to its owner and accepted
-- followers. Public profile visibility is limited to active authenticated users
-- by the surrounding application account-status policies.
create policy "authenticated users read visible profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (
    not is_private
    or exists (
      select 1
      from public.follows f
      where f.follower_id = (select auth.uid())
        and f.following_id = profiles.id
    )
  )
);

create policy "users create own profile"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy "users update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Circle metadata is discoverable to signed-in users so private-circle join
-- requests remain possible. Membership and content are protected separately.
create policy "authenticated users read circles"
on public.circles for select to authenticated
using (true);

create policy "authenticated users create circles"
on public.circles for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "circle creators update circles"
on public.circles for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "circle creators delete circles"
on public.circles for delete to authenticated
using (created_by = (select auth.uid()));

-- Public-circle membership is visible to authenticated users. Private-circle
-- membership is visible only to the member themselves or another member.
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

create policy "users join public circles"
on public.circle_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.circles c
    where c.id = circle_members.circle_id
      and (not c.is_private or c.created_by = (select auth.uid()))
  )
);

create policy "users leave circles"
on public.circle_members for delete to authenticated
using (user_id = (select auth.uid()));

create policy "users read own or member circle requests"
on public.circle_join_requests for select to authenticated
using (
  user_id = (select auth.uid())
  or private.is_circle_member(circle_id, (select auth.uid()))
);

create policy "users create own circle requests"
on public.circle_join_requests for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "requesters update own circle requests"
on public.circle_join_requests for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "members update circle requests"
on public.circle_join_requests for update to authenticated
using (private.is_circle_member(circle_id, (select auth.uid())))
with check (private.is_circle_member(circle_id, (select auth.uid())));

create policy "requesters delete own circle requests"
on public.circle_join_requests for delete to authenticated
using (user_id = (select auth.uid()));

-- A post in a private Circle is readable only by the Circle owner/member. A
-- standalone post follows the author's audience and profile privacy settings.
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

create policy "users delete own posts"
on public.posts for delete to authenticated
using (user_id = (select auth.uid()));

-- All post-dependent tables inherit the post visibility decision. This closes
-- secondary read paths through comments, engagement, polls, hashtags, and views.
create policy "authenticated users read permitted comments"
on public.comments for select to authenticated
using (exists (select 1 from public.posts p where p.id = comments.post_id));

create policy "authenticated users create comments on permitted posts"
on public.comments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = comments.post_id)
);

create policy "users update own comments"
on public.comments for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = comments.post_id)
);

create policy "users delete own comments"
on public.comments for delete to authenticated
using (user_id = (select auth.uid()));

create policy "authenticated users read permitted likes"
on public.likes for select to authenticated
using (exists (select 1 from public.posts p where p.id = likes.post_id));

create policy "authenticated users create own likes"
on public.likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = likes.post_id)
);

create policy "users delete own likes"
on public.likes for delete to authenticated
using (user_id = (select auth.uid()));

create policy "authenticated users read permitted reactions"
on public.reactions for select to authenticated
using (exists (select 1 from public.posts p where p.id = reactions.post_id));

create policy "authenticated users create own reactions"
on public.reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = reactions.post_id)
);

create policy "users delete own reactions"
on public.reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "authenticated users read permitted reposts"
on public.reposts for select to authenticated
using (exists (select 1 from public.posts p where p.id = reposts.post_id));

create policy "authenticated users create own reposts"
on public.reposts for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = reposts.post_id)
);

create policy "users delete own reposts"
on public.reposts for delete to authenticated
using (user_id = (select auth.uid()));

create policy "users read own bookmarks"
on public.bookmarks for select to authenticated
using (user_id = (select auth.uid()));

create policy "users create own bookmarks"
on public.bookmarks for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = bookmarks.post_id)
);

create policy "users delete own bookmarks"
on public.bookmarks for delete to authenticated
using (user_id = (select auth.uid()));

create policy "authenticated users read permitted polls"
on public.polls for select to authenticated
using (exists (select 1 from public.posts p where p.id = polls.post_id));

create policy "post owners create polls"
on public.polls for insert to authenticated
with check (
  exists (
    select 1
    from public.posts p
    where p.id = polls.post_id
      and p.user_id = (select auth.uid())
  )
);

create policy "authenticated users read permitted poll votes"
on public.poll_votes for select to authenticated
using (
  exists (
    select 1
    from public.polls po
    join public.posts p on p.id = po.post_id
    where po.id = poll_votes.poll_id
  )
);

create policy "authenticated users create own poll votes"
on public.poll_votes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.polls po
    join public.posts p on p.id = po.post_id
    where po.id = poll_votes.poll_id
  )
);

create policy "authenticated users read permitted hashtags"
on public.hashtags for select to authenticated
using (exists (select 1 from public.posts p where p.id = hashtags.post_id));

create policy "post owners create hashtags"
on public.hashtags for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = hashtags.post_id
      and p.user_id = (select auth.uid())
  )
);

create policy "post owners read post views"
on public.post_views for select to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_views.post_id
      and p.user_id = (select auth.uid())
  )
);

create policy "authenticated users create own post views"
on public.post_views for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_views.post_id)
);

-- Stories use their own audience and profile privacy. The close-friends branch
-- is included only when that optional live table exists.
do $$
begin
  if to_regclass('public.close_friends') is not null then
    execute $policy$
      create policy "authenticated users read permitted active stories"
      on public.stories for select to authenticated
      using (
        expires_at > now()
        and (
          user_id = (select auth.uid())
          or (
            audience = 'public'
            and exists (
              select 1 from public.profiles p
              where p.id = stories.user_id and not p.is_private
            )
          )
          or (
            audience = 'followers'
            and exists (
              select 1 from public.follows f
              where f.follower_id = (select auth.uid())
                and f.following_id = stories.user_id
            )
          )
          or (
            audience = 'close_friends'
            and exists (
              select 1 from public.close_friends cf
              where cf.user_id = stories.user_id
                and cf.friend_id = (select auth.uid())
            )
          )
        )
      )
    $policy$;
  else
    execute $policy$
      create policy "authenticated users read permitted active stories"
      on public.stories for select to authenticated
      using (
        expires_at > now()
        and (
          user_id = (select auth.uid())
          or (
            audience = 'public'
            and exists (
              select 1 from public.profiles p
              where p.id = stories.user_id and not p.is_private
            )
          )
          or (
            audience = 'followers'
            and exists (
              select 1 from public.follows f
              where f.follower_id = (select auth.uid())
                and f.following_id = stories.user_id
            )
          )
        )
      )
    $policy$;
  end if;
end
$$;

create policy "authenticated users create own stories"
on public.stories for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "users update own stories"
on public.stories for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "users delete own stories"
on public.stories for delete to authenticated
using (user_id = (select auth.uid()));
