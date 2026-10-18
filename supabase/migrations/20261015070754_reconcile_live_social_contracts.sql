-- Reconcile observed production drift without dropping tables or user data.
-- Safe on both the canonical fresh schema and the inspected legacy schema.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.circles add column if not exists updated_at timestamptz not null default now();
alter table public.comments add column if not exists updated_at timestamptz not null default now();
alter table public.circle_join_requests add column if not exists updated_at timestamptz not null default now();
alter table public.message_requests add column if not exists created_at timestamptz not null default now();
alter table public.message_reports add column if not exists status text not null default 'open';
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='circle_members' and column_name='created_at') then
  alter table public.circle_members add column created_at timestamptz not null default now();
  update public.circle_members cm set created_at=coalesce((to_jsonb(cm)->>'joined_at')::timestamptz,created_at);
 end if;
end $$;

alter table public.poll_votes add column if not exists post_id uuid;
update public.poll_votes v set post_id=p.post_id from public.polls p where v.poll_id=p.id and v.post_id is null;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.poll_votes'::regclass and conname='poll_votes_post_id_fkey') then
  alter table public.poll_votes add constraint poll_votes_post_id_fkey foreign key(post_id) references public.posts(id) on delete cascade;
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.story_views'::regclass and contype in ('p','u') and pg_get_constraintdef(oid) like '%(story_id, viewer_id)%') then
  -- A duplicate preflight must pass; do not silently discard view records.
  alter table public.story_views add constraint story_views_story_viewer_key unique(story_id,viewer_id);
 end if;
end $$;
create index if not exists poll_votes_post_id_idx on public.poll_votes(post_id);

create table if not exists public.comment_likes (
 comment_id uuid not null references public.comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(comment_id,user_id)
);
alter table public.comment_likes enable row level security;
revoke all on public.comment_likes from public,anon;
grant select,insert,delete on public.comment_likes to authenticated;
create index if not exists comment_likes_user_id_idx on public.comment_likes(user_id);
drop policy if exists "authenticated users read comment likes" on public.comment_likes;
create policy "authenticated users read comment likes" on public.comment_likes for select to authenticated
 using(exists(select 1 from public.comments c where c.id=comment_id));
drop policy if exists "users create own comment likes" on public.comment_likes;
create policy "users create own comment likes" on public.comment_likes for insert to authenticated
 with check(user_id=(select auth.uid()) and private.is_account_active((select auth.uid())) and exists(select 1 from public.comments c where c.id=comment_id));
drop policy if exists "users delete own comment likes" on public.comment_likes;
create policy "users delete own comment likes" on public.comment_likes for delete to authenticated using(user_id=(select auth.uid()));

-- The protection functions existed live, but their triggers were absent.
drop trigger if exists messages_protect_fields on public.messages;
create trigger messages_protect_fields before update on public.messages for each row execute function public.protect_message_fields();
drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields before update on public.profiles for each row execute function public.protect_profile_fields();
do $$ declare t text; trigger_name text; begin
 foreach t in array array['profiles','circles','circle_join_requests','posts','comments','message_requests'] loop
  trigger_name:=case t when 'circle_join_requests' then 'circle_requests_set_updated_at' else t||'_set_updated_at' end;
  execute format('drop trigger if exists %I on public.%I',trigger_name,t);
  execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',trigger_name,t);
 end loop;
end $$;
drop policy if exists "participants update messages" on public.messages;
create policy "participants update messages" on public.messages for update to authenticated
 using((select auth.uid()) in (sender_id,recipient_id)) with check((select auth.uid()) in (sender_id,recipient_id));

-- Restrictive boundaries also constrain legacy permissive policies.
drop policy if exists "Nia story view privacy" on public.story_views;
create policy "Nia story view privacy" on public.story_views as restrictive for select to authenticated
 using(viewer_id=(select auth.uid()) or exists(select 1 from public.stories s where s.id=story_id and s.user_id=(select auth.uid())));
drop policy if exists "viewers and story owners read story views" on public.story_views;
create policy "viewers and story owners read story views" on public.story_views for select to authenticated
 using(viewer_id=(select auth.uid()) or exists(select 1 from public.stories s where s.id=story_id and s.user_id=(select auth.uid())));
drop policy if exists "Nia story view insert boundary" on public.story_views;
create policy "Nia story view insert boundary" on public.story_views as restrictive for insert to authenticated
 with check(viewer_id=(select auth.uid()) and private.is_account_active((select auth.uid())) and exists(select 1 from public.stories s where s.id=story_id));
