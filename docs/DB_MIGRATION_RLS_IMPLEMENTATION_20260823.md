# Nia Database Migration and RLS Privacy Implementation Plan

**Date:** 23 August 2026  
**Repository revision:** `c5702d0`  
**Supabase project:** `Nia` (`mjdjqpieuzkwozbyuywd`)  
**Region/status:** `eu-west-1`, `ACTIVE_HEALTHY`  
**Status:** **Repair migrations applied to the live project; repository migrations updated; validation completed for the core private-Circle post path.**

## 1. Objective

The objective is to make Nia’s database migration chain installable and make Circle/content privacy enforceable at the database boundary. The database, not only the Next.js UI, must prevent anonymous users, non-members, and unauthorised clients from reading private-Circle content or its dependent records.

The intended authorization model is:

| Resource | Anonymous user | Authenticated non-member | Authenticated member/owner |
|---|---:|---:|---:|
| Private Circle metadata | No | Yes, discoverable metadata only | Yes |
| Private Circle membership | No | Own row only | Member-visible rows according to Circle rules |
| Private Circle posts | No | No | Yes |
| Comments/reactions/likes/reposts/polls for private posts | No | No | Yes, only when the parent post is visible |
| Standalone public post | No in the repaired managed tables | Yes, when author profile is public and post audience is public | Yes |
| Standalone followers-only post | No | No | Yes, when the viewer follows the author or is the author |
| Expiring Stories | No | According to audience and profile privacy | According to audience and profile privacy |

The key design principle is that **a stricter policy cannot coexist with an old permissive policy**. PostgreSQL combines multiple applicable policies with OR semantics, so every previous `using (true)` or public-role policy on the managed tables must be removed before the authoritative policy set is created.

## 2. Live findings

The live Supabase project is not represented by the repository migration history alone. The live database contains additional tables and columns such as `account_settings`, `follow_requests`, `close_friends`, profile privacy controls, post/story audience controls, and moderation structures. The live migration history reported only three earlier entries before this repair, including two entries with the name `engagement_events`. This is schema drift and must be treated as a separate follow-up workstream.

The repository’s `202608210002_security_hardening.sql` referenced these functions:

`accept_follow_request(uuid)`, `apply_default_audience()`, `fn_create_message_request()`, `increment_poll_vote()`, `is_account_active(uuid)`, `notify_circle_join()`, `notify_comment()`, and `notify_like()`.

Those functions were not defined in the checked-in migration files, so a clean migration could fail when executing `ALTER FUNCTION`, `REVOKE`, or `GRANT` against a nonexistent function. The live database does contain those functions, which confirms that the production schema was created through a different or incomplete migration path.

The live database also had permissive public-role policies on `posts`, `stories`, `profiles`, `circles`, `circle_members`, `comments`, `likes`, `reactions`, `reposts`, `polls`, `poll_votes`, `hashtags`, and `post_views`. In particular, the live `posts` table had a `Public posts` policy with `using (true)`. That policy made the intended `users read permitted posts` policy ineffective because the two policies were ORed together.

The live `circles` table did not initially expose the repository’s `is_private` column, even though the application writes and reads `is_private`. The repair migration adds the column with `false` as the default, preserving current Circles as public unless explicitly changed.

## 3. Repository changes

### 3.1 Harden the stale security migration

**File:** `supabase/migrations/202608210002_security_hardening.sql`

The migration now uses `to_regprocedure()` inside procedural blocks before changing function search paths or privileges. This makes the migration safe when optional production-only functions are absent from a clean install. Existing functions are still hardened when present.

The migration retains the intended privilege model:

- Trigger-only functions have direct execution revoked from `public`, `anon`, and `authenticated`.
- User-invoked functions are revoked from broad roles and granted only to `authenticated`.
- Search paths are pinned to `public, pg_temp` for the functions that exist.

This fixes the migration failure mode without inventing definitions for features that are not part of the checked-in baseline schema. The longer-term fix is to reconcile the complete production schema into a single authoritative migration chain.

### 3.2 Add the authoritative private-Circle RLS migration

**File:** `supabase/migrations/202608230001_private_circle_rls.sql`

