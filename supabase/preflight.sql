-- READ ONLY. Run in the Supabase SQL editor and retain results before upgrading.
-- Compare with the checked-in migrations, especially offline_draft_idempotency.
select version,name from supabase_migrations.schema_migrations order by version;
select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema in ('public','storage') order by 1,2,ordinal_position;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage','realtime') order by 1,2,3;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f' order by 1,2;
select event_object_table,trigger_name,action_statement from information_schema.triggers
where trigger_schema='public' order by 1,2;
select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id;
