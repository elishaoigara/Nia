-- Workstream D: realtime activity feeds.
-- Apply after 202608210008_rls_initplan_optimization.sql.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['notifications', 'messages', 'circle_responses', 'circle_resources'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('alter publication supabase_realtime add table public.%I', table_name);
    END IF;
  END LOOP;
END
$$;
