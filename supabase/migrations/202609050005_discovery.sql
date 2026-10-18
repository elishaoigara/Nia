begin;
create or replace function public.circle_activity(circle_ids uuid[]) returns table(circle_id uuid,last_post timestamptz) language sql stable security invoker set search_path='' as $$ select circle_id,max(created_at) from public.posts where circle_id=any(circle_ids[1:24]) group by circle_id; $$;
revoke all on function public.circle_activity(uuid[]) from public,anon;
grant execute on function public.circle_activity(uuid[]) to authenticated;
-- Shared canonical values for matching. Display labels remain in the UI.
update public.circles set category=case lower(category) when 'tech' then 'technology' when 'sports' then 'football' else lower(category) end;
update public.posts set language=case lower(language) when 'en' then 'english' when 'sw' then 'swahili' when 'kiswahili' then 'swahili' when 'fr' then 'french' else lower(language) end;
update public.profiles set interests=array(select distinct case lower(x) when 'tech' then 'technology' when 'sports' then 'football' else lower(x) end from unnest(interests) x),language=lower(language);
create or replace function private.normalize_profile_interests() returns trigger language plpgsql set search_path='' as $$ begin new.interests:=array(select distinct case lower(btrim(x)) when 'tech' then 'technology' when 'sports' then 'football' else lower(btrim(x)) end from unnest(new.interests) x);new.language:=lower(new.language);return new;end $$;
create trigger normalize_profile_interests before insert or update on public.profiles for each row execute function private.normalize_profile_interests();
commit;
