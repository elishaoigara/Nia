-- Performance hardening: avoid evaluating auth.uid() once per row in RLS policies.
-- This migration only changes policies that contain direct auth.uid() calls and
-- do not already contain the recommended `(select auth.uid())` form.
-- It preserves each policy's name, command, roles, USING expression, and
-- WITH CHECK expression. Review in staging before production.

do $$
declare
  policy_row record;
  rewritten_using text;
  rewritten_check text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ilike '%auth.uid()%'
        or coalesce(with_check, '') ilike '%auth.uid()%'
      )
      and coalesce(qual, '') not ilike '%select auth.uid%'
      and coalesce(with_check, '') not ilike '%select auth.uid%'
  loop
    rewritten_using := replace(policy_row.qual, 'auth.uid()', '(select auth.uid())');
    rewritten_check := replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())');

    if policy_row.qual is not null then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        rewritten_using
      );
    end if;

    if policy_row.with_check is not null then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        rewritten_check
      );
    end if;
  end loop;
end
$$;
