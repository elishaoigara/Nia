-- Legacy installations attach this helper to posts and stories. Never replace
-- an explicit audience with an account default, especially followers -> public.
create or replace function public.apply_default_audience() returns trigger
language plpgsql security definer set search_path = '' as $$
declare selected_audience text;
begin
  if new.audience is not null then return new; end if;
  if tg_table_name = 'posts' then
    select to_jsonb(s)->>'default_post_audience' into selected_audience
    from public.account_settings s where s.user_id = new.user_id;
    new.audience := coalesce(selected_audience, 'public');
  elsif tg_table_name = 'stories' then
    select to_jsonb(s)->>'story_audience' into selected_audience
    from public.account_settings s where s.user_id = new.user_id;
    new.audience := coalesce(selected_audience, 'followers');
  end if;
  return new;
end;
$$;
revoke all on function public.apply_default_audience() from public, anon, authenticated;
