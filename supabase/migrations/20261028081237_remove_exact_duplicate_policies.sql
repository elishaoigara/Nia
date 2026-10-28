-- Drop a redundant policy only when the retained policy is identical.
do $$
declare item record; duplicate boolean;
begin
 for item in select * from (values
 ('account_settings','account status own','users read own account settings'),
 ('close_friends','close friends own','users manage own close friends'),
 ('follow_requests','follow requests cancel','requesters cancel follow requests'),
 ('follow_requests','follow requests participants','participants read follow requests'),
 ('moderation_appeals','appeals own read','users read own appeals'),
 ('notifications','Users can view own notifications','Users read own notifications'),
 ('notifications','Users can update own notifications','Users update own notifications')
 ) as p(tbl, remove_name, keep_name) loop
  select exists (select 1 from pg_policies a join pg_policies b on a.schemaname=b.schemaname and a.tablename=b.tablename
   where a.schemaname='public' and a.tablename=item.tbl and a.policyname=item.remove_name and b.policyname=item.keep_name
   and a.permissive=b.permissive and a.roles=b.roles and a.cmd=b.cmd
   and a.qual is not distinct from b.qual and a.with_check is not distinct from b.with_check) into duplicate;
  if duplicate then execute format('drop policy %I on public.%I', item.remove_name,item.tbl); end if;
 end loop;
end $$;
