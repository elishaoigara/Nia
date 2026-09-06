-- Discovery indexes and compact read-only functions for Home and Explore.

create index if not exists profiles_country_idx
  on public.profiles (country)
  where country is not null;

create index if not exists profiles_interests_gin_idx
  on public.profiles using gin (interests);

create index if not exists circles_country_category_created_idx
  on public.circles (country, category, created_at desc);

create index if not exists circle_members_user_idx
  on public.circle_members (user_id, circle_id);

create index if not exists circle_members_circle_idx
  on public.circle_members (circle_id, user_id);

create index if not exists hashtags_created_at_idx
  on public.hashtags (created_at desc);

create or replace function public.get_trending_hashtags(
  p_since timestamptz default (now() - interval '48 hours'),
  p_limit integer default 10
)
returns table(tag text, post_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select h.tag, count(*)::bigint as post_count
  from public.hashtags h
  where h.created_at >= p_since
  group by h.tag
  order by post_count desc, h.tag asc
  limit greatest(1, least(p_limit, 30));
$$;

grant execute on function public.get_trending_hashtags(timestamptz, integer) to authenticated;

create or replace function public.get_recommended_circles(
  p_user_id uuid,
  p_limit integer default 8
)
returns table(
  id uuid,
  name text,
  slug text,
  description text,
  university text,
  category text,
  country text,
  is_private boolean,
  created_at timestamptz,
  member_count bigint,
  relevance_score integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with viewer as (
    select p.country, p.interests
    from public.profiles p
    where p.id = p_user_id
      and p_user_id = auth.uid()
  )
  select
    c.id,
    c.name,
    c.slug,
    c.description,
    c.university,
    c.category,
    c.country,
    c.is_private,
    c.created_at,
    count(cm.user_id)::bigint as member_count,
    (
      case when c.country is not null and c.country = v.country then 5 else 0 end
      + case when exists (
          select 1
          from unnest(coalesce(v.interests, '{}'::text[])) as interest
          where lower(coalesce(c.category, '')) = lower(interest)
             or lower(c.name) like '%' || lower(interest) || '%'
        ) then 4 else 0 end
      + least(count(cm.user_id)::integer, 100)
    )::integer as relevance_score
  from public.circles c
  cross join viewer v
  left join public.circle_members cm on cm.circle_id = c.id
  where not c.is_private
    and not exists (
      select 1
      from public.circle_members mine
      where mine.circle_id = c.id
        and mine.user_id = p_user_id
    )
  group by c.id, c.name, c.slug, c.description, c.university, c.category,
           c.country, c.is_private, c.created_at, v.country, v.interests
  order by relevance_score desc, c.created_at desc
  limit greatest(1, least(p_limit, 20));
$$;

grant execute on function public.get_recommended_circles(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
