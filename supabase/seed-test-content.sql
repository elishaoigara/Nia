-- Nia mixed-content test seed
--
-- Creates 22 deterministic, repeatable test posts:
--   * 8 text posts
--   * 6 image posts
--   * 4 short Flicks (<= 60 seconds)
--   * 4 Full videos (> 60 seconds)
--
-- Run this from the Supabase SQL editor after applying all migrations. The
-- script uses existing profiles as authors, attaches some posts to existing
-- public Circles, and adds likes, views, comments, and hashtags for realistic
-- UI testing. Re-running it updates the same post IDs instead of duplicating
-- content.
--
-- Video behavior:
--   Existing non-seed video URLs are reused when available, which avoids
--   duplicating Storage objects. If the database has no videos yet, the script
--   falls back to public Giphy MP4 loops allowed by Nia's CSP. The >60-second
--   fallback rows use test duration metadata to exercise the Full Videos UI;
--   use scripts/seed-flicks-from-pexels.mjs when real long-form files are needed.
--
-- Cleanup only this seed data:
--   delete from public.posts where content like '%#nia_seed_v1%';

begin;
do $$ begin
 if current_setting('app.environment',true) is distinct from 'staging' then raise exception 'Seeds require app.environment=staging on an isolated database'; end if;
end $$;


do $seed$
declare
  seed_users uuid[];
  seed_circles uuid[];
  source_video_urls text[];
  source_video_thumbs text[];
  user_count integer;
  circle_count integer;
  video_source_count integer;
  item record;
  author_id uuid;
  target_circle_id uuid;
  source_index integer;
  post_id uuid;
