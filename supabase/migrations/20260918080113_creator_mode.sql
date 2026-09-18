begin;

-- HTTPS-only labelled links. Enforce the same bounds even for direct API writes.
create function private.valid_creator_links(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
  if value is null or jsonb_typeof(value) <> 'array' then return false; end if;
  if jsonb_array_length(value) > 3 then return false; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item->'label') is distinct from 'string'
       or jsonb_typeof(item->'url') is distinct from 'string'
       or char_length(btrim(item->>'label')) not between 1 and 40
       or char_length(item->>'url') > 500
       or (item->>'url') !~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]\\]*)?$'
       or item - 'label' - 'url' <> '{}'::jsonb then return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.valid_creator_links(jsonb) from public, anon;
grant execute on function private.valid_creator_links(jsonb) to authenticated;

create table public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  category text check (category in ('Musician','Photographer','Comedian','Fashion creator','Developer','Educator','Artist','Filmmaker','Writer','Gamer','Small business owner','Other')),
  introduction text not null default '' check (char_length(introduction) <= 160),
  open_to_collaborations boolean not null default false,
  links jsonb not null default '[]'::jsonb check (private.valid_creator_links(links))
);
alter table public.creator_profiles enable row level security;
revoke all on public.creator_profiles from anon, authenticated;
grant select, insert, update, delete on public.creator_profiles to authenticated;
create policy "creator profile audience" on public.creator_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (enabled and exists (select 1 from public.profiles p where p.id = user_id)));
create policy "create own creator profile" on public.creator_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_account_active((select auth.uid())));
create policy "edit own creator profile" on public.creator_profiles for update to authenticated
  using (user_id = (select auth.uid()) and private.is_account_active((select auth.uid())))
  with check (user_id = (select auth.uid()) and private.is_account_active((select auth.uid())));
create policy "delete own creator profile" on public.creator_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.creator_featured_posts (
  user_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (user_id, slot),
  unique (user_id, post_id)
);
create index creator_featured_post_idx on public.creator_featured_posts(post_id);
alter table public.creator_featured_posts enable row level security;
revoke all on public.creator_featured_posts from anon, authenticated;
grant select, insert, update, delete on public.creator_featured_posts to authenticated;
create policy "featured work audience" on public.creator_featured_posts for select to authenticated
  using (user_id = (select auth.uid()) or (
    exists (select 1 from public.creator_profiles c where c.user_id = creator_featured_posts.user_id and c.enabled)
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = creator_featured_posts.user_id and p.circle_id is null and p.removed_at is null)
  ));
create policy "feature own work" on public.creator_featured_posts for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_account_active((select auth.uid()))
    and exists (select 1 from public.creator_profiles c where c.user_id = creator_featured_posts.user_id and c.enabled)
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()) and p.circle_id is null and p.removed_at is null));
create policy "reorder own work" on public.creator_featured_posts for update to authenticated
  using (user_id = (select auth.uid()) and private.is_account_active((select auth.uid())))
  with check (user_id = (select auth.uid()) and private.is_account_active((select auth.uid()))
    and exists (select 1 from public.creator_profiles c where c.user_id = creator_featured_posts.user_id and c.enabled)
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()) and p.circle_id is null and p.removed_at is null));
create policy "unfeature own work" on public.creator_featured_posts for delete to authenticated
  using (user_id = (select auth.uid()));

-- Atomic replacement avoids half-saved lists and serializes concurrent saves.
create function public.set_creator_featured_work(post_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not private.is_account_active(actor) then raise exception 'Creator tools unavailable'; end if;
  perform 1 from public.creator_profiles where user_id = actor and enabled for update;
  if not found then raise exception 'Enable Creator Mode first'; end if;
  if post_ids is null or cardinality(post_ids) > 3 or cardinality(post_ids) <> (select count(distinct id) from unnest(post_ids) id) then
    raise exception 'Choose up to three different posts';
  end if;
  if exists (select 1 from unnest(post_ids) as candidates(post_id) where not exists (
    select 1 from public.posts p where p.id = candidates.post_id and p.user_id = actor and p.circle_id is null and p.removed_at is null
  )) then raise exception 'Only your available profile posts can be featured'; end if;
  delete from public.creator_featured_posts where user_id = actor;
  insert into public.creator_featured_posts(user_id, slot, post_id)
    select actor, position::smallint, id from unnest(post_ids) with ordinality as items(id, position);
end;
$$;
revoke all on function public.set_creator_featured_work(uuid[]) from public, anon;
grant execute on function public.set_creator_featured_work(uuid[]) to authenticated;

-- Aggregation needs private bookmark rows, not broader SELECT policies on them.
-- No target-user argument: callers can only obtain their own aggregate totals.
create function private.creator_insights() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null or not private.is_account_active(actor)
     or not exists (select 1 from public.creator_profiles where user_id = actor and enabled) then
    raise exception 'Creator tools unavailable';
  end if;
  with own_posts as materialized (
    select id from public.posts where user_id = actor and removed_at is null and circle_id is null
  ), current_followers as materialized (
    select created_at from public.follows where following_id = actor and not private.is_blocked(actor, follower_id)
  )
  select jsonb_build_object(
    'recorded_views', (select count(*) from public.post_views v join own_posts p on p.id = v.post_id where v.user_id <> actor and v.created_at >= now() - interval '30 days'),
    'likes_and_reactions', (select count(*) from public.likes l join own_posts p on p.id = l.post_id where l.user_id <> actor and l.created_at >= now() - interval '30 days')
      + (select count(*) from public.reactions r join own_posts p on p.id = r.post_id where r.user_id <> actor and r.created_at >= now() - interval '30 days'),
    'comments', (select count(*) from public.comments c join own_posts p on p.id = c.post_id where c.user_id <> actor and c.removed_at is null and c.created_at >= now() - interval '30 days'),
    'saves', (select count(*) from public.bookmarks b join own_posts p on p.id = b.post_id where b.user_id <> actor and b.created_at >= now() - interval '30 days'),
    'followers', (select count(*) from current_followers),
    'recent_followers', (select count(*) from current_followers where created_at >= now() - interval '30 days')
  ) into result;
  return result;
end;
$$;
revoke all on function private.creator_insights() from public, anon;
grant execute on function private.creator_insights() to authenticated;
create function public.creator_insights() returns jsonb
language sql stable security invoker set search_path = '' as $$ select private.creator_insights(); $$;
revoke all on function public.creator_insights() from public, anon;
grant execute on function public.creator_insights() to authenticated;

commit;
