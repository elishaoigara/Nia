# Supabase RLS performance review

The latest Nia performance advisor run reports **85 `auth_rls_initplan` findings** and one new unindexed foreign key on `circle_prompts.created_by`.

## Meaning

These are performance warnings, not evidence that RLS is disabled. The affected policies call `auth.uid()` or related auth functions directly. Supabase recommends wrapping those calls as `(select auth.uid())` so PostgreSQL can initialize the value once per statement instead of re-evaluating it for every row.

The findings cover existing policies across Circles, posts, likes, comments, Circle membership, profiles, notifications, messaging, and other application tables. Because the live project has an existing schema and its migration history is not synchronized with the repository, the policies should be inspected and rewritten by exact policy name rather than replaced with a broad destructive script.

## Current status

| Finding | Status | Action |
|---|---|---|
| Foreign-key indexes from the original advisor run | Addressed | Migration `202608210003_foreign_key_indexes.sql` is applied. |
| New `circle_prompts.created_by` index | Prepared | Apply `202608210007_circle_workstream_indexes.sql`. |
| RLS init-plan warnings | Open performance work | Rewrite exact policy expressions to use `(select auth.uid())`. |
| Anonymous execution warnings | Addressed for the reviewed boundary | Re-check after each permission change. |

## Safe remediation procedure

1. Export the exact policy definitions from `pg_policies` for the affected tables.
2. For each policy, preserve its role, command, `USING` semantics, and `WITH CHECK` semantics.
3. Replace only direct auth calls, for example `auth.uid() = user_id` with `(select auth.uid()) = user_id`.
4. Drop and recreate the same policy by exact name in a reviewed migration.
5. Test anonymous, authenticated-owner, authenticated-non-owner, Circle member, and non-member cases.
6. Re-run the performance advisor and compare the remaining finding count.

Do not use a dynamic policy-rewrite script in production. The 85 findings span different authorization rules, and an incorrect rewrite could expose private messages, reports, or Circle content.