drop policy if exists "users update own story views" on public.story_views;
create policy "users update own story views" on public.story_views for update to authenticated
 using(viewer_id=(select auth.uid())) with check(viewer_id=(select auth.uid()));
revoke all on public.story_views from anon;

drop policy if exists "Nia report actor boundary" on public.reports;
create policy "Nia report actor boundary" on public.reports as restrictive for insert to authenticated
 with check(reporter_id=(select auth.uid()) and reported_user_id is distinct from (select auth.uid()) and private.is_account_active((select auth.uid())));
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check check(char_length(btrim(reason)) between 1 and 120);
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check(status in ('open','reviewing','reviewed','resolved','dismissed'));

drop policy if exists "Nia notification actor boundary" on public.notifications;
create policy "Nia notification actor boundary" on public.notifications as restrictive for insert to authenticated
 with check(actor_id=(select auth.uid()) and user_id<>(select auth.uid()) and private.is_account_active((select auth.uid())));

-- Preserve legacy commerce records while removing obsolete client access.
do $$ declare t text; begin
 foreach t in array array['tips','verified_payments'] loop
  if to_regclass('public.'||t) is not null then execute format('revoke all on public.%I from public,anon,authenticated',t); end if;
 end loop;
end $$;

-- Owners need permissive writes as well as the existing restrictive boundaries.
drop policy if exists "users upload Nia media" on storage.objects;
create policy "users upload Nia media" on storage.objects for insert to authenticated
 with check(bucket_id in ('avatars','post-media','media','message-media','flicks') and owner_id=(select auth.uid())::text);
drop policy if exists "users update own Nia media" on storage.objects;
create policy "users update own Nia media" on storage.objects for update to authenticated
 using(bucket_id in ('avatars','post-media','media','message-media','flicks') and owner_id=(select auth.uid())::text)
 with check(owner_id=(select auth.uid())::text);
drop policy if exists "users delete own Nia media" on storage.objects;
create policy "users delete own Nia media" on storage.objects for delete to authenticated
 using(bucket_id in ('avatars','post-media','media','message-media','flicks') and owner_id=(select auth.uid())::text);

-- Make the existing message request trigger safe under concurrent first sends.
create or replace function public.create_message_request() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if new.recipient_id<>new.sender_id and not exists(select 1 from public.follows where follower_id=new.recipient_id and following_id=new.sender_id) then
  insert into public.message_requests(user_id,other_id,status) values(new.recipient_id,new.sender_id,'pending') on conflict(user_id,other_id) do nothing;
 end if;return new;
end $$;
revoke all on function public.create_message_request() from public,anon,authenticated;
drop trigger if exists trg_create_message_request on public.messages;
drop trigger if exists messages_create_request on public.messages;
drop trigger if exists on_message_insert on public.messages;
create trigger messages_create_request after insert on public.messages for each row execute function public.create_message_request();

-- RPCs run as the database owner; clients cannot override protected status.
-- Legacy account settings includes additional fields that fresh installs lack.
do $$ declare definition text; begin
 if to_regprocedure('public.validate_account_settings()') is not null then
  select pg_get_functiondef('public.validate_account_settings()'::regprocedure) into definition;
  definition:=replace(definition, 'tg_op = ''INSERT'' and auth.uid() is not null', 'tg_op = ''INSERT'' and current_user in (''authenticated'',''anon'')');
  definition:=replace(definition, 'tg_op = ''UPDATE'' and auth.uid() is not null', 'tg_op = ''UPDATE'' and current_user in (''authenticated'',''anon'')');
  execute definition;
 end if;
end $$;

-- Realtime inbox requests must update after a first message.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='message_requests') then
  alter publication supabase_realtime add table public.message_requests;
 end if;
end $$;

CREATE OR REPLACE FUNCTION public.get_trending_hashtags(p_since timestamp with time zone DEFAULT (now() - '48:00:00'::interval), p_limit integer DEFAULT 10)
 RETURNS TABLE(tag text, post_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select h.tag, count(*)::bigint as post_count
  from public.hashtags h
  where h.created_at >= p_since
  group by h.tag
  order by post_count desc, h.tag asc
  limit greatest(1, least(p_limit, 30));
$function$
;

CREATE OR REPLACE FUNCTION public.get_recommended_circles(p_user_id uuid, p_limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, name text, slug text, description text, university text, category text, country text, is_private boolean, created_at timestamp with time zone, member_count bigint, relevance_score integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;

revoke all on function public.get_trending_hashtags(timestamptz,integer),public.get_recommended_circles(uuid,integer) from public,anon;
grant execute on function public.get_trending_hashtags(timestamptz,integer),public.get_recommended_circles(uuid,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
