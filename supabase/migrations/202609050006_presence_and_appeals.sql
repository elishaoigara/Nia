begin;
-- Private Realtime channels: only the two named users, with bilateral opt-in.
create function private.can_join_presence(topic text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare ids text[]; a uuid; b uuid;
begin
 if topic !~ '^presence-[0-9a-f-]{36}_[0-9a-f-]{36}$' then return false; end if;
 ids:=string_to_array(substr(topic,10),'_');
 begin a:=ids[1]::uuid; b:=ids[2]::uuid; exception when invalid_text_representation then return false; end;
 return auth.uid() in (a,b) and a<>b and not private.is_blocked(a,b)
 and private.is_account_active(a) and private.is_account_active(b)
 and exists(select 1 from public.user_preferences where user_id=a and show_presence)
 and exists(select 1 from public.user_preferences where user_id=b and show_presence);
end $$;
revoke all on function private.can_join_presence(text) from public,anon;
grant execute on function private.can_join_presence(text) to authenticated;
create policy "nia private presence read" on realtime.messages for select to authenticated using(extension in ('presence','broadcast') and private.can_join_presence((select realtime.topic())));
create policy "nia private presence send" on realtime.messages for insert to authenticated with check(extension in ('presence','broadcast') and private.can_join_presence((select realtime.topic())));
create policy "nia presence read boundary" on realtime.messages as restrictive for select to authenticated using((select realtime.topic()) not like 'presence-%' or private.can_join_presence((select realtime.topic())));
create policy "nia presence send boundary" on realtime.messages as restrictive for insert to authenticated with check((select realtime.topic()) not like 'presence-%' or private.can_join_presence((select realtime.topic())));

create function public.review_appeal(appeal_id uuid,approve boolean,explanation text) returns void language plpgsql security definer set search_path='' as $$
declare appeal public.moderation_appeals; original public.moderation_actions; r jsonb;
begin
 if not private.is_moderator() or char_length(btrim(explanation)) not between 5 and 1000 then raise exception 'Moderator and explanation required'; end if;
 select * into appeal from public.moderation_appeals where id=appeal_id and status='pending' for update;
 if appeal.id is null then raise exception 'Pending appeal unavailable'; end if;
 select * into original from public.moderation_actions where id=appeal.action_id;
 if original.moderator_id=auth.uid() then raise exception 'Another moderator must review this appeal'; end if;
 if approve then
  if original.action='suspend' then update public.account_settings set account_status='active',status_until=null where user_id=appeal.user_id;
  elsif original.action='remove' then
   execute format('select to_jsonb(r) from public.%I r where id=$1',original.source) into r using original.report_id;
   if original.source='circle_reports' then update public.circles set removed_at=null where id=(r->>'circle_id')::uuid;
   elsif original.source='opportunity_reports' then update public.circle_opportunities set removed_at=null where id=(r->>'opportunity_id')::uuid;
   elsif r->>'entity_type'='post' then update public.posts set removed_at=null where id=(r->>'entity_id')::uuid;
   elsif r->>'entity_type'='comment' then update public.comments set removed_at=null where id=(r->>'entity_id')::uuid;
   elsif original.source='message_reports' then raise exception 'Deleted messages cannot be restored';
   end if;
  end if;
 end if;
 update public.moderation_appeals set status=case when approve then 'accepted' else 'declined' end,reviewed_by=auth.uid() where id=appeal_id;
 insert into public.moderation_actions(moderator_id,target_user_id,action,notes,source,evidence) values(auth.uid(),appeal.user_id,case when approve then 'appeal_accepted' else 'appeal_declined' end,explanation,'appeal',to_jsonb(original));
 insert into public.notifications(user_id,actor_id,type,entity_id,message) values(appeal.user_id,auth.uid(),'report_outcome',appeal_id,explanation);
end $$;
revoke all on function public.review_appeal(uuid,boolean,text) from public,anon;
grant execute on function public.review_appeal(uuid,boolean,text) to authenticated;
commit;
