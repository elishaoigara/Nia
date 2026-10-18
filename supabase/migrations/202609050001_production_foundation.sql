-- Missing prerequisites for fresh installs. Existing projects also receive these
-- definitions in the forward reconciliation migration; never reset a live DB.
create table if not exists public.account_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 account_status text not null default 'active' check (account_status in ('active','suspended','deactivated')),
 status_until timestamptz
);
create table if not exists public.close_friends (
 user_id uuid references public.profiles(id) on delete cascade,
 friend_id uuid references public.profiles(id) on delete cascade,
 primary key(user_id, friend_id)
);
create table if not exists public.follow_requests (
 requester_id uuid references public.profiles(id) on delete cascade,
 target_id uuid references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 primary key(requester_id,target_id), check(requester_id <> target_id)
);
create table if not exists public.moderation_actions (
 id uuid primary key default gen_random_uuid(),
 moderator_id uuid references public.profiles(id) on delete set null,
 report_id uuid,
 target_user_id uuid references public.profiles(id) on delete set null,
 action text not null,
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.moderation_appeals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id) on delete cascade,
 action_id uuid references public.moderation_actions(id) on delete cascade,
 reason text not null check(char_length(reason) between 10 and 2000),
 reviewed_by uuid references public.profiles(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now()
);
alter table public.account_settings enable row level security;
alter table public.close_friends enable row level security;
alter table public.follow_requests enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.moderation_appeals enable row level security;

-- Forward reconciliation and authoritative authorization boundaries.
begin;
alter table public.messages add column if not exists story_id uuid references public.stories(id) on delete set null;
alter table public.message_reports add column if not exists details text;
alter table public.profiles add column if not exists open_to text check(char_length(open_to) <= 160);
alter table public.profiles add column if not exists ask_me_about text check(char_length(ask_me_about) <= 160);
alter table public.posts add column if not exists removed_at timestamptz;
alter table public.comments add column if not exists removed_at timestamptz;
alter table public.stories add column if not exists removed_at timestamptz;
alter table public.circles add column if not exists removed_at timestamptz;
alter table public.circles add column if not exists welcome text check(char_length(welcome) <= 2000);
alter table public.circles add column if not exists rules text check(char_length(rules) <= 2000);
alter table public.circle_members add column if not exists role text not null default 'member' check(role in ('member','moderator'));
alter table public.moderation_actions add column if not exists source text;
alter table public.moderation_actions add column if not exists evidence jsonb;
alter table public.posts drop constraint if exists posts_media_type_check;
alter table public.posts add constraint posts_media_type_check check(media_type is null or media_type in ('image','video','gif','audio'));

create table if not exists public.user_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 data_saver boolean not null default true,
 autoplay boolean not null default false,
 interface_language text not null default 'en' check(interface_language in ('en','sw')),
 content_languages text[] not null default '{}',
 dm_policy text not null default 'requests' check(dm_policy in ('requests','following','nobody')),
 show_presence boolean not null default false,
 read_receipts boolean not null default false,
 notify_replies boolean not null default true,
 notify_messages boolean not null default true,
 notify_circles boolean not null default true,
 digest boolean not null default false,
 quiet_start time,
 quiet_end time,
 timezone text not null default 'Africa/Nairobi',
 updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
create policy "preferences own" on public.user_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "account status own" on public.account_settings for select to authenticated using(user_id=(select auth.uid()));
create policy "close friends own" on public.close_friends for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "follow requests participants" on public.follow_requests for select to authenticated using(requester_id=(select auth.uid()) or target_id=(select auth.uid()));
create policy "follow requests cancel" on public.follow_requests for delete to authenticated using(requester_id=(select auth.uid()));
create policy "appeals own read" on public.moderation_appeals for select to authenticated using(user_id=(select auth.uid()));
create policy "appeals own submit" on public.moderation_appeals for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.moderation_actions a where a.id=action_id and a.target_user_id=(select auth.uid())));
create policy "enforcement own read" on public.moderation_actions for select to authenticated using(target_user_id=(select auth.uid()));

