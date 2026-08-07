-- Nia baseline schema
-- Apply with `supabase db push` to a new Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{2,30}$'),
  full_name text,
  avatar_url text,
  banner_url text,
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 500),
  website text,
  country text,
  city text,
  university text,
  language text,
  languages text[],
  interests text[],
  last_seen_at timestamptz,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 500),
  university text,
  country text,
  category text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table public.circle_join_requests (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  circle_id uuid references public.circles(id) on delete cascade,
  content text check (char_length(content) <= 500),
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'video', 'gif')),
  extra_media jsonb,
  thumbnail_url text,
  video_duration numeric check (video_duration is null or video_duration >= 0),
  language text,
  category text check (category is null or category in ('comedy', 'music', 'sports', 'news', 'education', 'culture', 'tech', 'vlogs', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (content is not null or media_url is not null)
);

create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete set null,
  content text check (char_length(content) <= 500),
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'video', 'gif')),
  extra_media jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (content is not null or media_url is not null)
);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  options jsonb not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_id text not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table public.hashtags (
  id bigint generated always as identity primary key,
  tag text not null check (tag ~ '^[[:alnum:]_]{1,80}$'),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  country text,
  created_at timestamptz not null default now(),
  unique (tag, post_id)
);

create table public.post_views (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours')
);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text check (char_length(content) <= 5000),
  media_url text,
  media_type text,
  file_name text,
  view_once boolean not null default false,
  viewed_at timestamptz,
  reply_to uuid references public.messages(id) on delete set null,
  is_read boolean not null default false,
  reactions jsonb not null default '{}'::jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  check (content is not null or media_url is not null)
);

create table public.message_requests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  other_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, other_id),
  check (user_id <> other_id)
);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  entity_id uuid,
  message text not null check (char_length(message) <= 500),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  phone text not null,
  checkout_request_id text not null unique,
  mpesa_ref text unique,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verified_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  payment_ref text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_verified is distinct from old.is_verified then
    raise exception 'is_verified can only be changed by a trusted service';
  end if;
  new.id = old.id;
  new.created_at = old.created_at;
  return new;
end;
$$;

create or replace function public.protect_message_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id = old.id;
  new.sender_id = old.sender_id;
  new.recipient_id = old.recipient_id;
  new.created_at = old.created_at;

  if auth.uid() is not null
    and (new.reactions - auth.uid()::text) is distinct from (old.reactions - auth.uid()::text) then
    raise exception 'Users can only change their own message reaction';
  end if;

  if auth.uid() is distinct from old.sender_id then
    if new.content is distinct from old.content
      or new.media_url is distinct from old.media_url
      or new.media_type is distinct from old.media_type
      or new.file_name is distinct from old.file_name
      or new.view_once is distinct from old.view_once
      or new.reply_to is distinct from old.reply_to
      or new.edited_at is distinct from old.edited_at
      or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Recipients cannot alter sender-owned message content';
    end if;
  end if;
  return new;
end;
$$;

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_circle_created_idx on public.posts (circle_id, created_at desc) where circle_id is not null;
create index posts_video_created_idx on public.posts (created_at desc) where media_type = 'video';
create index comments_post_created_idx on public.comments (post_id, created_at);
create index hashtags_tag_created_idx on public.hashtags (tag, created_at desc);
create index messages_sender_created_idx on public.messages (sender_id, created_at desc);
create index messages_recipient_created_idx on public.messages (recipient_id, created_at desc);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index stories_expires_idx on public.stories (expires_at);

create trigger profiles_protect_fields before update on public.profiles for each row execute function public.protect_profile_fields();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger circles_set_updated_at before update on public.circles for each row execute function public.set_updated_at();
create trigger circle_requests_set_updated_at before update on public.circle_join_requests for each row execute function public.set_updated_at();
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();
create trigger messages_protect_fields before update on public.messages for each row execute function public.protect_message_fields();
create trigger message_requests_set_updated_at before update on public.message_requests for each row execute function public.set_updated_at();
create trigger tips_set_updated_at before update on public.tips for each row execute function public.set_updated_at();
create trigger verified_payments_set_updated_at before update on public.verified_payments for each row execute function public.set_updated_at();

