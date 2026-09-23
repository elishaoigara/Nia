-- Ensure the engagement tables are available to Supabase Realtime.
-- The guards make this safe when a table was already added in the Dashboard.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['messages', 'notifications', 'message_requests'] loop
    if to_regclass(format('public.%s', table_name)) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';