create or replace function private.is_account_active(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select account_status='active' or (account_status='suspended' and status_until is not null and status_until<=now()) from public.account_settings where user_id=target_user),true);
$$;
create or replace function private.is_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create or replace function private.can_follow(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=target_user and not is_private) and not private.is_blocked(auth.uid(),target_user);
$$;
create or replace function private.can_manage_circle(target_circle uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.circles where id=target_circle and created_by=auth.uid()) or exists(select 1 from public.circle_members where circle_id=target_circle and user_id=auth.uid() and role='moderator');
$$;
create or replace function private.can_message(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() <> target_user and not private.is_blocked(auth.uid(),target_user) and private.is_account_active(auth.uid()) and private.is_account_active(target_user)
 and coalesce((select case dm_policy when 'nobody' then false when 'following' then exists(select 1 from public.follows where follower_id=target_user and following_id=auth.uid()) else true end from public.user_preferences where user_id=target_user),true)
 and not exists(select 1 from public.message_requests where user_id=target_user and other_id=auth.uid() and status='declined');
$$;
revoke all on function private.is_account_active(uuid),private.is_blocked(uuid,uuid),private.can_follow(uuid),private.can_manage_circle(uuid),private.can_message(uuid) from public,anon;
grant execute on function private.is_account_active(uuid),private.is_blocked(uuid,uuid),private.can_follow(uuid),private.can_manage_circle(uuid),private.can_message(uuid) to authenticated;

-- Replace message insert policies, including undocumented permissive policies.
do $$ declare p record; begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='messages' and cmd in ('INSERT','ALL') loop execute format('drop policy %I on public.messages',p.policyname); end loop;
end $$;
create policy "messages authenticated sender" on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and private.can_message(recipient_id) and not view_once);
create policy "messages active update" on public.messages as restrictive for update to authenticated using(private.is_account_active((select auth.uid()))) with check(private.is_account_active((select auth.uid())));
create policy "messages no legacy view once" on public.messages as restrictive for select to authenticated using(not view_once);
-- Enforce the same checks even if a future permissive policy is added.
create policy "messages sender boundary" on public.messages as restrictive for insert to authenticated with check(sender_id=(select auth.uid()) and private.can_message(recipient_id) and not view_once);
create policy "follows approved targets" on public.follows as restrictive for insert to authenticated with check(follower_id=(select auth.uid()) and private.can_follow(following_id));
create policy "follows blocked hidden" on public.follows as restrictive for select to authenticated using(not private.is_blocked(follower_id,following_id));

create or replace function public.request_follow(target_user uuid) returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()=target_user or not private.is_account_active(auth.uid()) or private.is_blocked(auth.uid(),target_user) then raise exception 'Follow unavailable'; end if;
 if not exists(select 1 from public.profiles where id=target_user) then raise exception 'Profile unavailable'; end if;
 if exists(select 1 from public.follows where follower_id=auth.uid() and following_id=target_user) then return 'following'; end if;
 if private.can_follow(target_user) then
  insert into public.follows(follower_id,following_id) values(auth.uid(),target_user) on conflict do nothing;
  return 'following';
 end if;
 insert into public.follow_requests(requester_id,target_id,status) values(auth.uid(),target_user,'pending') on conflict(requester_id,target_id) do update set status='pending',created_at=now();
 return 'pending';