create or replace function public.create_message_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.follows
    where follower_id = new.recipient_id and following_id = new.sender_id
  ) then
    insert into public.message_requests (user_id, other_id, status)
    values (new.recipient_id, new.sender_id, 'pending')
    on conflict (user_id, other_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger messages_create_request after insert on public.messages
for each row execute function public.create_message_request();

create or replace function public.accept_circle_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.circle_join_requests%rowtype;
begin
  select * into request_row
  from public.circle_join_requests
  where id = request_id and status = 'pending'
  for update;

  if request_row.id is null then
    raise exception 'Join request not found';
  end if;
  if not exists (
    select 1 from public.circle_members
    where circle_id = request_row.circle_id and user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (request_row.circle_id, request_row.user_id)
  on conflict do nothing;

  update public.circle_join_requests
  set status = 'accepted'
  where id = request_row.id;
end;
$$;

revoke all on function public.accept_circle_join_request(uuid) from public;
grant execute on function public.accept_circle_join_request(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_join_requests enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_views enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.messages enable row level security;
alter table public.message_requests enable row level security;
alter table public.message_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.tips enable row level security;
alter table public.verified_payments enable row level security;

create policy "authenticated users read profiles" on public.profiles for select to authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "authenticated users read follows" on public.follows for select to authenticated using (true);
create policy "users create own follows" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "users delete own follows" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "users read own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid() or blocked_id = auth.uid());
create policy "users create own blocks" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "users delete own blocks" on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy "users read own mutes" on public.mutes for select to authenticated using (muter_id = auth.uid());
create policy "users create own mutes" on public.mutes for insert to authenticated with check (muter_id = auth.uid());
create policy "users delete own mutes" on public.mutes for delete to authenticated using (muter_id = auth.uid());

create policy "authenticated users read circles" on public.circles for select to authenticated using (true);
create policy "users create circles" on public.circles for insert to authenticated with check (created_by = auth.uid());
create policy "creators update circles" on public.circles for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "creators delete circles" on public.circles for delete to authenticated using (created_by = auth.uid());
create policy "authenticated users read circle members" on public.circle_members for select to authenticated using (true);
create policy "users join public circles" on public.circle_members for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.circles c where c.id = circle_id and (not c.is_private or c.created_by = auth.uid())
  )
);
create policy "users leave circles" on public.circle_members for delete to authenticated using (user_id = auth.uid());
create policy "users and members read join requests" on public.circle_join_requests for select to authenticated using (
  user_id = auth.uid() or exists (
    select 1 from public.circle_members m where m.circle_id = circle_id and m.user_id = auth.uid()
  )
);
create policy "users create own join requests" on public.circle_join_requests for insert to authenticated with check (user_id = auth.uid());
create policy "users update own join requests" on public.circle_join_requests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members moderate join requests" on public.circle_join_requests for update to authenticated using (
  exists (select 1 from public.circle_members m where m.circle_id = circle_id and m.user_id = auth.uid())
);
create policy "users delete own join requests" on public.circle_join_requests for delete to authenticated using (user_id = auth.uid());

