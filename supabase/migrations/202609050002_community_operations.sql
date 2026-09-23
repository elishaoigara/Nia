begin;
create or replace function private.is_moderator() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.moderator_roles where user_id=auth.uid()) and private.is_account_active(auth.uid()); $$;
revoke all on function private.is_moderator() from public,anon;
grant execute on function private.is_moderator() to authenticated;
-- Staff actions must go through the audited transaction below.
drop policy if exists "Moderators create moderation actions" on public.moderation_actions;
drop policy if exists "Moderators update reports" on public.reports;
drop policy if exists "Moderators update message reports" on public.message_reports;
drop policy if exists "Moderators update circle reports" on public.circle_reports;
create or replace function public.report_evidence(report_source text,report_uuid uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare r jsonb; result jsonb; begin
 if not private.is_moderator() then raise exception 'Moderator access required'; end if;
 if report_source not in ('reports','message_reports','circle_reports','opportunity_reports') then raise exception 'Invalid report source'; end if;
 execute format('select to_jsonb(r) from public.%I r where id=$1',report_source) into r using report_uuid;
 if r is null then raise exception 'Report unavailable'; end if;
 if report_source='opportunity_reports' then select to_jsonb(o) into result from public.circle_opportunities o where id=(r->>'opportunity_id')::uuid;
 elsif report_source='message_reports' then select jsonb_build_object('content',m.content,'media_url',m.media_url,'media_type',m.media_type,'sender_id',m.sender_id,'created_at',m.created_at) into result from public.messages m where id=(r->>'message_id')::uuid;
 elsif report_source='circle_reports' then select jsonb_build_object('name',c.name,'description',c.description,'created_by',c.created_by) into result from public.circles c where id=(r->>'circle_id')::uuid;
 elsif r->>'entity_type'='post' then select jsonb_build_object('content',p.content,'media_url',p.media_url,'user_id',p.user_id) into result from public.posts p where id=(r->>'entity_id')::uuid;
 elsif r->>'entity_type'='comment' then select jsonb_build_object('content',c.content,'media_url',c.media_url,'user_id',c.user_id) into result from public.comments c where id=(r->>'entity_id')::uuid;
 elsif r->>'entity_type'='profile' then select jsonb_build_object('user_id',p.id,'username',p.username,'bio',p.bio) into result from public.profiles p where id=(r->>'entity_id')::uuid;
 end if;
 return coalesce(result,'{}');
end $$;
create or replace function public.moderate_report(report_source text,report_uuid uuid,decision text,explanation text) returns void language plpgsql security definer set search_path='' as $$ declare r jsonb; target uuid; snapshot jsonb; begin
 if not private.is_moderator() then raise exception 'Moderator access required'; end if;
 if report_source not in ('reports','message_reports','circle_reports','opportunity_reports') or decision not in ('reviewed','resolved','remove','suspend') or char_length(btrim(explanation)) not between 5 and 1000 then raise exception 'Choose an action and explain your decision'; end if;
 execute format('select to_jsonb(r) from public.%I r where id=$1 for update',report_source) into r using report_uuid;
 if r is null then raise exception 'Report unavailable'; end if;
 snapshot:=public.report_evidence(report_source,report_uuid);
 target:=coalesce(nullif(snapshot->>'user_id',''),nullif(snapshot->>'sender_id',''),nullif(snapshot->>'created_by',''),nullif(r->>'reported_user_id',''))::uuid;
 if decision='remove' then
  if report_source='opportunity_reports' then update public.circle_opportunities set removed_at=now() where id=(r->>'opportunity_id')::uuid;
  elsif report_source='message_reports' then update public.messages set deleted_at=now() where id=(r->>'message_id')::uuid;
  elsif report_source='circle_reports' then update public.circles set removed_at=now() where id=(r->>'circle_id')::uuid;
  elsif r->>'entity_type'='post' then update public.posts set removed_at=now() where id=(r->>'entity_id')::uuid;
  elsif r->>'entity_type'='comment' then update public.comments set removed_at=now() where id=(r->>'entity_id')::uuid;
  else raise exception 'Use account suspension for a profile report'; end if;
 elsif decision='suspend' then
  if target is null or target=auth.uid() or exists(select 1 from public.moderator_roles where user_id=target) then raise exception 'Account cannot be suspended here'; end if;
  insert into public.account_settings(user_id,account_status,status_until) values(target,'suspended',null) on conflict(user_id) do update set account_status='suspended',status_until=null;
 end if;
 execute format('update public.%I set status=$1 where id=$2',report_source) using case when decision='reviewed' then 'reviewed' else 'resolved' end,report_uuid;
 insert into public.moderation_actions(moderator_id,report_id,target_user_id,action,notes,source,evidence) values(auth.uid(),report_uuid,target,decision,explanation,report_source,snapshot);
 insert into public.notifications(user_id,actor_id,type,entity_id,message) values((r->>'reporter_id')::uuid,auth.uid(),'report_outcome',report_uuid,'Your report was '||case when decision='reviewed' then 'reviewed.' else 'resolved.' end);
 if target is not null and decision in ('remove','suspend') then insert into public.notifications(user_id,actor_id,type,entity_id,message) values(target,auth.uid(),'enforcement',report_uuid,left('Moderation decision: '||explanation||'. Review or appeal in Safety.',500)); end if;
end $$;
revoke all on function public.report_evidence(text,uuid),public.moderate_report(text,uuid,text,text) from public,anon;
grant execute on function public.report_evidence(text,uuid),public.moderate_report(text,uuid,text,text) to authenticated;
create policy "staff appeals read" on public.moderation_appeals for select to authenticated using(private.is_moderator());

revoke all on function private.accept_circle_join_request(uuid) from authenticated;
-- Circle managers approve joins; ordinary members cannot promote themselves.
create or replace function public.accept_circle_join_request(request_id uuid) returns void language plpgsql security definer set search_path='' as $$ declare r public.circle_join_requests; begin
 select * into r from public.circle_join_requests where id=request_id and status='pending' for update;
 if r.id is null or not private.can_manage_circle(r.circle_id) or not private.is_account_active(auth.uid()) then raise exception 'Circle manager access required'; end if;
 insert into public.circle_members(circle_id,user_id) values(r.circle_id,r.user_id) on conflict do nothing;
 update public.circle_join_requests set status='accepted' where id=r.id;
end $$;
create or replace function public.manage_circle_member(target_circle uuid,target_user uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.circles where id=target_circle and created_by=auth.uid()) or not private.is_account_active(auth.uid()) then raise exception 'Circle owner access required'; end if;
 if new_role not in ('member','moderator','remove') or target_user=auth.uid() then raise exception 'Invalid member change'; end if;
 if new_role='remove' then delete from public.circle_members where circle_id=target_circle and user_id=target_user;
 else update public.circle_members set role=new_role where circle_id=target_circle and user_id=target_user; end if;
end $$;
revoke all on function public.manage_circle_member(uuid,uuid,text) from public,anon;
grant execute on function public.manage_circle_member(uuid,uuid,text) to authenticated;
drop policy if exists "members update circle requests" on public.circle_join_requests;
create policy "managers update requests" on public.circle_join_requests for update to authenticated using(private.can_manage_circle(circle_id)) with check(private.can_manage_circle(circle_id));
create policy "managers read requests" on public.circle_join_requests for select to authenticated using(private.can_manage_circle(circle_id));
create policy "manager request read boundary" on public.circle_join_requests as restrictive for select to authenticated using(user_id=auth.uid() or private.can_manage_circle(circle_id));
create or replace function public.circle_manager(target_circle uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.can_manage_circle(target_circle); $$;
revoke all on function public.circle_manager(uuid) from public,anon;
grant execute on function public.circle_manager(uuid) to authenticated;

-- Move structured responses into the regular post stream without losing IDs or
-- authorship. Short existing content is preserved; long responses remain in the
-- original archive and are linked through the same ID for operator recovery.
alter table public.posts add column legacy_members_only boolean not null default false;
create policy "legacy response membership" on public.posts as restrictive for select to authenticated using(not legacy_members_only or private.is_circle_member(circle_id,auth.uid()) or private.can_manage_circle(circle_id));
insert into public.posts(id,user_id,circle_id,content,contribution_mode,created_at,legacy_members_only)
select id,user_id,circle_id,left(content,500),case response_type when 'offer' then 'offer' when 'question' then 'ask' when 'update' then 'update' else 'reflection' end,created_at,true from public.circle_responses on conflict(id) do nothing;
-- Keep the legacy table read-only for backwards recovery.
revoke insert,update,delete on public.circle_responses from authenticated;

create table public.circle_opportunities (
 id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.circles(id) on delete cascade,
 created_by uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 120), description text not null check(char_length(description) between 10 and 2000),
 source_url text not null check(source_url ~ '^https://'), location text not null check(char_length(location) between 2 and 120),
 eligibility text not null check(char_length(eligibility) between 2 and 500), compensation text check(char_length(compensation)<=120),
 removed_at timestamptz, deadline timestamptz not null, created_at timestamptz not null default now()
);
create table public.opportunity_saves (opportunity_id uuid references public.circle_opportunities(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,primary key(opportunity_id,user_id));
create table public.opportunity_reports (id uuid primary key default gen_random_uuid(),opportunity_id uuid references public.circle_opportunities(id) on delete cascade,reporter_id uuid references public.profiles(id) on delete cascade,status text not null default 'pending' check(status in ('pending','reviewed','resolved')),reason text not null check(char_length(reason) between 5 and 1000),created_at timestamptz not null default now());
create table public.circle_events (
 id uuid primary key default gen_random_uuid(),circle_id uuid not null references public.circles(id) on delete cascade,created_by uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 120),location text not null check(char_length(location) between 2 and 200),starts_at timestamptz not null,details text check(char_length(details)<=2000),created_at timestamptz not null default now()
);
create table public.event_rsvps (event_id uuid references public.circle_events(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,primary key(event_id,user_id));
alter table public.circle_opportunities enable row level security;
alter table public.opportunity_saves enable row level security;
alter table public.opportunity_reports enable row level security;
alter table public.circle_events enable row level security;
alter table public.event_rsvps enable row level security;
create policy "members read opportunities" on public.circle_opportunities for select to authenticated using(removed_at is null and (private.is_circle_member(circle_id,auth.uid()) or private.can_manage_circle(circle_id)));
create policy "managers publish opportunities" on public.circle_opportunities for insert to authenticated with check(created_by=auth.uid() and private.can_manage_circle(circle_id) and deadline>now() and private.is_account_active(auth.uid()));
create policy "managers delete opportunities" on public.circle_opportunities for delete to authenticated using(private.can_manage_circle(circle_id));
create policy "own opportunity saves" on public.opportunity_saves for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.circle_opportunities where id=opportunity_id));
create policy "report visible opportunity" on public.opportunity_reports for insert to authenticated with check(reporter_id=auth.uid() and exists(select 1 from public.circle_opportunities where id=opportunity_id));
create policy "own or staff opportunity reports" on public.opportunity_reports for select to authenticated using(reporter_id=auth.uid() or private.is_moderator());
create policy "members read events" on public.circle_events for select to authenticated using(private.is_circle_member(circle_id,auth.uid()) or private.can_manage_circle(circle_id));
create policy "managers publish events" on public.circle_events for insert to authenticated with check(created_by=auth.uid() and private.can_manage_circle(circle_id) and starts_at>now() and private.is_account_active(auth.uid()));
create policy "managers delete events" on public.circle_events for delete to authenticated using(private.can_manage_circle(circle_id));
create policy "own event rsvp" on public.event_rsvps for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.circle_events where id=event_id and starts_at>now()));
create index opportunity_circle_deadline on public.circle_opportunities(circle_id,deadline);
create index events_circle_start on public.circle_events(circle_id,starts_at);

