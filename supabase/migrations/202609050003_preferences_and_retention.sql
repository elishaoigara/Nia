begin;
-- Privacy preferences govern server-visible state as well as UI controls.
create table public.message_read_states(message_id uuid references public.messages(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,read_at timestamptz not null default now(),primary key(message_id,user_id));
alter table public.message_read_states enable row level security;
create policy "own read state" on public.message_read_states for select to authenticated using(user_id=auth.uid());
create or replace function public.mark_conversation_read(other_user uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.message_read_states(message_id,user_id) select id,auth.uid() from public.messages where recipient_id=auth.uid() and sender_id=other_user on conflict do nothing;
 if coalesce((select read_receipts from public.user_preferences where user_id=auth.uid()),false) then update public.messages set is_read=true where recipient_id=auth.uid() and sender_id=other_user; end if;
end $$;
create or replace function public.unread_message_count() returns bigint language sql stable security invoker set search_path='' as $$
 select count(*) from public.messages m where recipient_id=auth.uid() and deleted_at is null and not exists(select 1 from public.message_read_states r where r.message_id=m.id and r.user_id=auth.uid());
$$;
revoke all on function public.mark_conversation_read(uuid),public.unread_message_count() from public,anon;
grant execute on function public.mark_conversation_read(uuid),public.unread_message_count() to authenticated;
create or replace function public.protect_message_fields() returns trigger language plpgsql set search_path='' as $$ begin
 if current_user in ('authenticated','anon') then
  new.id:=old.id; new.sender_id:=old.sender_id; new.recipient_id:=old.recipient_id; new.created_at:=old.created_at;
  if (new.reactions-auth.uid()::text) is distinct from (old.reactions-auth.uid()::text) then raise exception 'Only your reaction can change'; end if;
  if auth.uid() is distinct from old.sender_id and (new.content is distinct from old.content or new.media_url is distinct from old.media_url or new.media_type is distinct from old.media_type or new.file_name is distinct from old.file_name or new.reply_to is distinct from old.reply_to or new.story_id is distinct from old.story_id or new.deleted_at is distinct from old.deleted_at or new.edited_at is distinct from old.edited_at) then raise exception 'Only the sender can edit a message'; end if;
  new.view_once:=old.view_once; new.viewed_at:=old.viewed_at;
  -- Public read receipts are only written through mark_conversation_read.
  new.is_read:=old.is_read;
 end if;
 if new.deleted_at is not null then new.content:='Message removed';new.media_url:=null;new.media_type:=null;new.file_name:=null;new.reactions:='{}'; end if;
 return new;
end $$;
-- Clear stale presence when someone opts out. Only the private channel publishes
-- live presence; last_seen_at is no longer a public tracking field.
update public.profiles set last_seen_at=null;
create or replace function public.protect_profile_fields() returns trigger language plpgsql set search_path='' as $$ begin
 new.id:=old.id;new.created_at:=old.created_at;new.last_seen_at:=null;return new;
end $$;

alter table public.notifications add column if not exists deliver_after timestamptz not null default now();
create policy "notification delivery time" on public.notifications as restrictive for select to authenticated using(deliver_after<=now());
create or replace function private.notification_preferences() returns trigger language plpgsql security definer set search_path='' as $$ declare p public.user_preferences; local_time timestamp; delivery timestamp; begin
 select * into p from public.user_preferences where user_id=new.user_id;
 if p.user_id is null or new.type in ('report_outcome','enforcement') then return new; end if;
 if (new.type in ('comment','reply') and not p.notify_replies) or (new.type='message' and not p.notify_messages) or (new.type in ('circle','circle_join','circle_response','circle_resource') and not p.notify_circles) then return null; end if;
 if not exists(select 1 from pg_timezone_names where name=p.timezone) then raise exception 'Invalid timezone'; end if;
 local_time:=now() at time zone p.timezone;
 delivery:=local_time;
 if p.digest then delivery:=date_trunc('day',local_time)+interval '1 day 8 hours'; end if;
 if p.quiet_start is not null and p.quiet_end is not null then
  if p.quiet_start<p.quiet_end and delivery::time>=p.quiet_start and delivery::time<p.quiet_end then delivery:=delivery::date+p.quiet_end;
  elsif p.quiet_start>p.quiet_end and (delivery::time>=p.quiet_start or delivery::time<p.quiet_end) then delivery:=delivery::date+p.quiet_end+case when delivery::time>=p.quiet_start then interval '1 day' else interval '0' end; end if;
 end if;
 new.deliver_after:=delivery at time zone p.timezone;return new;
end $$;
create trigger notification_preferences before insert on public.notifications for each row execute function private.notification_preferences();

-- Owner reads support upload resume and deletion, including unreferenced files.
drop policy "Nia media read boundary" on storage.objects;
create policy "Nia media read boundary" on storage.objects as restrictive for select to authenticated using(bucket_id not in ('post-media','message-media','media','flicks') or owner_id=auth.uid()::text or private.can_read_media(bucket_id,name));
create policy "Nia owner media read" on storage.objects for select to authenticated using(bucket_id in ('post-media','message-media','media','flicks') and owner_id=auth.uid()::text);

-- Staging-only fixture authors are explicitly enrolled by an operator.
create table public.test_profiles(user_id uuid primary key references public.profiles(id) on delete cascade);
alter table public.test_profiles enable row level security;
-- Quarantine only deterministic IDs produced by the checked-in test seed.
update public.posts set removed_at=now() where id in (
 select md5('nia-test-seed-v1-'||kind||'-'||n::text)::uuid from (values('text',8),('image',6),('video',8)) s(kind,total) cross join lateral generate_series(1,total) n
) and content like '%#nia_seed_v1%';

-- Delete-account preparation removes owned Circles (whose owner FK restricts
-- deletion) only after explicit user confirmation in the authenticated API.
create or replace function public.prepare_account_deletion() returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from public.circles where created_by=auth.uid();
end $$;
revoke all on function public.prepare_account_deletion() from public,anon;
grant execute on function public.prepare_account_deletion() to authenticated;
commit;
