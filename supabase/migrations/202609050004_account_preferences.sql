begin;
create or replace function public.save_preferences(settings jsonb,private_account boolean) returns void language plpgsql security invoker set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from pg_timezone_names where name=settings->>'timezone') then raise exception 'Choose a valid timezone'; end if;
 if (nullif(settings->>'quiet_start','') is null) <> (nullif(settings->>'quiet_end','') is null) then raise exception 'Set both quiet-hours times or leave both empty'; end if;
 insert into public.user_preferences(user_id,data_saver,autoplay,interface_language,content_languages,dm_policy,show_presence,read_receipts,notify_replies,notify_messages,notify_circles,digest,quiet_start,quiet_end,timezone)
 values(auth.uid(),(settings->>'data_saver')::boolean,(settings->>'autoplay')::boolean,settings->>'interface_language',array(select jsonb_array_elements_text(settings->'content_languages')),settings->>'dm_policy',(settings->>'show_presence')::boolean,(settings->>'read_receipts')::boolean,(settings->>'notify_replies')::boolean,(settings->>'notify_messages')::boolean,(settings->>'notify_circles')::boolean,(settings->>'digest')::boolean,nullif(settings->>'quiet_start','')::time,nullif(settings->>'quiet_end','')::time,settings->>'timezone')
 on conflict(user_id) do update set data_saver=excluded.data_saver,autoplay=excluded.autoplay,interface_language=excluded.interface_language,content_languages=excluded.content_languages,dm_policy=excluded.dm_policy,show_presence=excluded.show_presence,read_receipts=excluded.read_receipts,notify_replies=excluded.notify_replies,notify_messages=excluded.notify_messages,notify_circles=excluded.notify_circles,digest=excluded.digest,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,timezone=excluded.timezone,updated_at=now();
 update public.profiles set is_private=private_account where id=auth.uid();
end $$;
revoke all on function public.save_preferences(jsonb,boolean) from public,anon;
grant execute on function public.save_preferences(jsonb,boolean) to authenticated;
create or replace function public.owned_media() returns table(bucket_id text,name text) language sql stable security definer set search_path='' as $$ select o.bucket_id,o.name from storage.objects o where o.owner_id=auth.uid()::text and o.bucket_id in ('avatars','post-media','message-media','media','flicks'); $$;
revoke all on function public.owned_media() from public,anon;
grant execute on function public.owned_media() to authenticated;
commit;