create policy "authenticated users read posts" on public.posts for select to authenticated using (true);
create policy "users create own posts" on public.posts for insert to authenticated with check (
  user_id = auth.uid() and (
    circle_id is null or exists (
      select 1 from public.circle_members m where m.circle_id = posts.circle_id and m.user_id = auth.uid()
    )
  )
);
create policy "users update own posts" on public.posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own posts" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "authenticated users read likes" on public.likes for select to authenticated using (true);
create policy "users create own likes" on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own likes" on public.likes for delete to authenticated using (user_id = auth.uid());
create policy "authenticated users read reposts" on public.reposts for select to authenticated using (true);
create policy "users create own reposts" on public.reposts for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own reposts" on public.reposts for delete to authenticated using (user_id = auth.uid());
create policy "users read own bookmarks" on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "users create own bookmarks" on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own bookmarks" on public.bookmarks for delete to authenticated using (user_id = auth.uid());
create policy "authenticated users read reactions" on public.reactions for select to authenticated using (true);
create policy "users create own reactions" on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own reactions" on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy "authenticated users read comments" on public.comments for select to authenticated using (true);
create policy "users create own comments" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "users update own comments" on public.comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own comments" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "authenticated users read comment likes" on public.comment_likes for select to authenticated using (true);
create policy "users create own comment likes" on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own comment likes" on public.comment_likes for delete to authenticated using (user_id = auth.uid());

create policy "authenticated users read polls" on public.polls for select to authenticated using (true);
create policy "post owners create polls" on public.polls for insert to authenticated with check (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy "authenticated users read poll votes" on public.poll_votes for select to authenticated using (true);
create policy "users create own poll votes" on public.poll_votes for insert to authenticated with check (user_id = auth.uid());
create policy "authenticated users read hashtags" on public.hashtags for select to authenticated using (true);
create policy "post owners create hashtags" on public.hashtags for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy "authenticated users read post views" on public.post_views for select to authenticated using (true);
create policy "users create own post views" on public.post_views for insert to authenticated with check (user_id = auth.uid());

create policy "authenticated users read active stories" on public.stories for select to authenticated using (expires_at > now());
create policy "users create own stories" on public.stories for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own stories" on public.stories for delete to authenticated using (user_id = auth.uid());
create policy "viewers and story owners read story views" on public.story_views for select to authenticated using (
  viewer_id = auth.uid() or exists (
    select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid()
  )
);
create policy "users create own story views" on public.story_views for insert to authenticated with check (viewer_id = auth.uid());
create policy "users update own story views" on public.story_views for update to authenticated using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());

create policy "participants read messages" on public.messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "users send own messages" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = sender_id and b.blocked_id = recipient_id)
       or (b.blocker_id = recipient_id and b.blocked_id = sender_id)
  )
);
create policy "participants update messages" on public.messages for update to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "users read own message requests" on public.message_requests for select to authenticated using (user_id = auth.uid());
create policy "users update own message requests" on public.message_requests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users file reports" on public.message_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "users read own reports" on public.message_reports for select to authenticated using (reporter_id = auth.uid());

create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "actors create notifications" on public.notifications for insert to authenticated with check (actor_id = auth.uid() and user_id <> auth.uid());
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read related tips" on public.tips for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "users create own pending tips" on public.tips for insert to authenticated with check (
  sender_id = auth.uid() and status = 'pending' and mpesa_ref is null
);
create policy "users read own verification payments" on public.verified_payments for select to authenticated using (user_id = auth.uid());

-- Public media buckets. Object writes are still restricted to their owner.
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('post-media', 'post-media', true),
  ('media', 'media', true),
  ('message-media', 'message-media', true),
  ('flicks', 'flicks', true)
on conflict (id) do update set public = excluded.public;

create policy "public reads Nia media" on storage.objects for select to public using (
  bucket_id in ('avatars', 'post-media', 'media', 'message-media', 'flicks')
);
create policy "users upload Nia media" on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars', 'post-media', 'media', 'message-media', 'flicks') and owner_id = auth.uid()::text
);
create policy "users update own Nia media" on storage.objects for update to authenticated using (
  bucket_id in ('avatars', 'post-media', 'media', 'message-media', 'flicks') and owner_id = auth.uid()::text
) with check (owner_id = auth.uid()::text);
create policy "users delete own Nia media" on storage.objects for delete to authenticated using (
  bucket_id in ('avatars', 'post-media', 'media', 'message-media', 'flicks') and owner_id = auth.uid()::text
);