-- A conversation is paginated by its latest message, not a truncated pool of
-- individual messages. SECURITY INVOKER preserves participant RLS.
create or replace function public.conversation_page(before_time timestamptz default null,before_user uuid default null,page_size integer default 20)
returns table(other_id uuid,content text,created_at timestamptz,is_read boolean,sender_id uuid,media_type text) language sql stable security invoker set search_path='' as $$
 with latest as (select distinct on (case when m.sender_id=auth.uid() then m.recipient_id else m.sender_id end)
 case when m.sender_id=auth.uid() then m.recipient_id else m.sender_id end other_id,case when m.deleted_at is null then m.content else 'Message removed' end content,m.created_at,m.is_read,m.sender_id,case when m.deleted_at is null then m.media_type else null end media_type
 from public.messages m where m.sender_id=auth.uid() or m.recipient_id=auth.uid()
 order by case when m.sender_id=auth.uid() then m.recipient_id else m.sender_id end,m.created_at desc,m.id desc)
 select * from latest l where before_time is null or (l.created_at,l.other_id)<(before_time,before_user) order by l.created_at desc,l.other_id desc limit greatest(1,least(page_size,50));
$$;
revoke all on function public.conversation_page(timestamptz,uuid,integer) from public,anon;
grant execute on function public.conversation_page(timestamptz,uuid,integer) to authenticated;
commit;