end $$;
create or replace function public.respond_follow(requester uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_account_active(auth.uid()) or private.is_blocked(auth.uid(),requester) then raise exception 'Unavailable'; end if;
 perform 1 from public.follow_requests where requester_id=requester and target_id=auth.uid() and status='pending' for update;
 if not found then raise exception 'Request unavailable'; end if;
 if accept then insert into public.follows(follower_id,following_id) values(requester,auth.uid()) on conflict do nothing; end if;
 update public.follow_requests set status=case when accept then 'accepted' else 'declined' end where requester_id=requester and target_id=auth.uid();
end $$;
-- Minimal card permits requesting a private profile without exposing its details.
create or replace function public.profile_card(target_user uuid) returns table(id uuid,username text,avatar_url text,is_private boolean) language sql stable security definer set search_path='' as $$
 select p.id,p.username,p.avatar_url,p.is_private from public.profiles p where p.id=target_user and auth.uid() is not null and not private.is_blocked(auth.uid(),p.id) and private.is_account_active(p.id);
$$;
revoke all on function public.request_follow(uuid),public.respond_follow(uuid,boolean),public.profile_card(uuid) from public,anon;
grant execute on function public.request_follow(uuid),public.respond_follow(uuid,boolean),public.profile_card(uuid) to authenticated;

-- Content safety restrictions are ANDed with the existing audience policies.
create policy "profile safety boundary" on public.profiles as restrictive for select to authenticated using(id=(select auth.uid()) or (private.is_account_active(id) and not private.is_blocked((select auth.uid()),id)));
create policy "post safety boundary" on public.posts as restrictive for select to authenticated using(removed_at is null and private.is_account_active(user_id) and not private.is_blocked((select auth.uid()),user_id));
create policy "comment safety boundary" on public.comments as restrictive for select to authenticated using(removed_at is null and private.is_account_active(user_id) and not private.is_blocked((select auth.uid()),user_id));
create policy "story safety boundary" on public.stories as restrictive for select to authenticated using(removed_at is null and private.is_account_active(user_id) and not private.is_blocked((select auth.uid()),user_id));
create policy "circle safety boundary" on public.circles as restrictive for select to authenticated using(removed_at is null);
-- Clients cannot undo moderator removal or assign themselves Circle privileges.
create or replace function private.protect_safety_fields() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') then
  if tg_table_name='circle_members' then
   if tg_op='INSERT' and new.role<>'member' then raise exception 'Role assignment is restricted'; end if;
   if tg_op='UPDATE' and new.role is distinct from old.role then raise exception 'Role assignment is restricted'; end if;
  elsif tg_op='INSERT' then new.removed_at:=null;
  elsif new.removed_at is distinct from old.removed_at then raise exception 'Moderation state is restricted'; end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['posts','comments','stories','circles','circle_members'] loop
 execute format('create trigger protect_safety before insert or update on public.%I for each row execute function private.protect_safety_fields()',t);
 end loop;
 foreach t in array array['posts','comments','stories','circles','likes','reactions','reposts','poll_votes','circle_members','circle_join_requests'] loop
 execute format('create policy "active writers" on public.%I as restrictive for insert to authenticated with check(private.is_account_active((select auth.uid())))',t);
 execute format('create policy "active editors" on public.%I as restrictive for update to authenticated using(private.is_account_active((select auth.uid()))) with check(private.is_account_active((select auth.uid())))',t);
 end loop;
end $$;

-- Validate poll definitions and voting independently of the client.
create or replace function private.validate_poll() returns trigger language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(new.options)<>'array' or jsonb_array_length(new.options) not between 2 and 4 or new.ends_at<=now() or new.ends_at>now()+interval '7 days' then raise exception 'A poll needs 2–4 options and an expiry within seven days'; end if;
 if exists(select 1 from jsonb_array_elements(new.options) o where nullif(btrim(o->>'id'),'') is null or char_length(btrim(coalesce(o->>'text',''))) not between 1 and 100) or (select count(distinct o->>'id') from jsonb_array_elements(new.options) o)<>jsonb_array_length(new.options) then raise exception 'Invalid poll options'; end if;
 return new;
end $$;
create trigger validate_poll before insert on public.polls for each row execute function private.validate_poll();
create or replace function private.validate_vote() returns trigger language plpgsql set search_path='' as $$ declare p public.polls%rowtype; begin
 select * into p from public.polls where id=new.poll_id;
 if p.id is null or p.ends_at<=now() or not exists(select 1 from jsonb_array_elements(p.options) o where o->>'id'=new.option_id) then raise exception 'This poll has closed or the option is invalid'; end if;
 new.post_id:=p.post_id; return new;
end $$;
create trigger validate_vote before insert or update on public.poll_votes for each row execute function private.validate_vote();
alter table public.posts add column if not exists nia_request_id uuid;
create unique index if not exists posts_nia_request on public.posts(user_id,nia_request_id) where nia_request_id is not null;
create or replace function public.publish_post(payload jsonb,poll jsonb default null) returns public.posts language plpgsql security invoker set search_path='' as $$ declare p public.posts; request_id uuid:=nullif(payload->>'nia_request_id','')::uuid; begin
 if request_id is not null then
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_id::text,0));
 select * into p from public.posts where user_id=auth.uid() and nia_request_id=request_id;
 if found then return p; end if;
 end if;
 insert into public.posts(nia_request_id,user_id,circle_id,content,media_url,media_type,extra_media,video_duration,language,category,contribution_mode,audience)
 values(request_id,auth.uid(),nullif(payload->>'circle_id','')::uuid,coalesce(nullif(btrim(payload->>'content'),''),nullif(btrim(poll->>'question'),'')),payload->>'media_url',payload->>'media_type',payload->'extra_media',nullif(payload->>'video_duration','')::numeric,payload->>'language',payload->>'category',coalesce(payload->>'contribution_mode','reflection'),case when exists(select 1 from public.profiles where id=auth.uid() and is_private) then 'followers' else coalesce(payload->>'audience','public') end) returning * into p;
 if poll is not null then insert into public.polls(post_id,question,options,ends_at) values(p.id,poll->>'question',poll->'options',(poll->>'ends_at')::timestamptz); end if;
 return p;
end $$;
revoke all on function public.publish_post(jsonb,jsonb) from public,anon;
grant execute on function public.publish_post(jsonb,jsonb) to authenticated;