This migration performs the following steps:

1. Adds `profiles.is_private`, `circles.is_private`, `posts.audience`, and `stories.audience` when absent.
2. Adds constraints for supported audience values.
3. Adds indexes for Circle membership lookups and Circle post retrieval.
4. Creates the `private` schema and a security-definer `private.is_circle_member(circle_id, user_id)` helper.
5. Restricts private-schema usage and helper execution to authenticated callers needed by RLS evaluation.
6. Drops all existing policies on the managed privacy/content tables.
7. Recreates authenticated-only policies for profiles, Circles, memberships, join requests, posts, comments, engagement, polls, hashtags, views, and Stories.
8. Uses parent-post visibility for dependent resources so a private post cannot be exposed through comments, likes, reactions, reposts, polls, hashtags, or views.
9. Removes public-role access from the managed tables.

### 3.3 Move the deployed helper to the private schema

**File:** `supabase/migrations/202608230002_private_rls_helper.sql`

The first live application used a public-schema helper during the repair. Because a security-definer function in an API-exposed schema is unnecessarily callable through PostgREST, the follow-up migration moves `is_circle_member` to `private.is_circle_member`, removes the public helper, and rewrites the policies that reference it.

The helper uses `security definer` with an empty search path and fully qualified table names. Its schema usage is granted only to `authenticated`, and anonymous callers have neither schema usage nor function execution.

## 4. Policy semantics implemented

### Profiles

Authenticated users can read their own profile. They can read another profile only when the profile is not private or the viewer follows that profile. Users can create and update only their own profile.

### Circles

Authenticated users can discover Circle metadata. Only the Circle creator can update or delete a Circle. Creation is limited to authenticated users whose `created_by` matches the current user.

### Circle membership

Public Circle membership is visible to authenticated users. For private Circles, membership visibility is limited to the member, the Circle creator, or another member. A user can directly join a public Circle or the creator’s own newly created private Circle. Private-Circle approval continues through the existing security-definer `accept_circle_join_request` workflow.

### Circle join requests

Users can create, read, update, and delete their own requests. Existing Circle members can read and update requests for their Circle. The existing RPC remains the preferred atomic approval path because it inserts the accepted member and updates the request status together.

### Posts

A post owned by the current user is visible to that user. A post attached to a Circle is visible only when the viewer is allowed to see that Circle: the Circle is public, the viewer is the creator, or the viewer is a Circle member. A standalone post is visible when it is public and the author profile is public, or when it is followers-only and the viewer follows the author.

Post creation and update require authentication, ownership, and valid Circle membership where applicable. Post deletion is limited to the author.

### Dependent content

Comments, likes, reactions, reposts, polls, poll votes, hashtags, and post views all require the parent post to pass the post visibility policy. This prevents a user from bypassing private-post privacy by querying a child table directly. Bookmarks remain owner-private because they are personal saved content.

### Stories

Only active, unexpired Stories are visible. The viewer must be the author, satisfy the public/profile-privacy rule, follow the author for followers-only Stories, or appear in `close_friends` for close-friends Stories when that optional live table exists.

## 5. Live changes applied

The following migrations were applied to Supabase project `mjdjqpieuzkwozbyuywd`:

| Migration name | Result |
|---|---|
| `private_circle_rls_v2` | Applied successfully at version `20260823051510` |
| `private_rls_helper` | Applied successfully at version `20260823051721` |

The database now reports the two repair migrations in its migration history. The managed privacy tables report **zero policies assigned to the `public` role**. The new helper exists in the `private` schema with `anon_schema_usage = false`, `authenticated_schema_usage = true`, `anon_execute = false`, and `authenticated_execute = true`.

## 6. Validation performed

### Policy inspection

The post-change policy inventory shows the new `authenticated users read permitted posts` policy and no old `Public posts` policy on the managed content tables. Dependent tables use parent-post existence checks, so their rows are constrained by the post policy.

### Transactional authorization tests

Two rollback-only tests were run with existing disposable-looking Nia test accounts and fixed temporary IDs:

| Test | Expected | Observed |
|---|---:|---:|
| Non-member reads a private-Circle post | 0 rows | **0 rows** |
| Member reads the same private-Circle post | 1 row | **1 row** |
| Anonymous reads a private-Circle post | 0 rows | **0 rows** |
| Test Circle/post remain after rollback | 0 rows | **0 rows** |

The first combined test was rejected before fixture insertion because its temporary profile IDs were not present in `auth.users`; no data was left behind. The subsequent tests used existing test identities and completed with rollback cleanup verified.

### Repository quality checks

The repository checks completed successfully after the migration changes:

- `git diff --check`: passed.
- ESLint with zero warnings: passed.
- Strict TypeScript check: passed.
- Vitest: **9 of 9 tests passed**.

## 7. Remaining work required for a production-grade database release

The repair is applied, but the project still needs a proper schema-reconciliation release. The live database has more tables, columns, functions, and policies than the checked-in baseline. The next database workstream should export the live schema, compare it against every checked-in migration, and create missing forward-only migrations for production features rather than relying on undocumented dashboard or SQL-editor changes.

The Supabase security advisor still reports four warnings. Three are pre-existing public-schema security-definer functions: `accept_circle_join_request`, `accept_follow_request`, and `is_account_active`. These should either be moved to a non-exposed schema with application calls updated, or their intentional authenticated execution should be documented and reviewed. The fourth warning is leaked-password protection being disabled in Supabase Auth; enable it in the Auth security settings before public acquisition.

The live database should also receive a dedicated pgTAP or isolated integration suite covering:

1. Anonymous, authenticated non-member, authenticated member, Circle owner, and moderator access.
2. Private post reads through every dependent table.
3. Public and followers-only standalone posts.
4. Profile privacy and follow transitions.
5. Private-Circle join requests, approval, decline, leave, and creator behavior.
6. Story audience and expiry rules.
7. Suspended/deactivated account read and write behavior.
8. Direct PostgREST access, not only Next.js-rendered routes.

## 8. Recommended rollout sequence

| Phase | Action | Gate |
|---|---|---|
| A | Keep the two repair migrations in the repository and review them in code review. | SQL review confirms no permissive managed-table policy remains. |
| B | Reconcile the full live schema into versioned migrations. | A clean staging database builds the same tables/functions/policies as production. |
| C | Run isolated authorization tests with two or more real Supabase JWT contexts. | Non-member and anonymous reads fail; members succeed across all dependent tables. |
| D | Generate Supabase TypeScript types in CI and compare against application expectations. | Type drift fails CI rather than reaching production. |
| E | Promote the migration to production during a controlled window. | Backups/PITR confirmed, rollback plan prepared, advisor output reviewed. |
| F | Re-run application E2E flows. | Onboarding, Circle creation/joining, posting, messaging, notifications, Stories, and moderation pass. |

## 9. Rollback guidance

The migration is forward-only and should not be rolled back by blindly restoring the previous permissive policies. If an application regression is found, first disable affected UI writes or route traffic to a maintenance state while preserving the privacy policies. Then create a reviewed corrective migration. Before any corrective migration, take a schema and data backup, inspect `pg_policies`, and verify whether the problem is a missing policy, a schema mismatch, or an application query that assumed broader visibility.

Do not restore `using (true)` policies on `posts`, `stories`, `profiles`, or dependent content as an emergency workaround. That would reintroduce the privacy defect.

## References

[1]: ../../README.md "Nia repository README"
[2]: ../supabase/migrations/202608210002_security_hardening.sql "Nia guarded security-hardening migration"
[3]: ../supabase/migrations/202608230001_private_circle_rls.sql "Nia private-Circle RLS migration"
[4]: ../supabase/migrations/202608230002_private_rls_helper.sql "Nia private-schema helper migration"
[5]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security documentation"
[6]: https://supabase.com/docs/guides/database/functions "Supabase database functions documentation"
[7]: https://supabase.com/docs/guides/database/database-linter "Supabase database security linter documentation"

> **Implementation status:** The live privacy hole for private-Circle posts has been closed and the repository now contains repeatable repair migrations. The remaining high-priority task is to reconcile the larger live schema into a single clean migration history and exercise every privacy path with isolated authenticated identities.