begin
  select array_agg(id order by created_at, id)
  into seed_users
  from (
    select id, created_at
    from public.profiles
    where id in (select user_id from public.test_profiles)
    order by created_at, id
    limit 8
  ) profiles_for_seed;

  user_count := coalesce(array_length(seed_users, 1), 0);
  if user_count = 0 then
    raise exception 'Nia test seed requires at least one row in public.profiles';
  end if;

  select array_agg(id order by created_at, id)
  into seed_circles
  from (
    select id, created_at
    from public.circles
    where is_private = false
    order by created_at, id
    limit 5
  ) circles_for_seed;

  circle_count := coalesce(array_length(seed_circles, 1), 0);

  select
    array_agg(media_url order by created_at desc, id),
    array_agg(thumbnail_url order by created_at desc, id)
  into source_video_urls, source_video_thumbs
  from (
    select id, media_url, thumbnail_url, created_at
    from public.posts
    where media_type = 'video'
      and media_url is not null
      and content not like '%#nia_seed_v1%'
    order by created_at desc, id
    limit 6
  ) videos_for_seed;

  video_source_count := coalesce(array_length(source_video_urls, 1), 0);
  if video_source_count = 0 then
    source_video_urls := array[
      'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.mp4',
      'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.mp4',
      'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.mp4'
    ];
    source_video_thumbs := array[
      'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy_s.gif',
      'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy_s.gif',
      'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy_s.gif'
    ];
    video_source_count := 3;
  end if;

  -- Text-only feed posts covering every contribution mode and multiple languages.
  for item in
    select * from (values
      (1, 'What is one practical feature you would add to make digital bookkeeping easier for small businesses in Kenya? #nia_seed_v1', 'ask', 'English', 'tech'),
      (2, 'I can review two junior developer portfolios this weekend. Share yours and tell me which role you are targeting. #nia_seed_v1', 'offer', 'English', 'education'),
      (3, 'Week three of building our community marketplace: search is faster, mobile navigation is cleaner, and user testing starts tomorrow. #nia_seed_v1', 'update', 'English', 'tech'),
      (4, 'Opportunity: Nairobi creators needed for a paid two-day product photography project next month. #nia_seed_v1', 'opportunity', 'English', 'other'),
      (5, 'Small progress still counts. Today I fixed one bug, documented the solution, and helped another developer avoid it. #nia_seed_v1', 'reflection', 'English', 'education'),
      (6, 'Ni biashara gani ya kidijitali ungependa kuanzisha kama ungepewa mtaji na mshauri leo? #nia_seed_v1', 'ask', 'Swahili', 'tech'),
      (7, 'Tunatafuta wanafunzi watatu kusaidia kujaribu programu mpya ya kupanga kazi za vikundi. #nia_seed_v1', 'opportunity', 'Swahili', 'education'),
      (8, 'Community is strongest when people share what worked, what failed, and what they will try next. #nia_seed_v1', 'reflection', 'English', 'culture')
    ) as text_seed(n, body, purpose, post_language, post_category)
  loop
    author_id := seed_users[1 + ((item.n - 1) % user_count)];
    target_circle_id := case
      when circle_count > 0 and item.n % 3 = 0 then seed_circles[1 + ((item.n - 1) % circle_count)]
      else null
    end;
    post_id := md5('nia-test-seed-v1-text-' || item.n::text)::uuid;

    insert into public.posts (
      id, user_id, circle_id, content, media_url, media_type,
      thumbnail_url, video_duration, language, category,
      contribution_mode, audience, created_at, updated_at
    ) values (
      post_id, author_id, target_circle_id, item.body, null, null,
      null, null, item.post_language, item.post_category,
      item.purpose, 'public', now() - make_interval(hours => item.n * 2), now()
    )
    on conflict (id) do update set
      user_id = excluded.user_id,
      circle_id = excluded.circle_id,
      content = excluded.content,
      media_url = excluded.media_url,
      media_type = excluded.media_type,
      thumbnail_url = excluded.thumbnail_url,
      video_duration = excluded.video_duration,
      language = excluded.language,
      category = excluded.category,
      contribution_mode = excluded.contribution_mode,
      audience = excluded.audience,
      created_at = excluded.created_at,
      updated_at = now();
  end loop;

  -- Image posts use stable public images suitable for cards, lightboxes, and feeds.
  for item in
    select * from (values
      (1, 'Community builders meeting in Nairobi to plan the next local technology workshop. #nia_seed_v1', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80', 'update', 'English', 'tech'),
      (2, 'A quiet workspace, a clear plan, and one meaningful task at a time. #nia_seed_v1', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80', 'reflection', 'English', 'education'),
      (3, 'Which locally made product deserves more attention across Africa? #nia_seed_v1', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80', 'ask', 'English', 'culture'),
      (4, 'Free brand-photography tips for small businesses: use natural light, simple backgrounds, and consistent framing. #nia_seed_v1', 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=1400&q=80', 'offer', 'English', 'other'),
      (5, 'Open call for musicians and visual artists for an upcoming community showcase. #nia_seed_v1', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=80', 'opportunity', 'English', 'music'),
      (6, 'Teknolojia inakuwa na maana zaidi inaposaidia jamii kutatua changamoto halisi. #nia_seed_v1', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80', 'reflection', 'Swahili', 'tech')
    ) as image_seed(n, body, image_url, purpose, post_language, post_category)
  loop
    author_id := seed_users[1 + ((item.n + 1) % user_count)];
    target_circle_id := case
      when circle_count > 0 and item.n % 2 = 0 then seed_circles[1 + ((item.n - 1) % circle_count)]
      else null
    end;
    post_id := md5('nia-test-seed-v1-image-' || item.n::text)::uuid;

    insert into public.posts (
      id, user_id, circle_id, content, media_url, media_type,
      thumbnail_url, video_duration, language, category,
      contribution_mode, audience, created_at, updated_at
    ) values (
      post_id, author_id, target_circle_id, item.body, item.image_url, 'image',
      null, null, item.post_language, item.post_category,
      item.purpose, 'public', now() - make_interval(hours => item.n * 3 + 1), now()
    )
    on conflict (id) do update set
      user_id = excluded.user_id,
      circle_id = excluded.circle_id,
      content = excluded.content,
      media_url = excluded.media_url,
      media_type = excluded.media_type,
      thumbnail_url = excluded.thumbnail_url,
      video_duration = excluded.video_duration,
      language = excluded.language,
      category = excluded.category,
      contribution_mode = excluded.contribution_mode,
      audience = excluded.audience,
      created_at = excluded.created_at,
      updated_at = now();
  end loop;

  -- Mixed short and long video metadata exercises both Flicks surfaces.
  for item in
    select * from (values
      (1, 'A quick look at today''s creative workspace in Nairobi. #nia_seed_v1', 18::numeric, 'vlogs', 'update', 'English'),
      (2, 'Three small changes that made my mobile interface easier to use. #nia_seed_v1', 32::numeric, 'tech', 'offer', 'English'),
      (3, 'Je, ungechagua suluhisho gani kwa changamoto hii ya jamii? #nia_seed_v1', 45::numeric, 'education', 'ask', 'Swahili'),
      (4, 'A short celebration of music, movement, and community energy. #nia_seed_v1', 58::numeric, 'music', 'reflection', 'English'),
      (5, 'Full walkthrough: planning, building, and testing a community-focused product. #nia_seed_v1', 92::numeric, 'tech', 'offer', 'English'),
      (6, 'A longer conversation about creative careers and finding opportunities locally. #nia_seed_v1', 126::numeric, 'education', 'opportunity', 'English'),
      (7, 'Community stories: what we learned while organizing our first public event. #nia_seed_v1', 184::numeric, 'culture', 'reflection', 'English'),
      (8, 'Hatua kwa hatua: jinsi ya kubadilisha wazo kuwa mradi unaoweza kujaribiwa. #nia_seed_v1', 245::numeric, 'tech', 'update', 'Swahili')
    ) as video_seed(n, body, duration_seconds, post_category, purpose, post_language)
  loop
    author_id := seed_users[1 + ((item.n + 3) % user_count)];
    target_circle_id := case
      when circle_count > 0 and item.n % 2 = 1 then seed_circles[1 + ((item.n - 1) % circle_count)]
      else null
    end;
    source_index := 1 + ((item.n - 1) % video_source_count);
    post_id := md5('nia-test-seed-v1-video-' || item.n::text)::uuid;

    insert into public.posts (
      id, user_id, circle_id, content, media_url, media_type,
      thumbnail_url, video_duration, language, category,
      contribution_mode, audience, created_at, updated_at
    ) values (
      post_id, author_id, target_circle_id, item.body,
      source_video_urls[source_index], 'video', source_video_thumbs[source_index],
      item.duration_seconds, item.post_language, item.post_category,
      item.purpose, 'public', now() - make_interval(hours => item.n * 4 + 2), now()
    )
    on conflict (id) do update set
      user_id = excluded.user_id,
      circle_id = excluded.circle_id,
      content = excluded.content,
      media_url = excluded.media_url,
      media_type = excluded.media_type,
      thumbnail_url = excluded.thumbnail_url,
      video_duration = excluded.video_duration,
      language = excluded.language,
      category = excluded.category,
      contribution_mode = excluded.contribution_mode,
      audience = excluded.audience,
      created_at = excluded.created_at,
      updated_at = now();
  end loop;

  -- Add representative engagement so counts, ranking, and comment sheets have data.
  insert into public.likes (post_id, user_id, created_at)
  select seeded.id, viewer.id, seeded.created_at + interval '10 minutes'
  from public.posts seeded
  cross join lateral (
    select id
    from unnest(seed_users) as profile_id(id)
    where id <> seeded.user_id
    order by id
    limit 3
  ) viewer
  where seeded.content like '%#nia_seed_v1%'
  on conflict (post_id, user_id) do nothing;

  insert into public.post_views (post_id, user_id, created_at)
  select seeded.id, viewer.id, seeded.created_at + interval '5 minutes'
  from public.posts seeded
  cross join lateral (
    select id
    from unnest(seed_users) as profile_id(id)
    order by id
    limit 6
  ) viewer
  where seeded.content like '%#nia_seed_v1%'
  on conflict (post_id, user_id) do nothing;

  insert into public.comments (id, post_id, user_id, content, created_at, updated_at)
  select
    md5('nia-test-seed-v1-comment-' || seeded.id::text || '-' || commenter.id::text)::uuid,
    seeded.id,
    commenter.id,
    case row_number() over (partition by seeded.id order by commenter.id)
      when 1 then 'This is useful—thanks for sharing it.'
      when 2 then 'I would like to learn more about this.'
      else 'Great contribution to test the Nia conversation flow.'
    end,
    seeded.created_at + interval '20 minutes',
    now()
  from public.posts seeded
  cross join lateral (
    select id
    from unnest(seed_users) as profile_id(id)
    where id <> seeded.user_id
    order by id
    limit 3
  ) commenter
  where seeded.content like '%#nia_seed_v1%'
  on conflict (id) do update set
    content = excluded.content,
    updated_at = now();

  insert into public.hashtags (tag, post_id, user_id, country, created_at)
  select
    coalesce(nullif(seeded.category, ''), 'NiaTest'),
    seeded.id,
    seeded.user_id,
    author.country,
    seeded.created_at
  from public.posts seeded
  join public.profiles author on author.id = seeded.user_id
  where seeded.content like '%#nia_seed_v1%'
  on conflict (tag, post_id) do update set
    user_id = excluded.user_id,
    country = excluded.country;

  raise notice 'Nia seed complete: 8 text posts, 6 image posts, and 8 video posts.';
end
$seed$;

commit;

-- Quick verification:
-- select media_type, count(*)
-- from public.posts
-- where content like '%#nia_seed_v1%'
-- group by media_type
-- order by media_type nulls first;