-- Storage is private except avatars. Existing URLs remain identifiers; the app
-- proxies delivery using the user's JWT and these row-level permissions.
update storage.buckets set public=false where id in ('post-media','message-media','media','flicks');
-- Explicit restrictive boundaries neutralize old/live permissive policies.
create policy "Nia storage owner inserts" on storage.objects as restrictive for insert to authenticated with check(bucket_id not in ('avatars','post-media','message-media','media','flicks') or (owner_id=(select auth.uid())::text and (storage.foldername(name))[1]=(select auth.uid())::text and private.is_account_active((select auth.uid()))));
create policy "Nia storage owner updates" on storage.objects as restrictive for update to authenticated using(bucket_id not in ('avatars','post-media','message-media','media','flicks') or (owner_id=(select auth.uid())::text and private.is_account_active((select auth.uid())))) with check(bucket_id not in ('avatars','post-media','message-media','media','flicks') or (owner_id=(select auth.uid())::text and (storage.foldername(name))[1]=(select auth.uid())::text));
create policy "Nia storage owner deletes" on storage.objects as restrictive for delete to authenticated using(bucket_id not in ('avatars','post-media','message-media','media','flicks') or (owner_id=(select auth.uid())::text and private.is_account_active((select auth.uid()))));
drop policy if exists "active accounts delete media" on storage.objects;
drop policy if exists "active accounts update media" on storage.objects;
create or replace function private.media_matches(url text,bucket text,path text) returns boolean language sql immutable set search_path='' as $$
 select right(url,length('/storage/v1/object/public/'||bucket||'/'||path)) = '/storage/v1/object/public/'||bucket||'/'||path or url='storage://' || bucket || '/' || path;
$$;
-- This function is SECURITY INVOKER: parent rows must pass the viewer's RLS.
create or replace function private.can_read_media(bucket text,path text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.posts p where private.media_matches(p.media_url,bucket,path) or private.media_matches(p.thumbnail_url,bucket,path) or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p.extra_media)='array' then p.extra_media else '[]'::jsonb end) m where private.media_matches(m->>'url',bucket,path)))
 or exists(select 1 from public.comments c where private.media_matches(c.media_url,bucket,path) or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(c.extra_media)='array' then c.extra_media else '[]'::jsonb end) m where private.media_matches(m->>'url',bucket,path)))
 or exists(select 1 from public.stories s where s.expires_at>now() and private.media_matches(s.media_url,bucket,path))
 or exists(select 1 from public.messages m where m.deleted_at is null and not m.view_once and private.media_matches(m.media_url,bucket,path));
$$;
revoke all on function private.media_matches(text,text,text),private.can_read_media(text,text) from public,anon;
grant execute on function private.media_matches(text,text,text),private.can_read_media(text,text) to authenticated;
drop policy if exists "public reads Nia media" on storage.objects;
create policy "Nia media read" on storage.objects for select to authenticated using(bucket_id='avatars' or (bucket_id in ('post-media','message-media','media','flicks') and private.can_read_media(bucket_id,name)));
create policy "Nia media read boundary" on storage.objects as restrictive for select to authenticated using(bucket_id not in ('post-media','message-media','media','flicks') or private.can_read_media(bucket_id,name));
create policy "Nia anonymous private boundary" on storage.objects as restrictive for select to anon using(bucket_id not in ('post-media','message-media','media','flicks'));

-- Content validators: prevent clients publishing somebody else's object to
-- manufacture a readable reference. Existing records are left intact.
create or replace function private.validate_media_reference(url text) returns boolean language sql stable security definer set search_path='' as $$
 select url is null or (url !~ '/storage/v1/object/' and url !~ '^storage://' and url ~ '^https://(media[.]giphy[.]com|media[.]tenor[.]com)/') or exists(select 1 from storage.objects o where o.owner_id=auth.uid()::text and private.media_matches(url,o.bucket_id,o.name));
$$;
create or replace function private.validate_content_media() returns trigger language plpgsql set search_path='' as $$ declare m jsonb; begin
 if current_user not in ('authenticated','anon') then return new; end if;
 if tg_op='INSERT' or new.media_url is distinct from old.media_url then
  if not private.validate_media_reference(new.media_url) then raise exception 'Media must belong to the author'; end if;
 end if;
 if tg_table_name in ('posts','comments') then
  if tg_op='INSERT' or new.extra_media is distinct from old.extra_media then
   for m in select * from jsonb_array_elements(case when jsonb_typeof(new.extra_media)='array' then new.extra_media else '[]'::jsonb end) loop
    if not private.validate_media_reference(m->>'url') then raise exception 'Media must belong to the author'; end if;
   end loop;
  end if;
 end if;
 if tg_table_name='posts' then
 if tg_op='INSERT' or new.thumbnail_url is distinct from old.thumbnail_url then
  if not private.validate_media_reference(new.thumbnail_url) then raise exception 'Thumbnail must belong to the author'; end if;
 end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_media_reference(text) from public,anon;
grant execute on function private.validate_media_reference(text) to authenticated;
do $$ declare t text; begin foreach t in array array['posts','comments','stories','messages'] loop execute format('create trigger validate_content_media before insert or update on public.%I for each row execute function private.validate_content_media()',t); end loop; end $$;
commit;
