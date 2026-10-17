# Nia live backend review — 2026-10-15

## Current deployment status

The Nia project is accessible in elishaoigara's Org and reports ACTIVE_HEALTHY. The public Auth settings endpoint returned HTTP 200 using the exact publishable key embedded in the APK. Email signup is enabled and requires confirmation; social login providers, including X, are disabled. This endpoint check does not verify actual signup, email delivery or authenticated device behavior.

**The database repairs are deployed and verified as of 2026-10-17.** The connector recovered: `reconcile_live_social_contracts_and_creator_mode` was recorded as version `20261016160948`, followed by `preserve_explicit_content_audience` as `20261017065600`. All 26 rollback-only live contract/security checks pass. A separate readback confirmed zero remaining synthetic audit users.

The first deployment passed 22/23 checks. Investigation found a legacy `apply_default_audience` trigger overwriting explicit audiences: a public story became followers-only, and a followers-only post could become public. The follow-up migration preserves explicit choices and only uses defaults for null values. The story-view policy was correct and remains intact; the earlier proposed relaxation was never applied and has been removed from the working tree. Regression checks cover both audience choices and refusal to record views on hidden stories.

## Verified schema defects

The live installation differs from the canonical repository schema. Rollback-only checks using synthetic users reproduced failures in poll voting, comment likes, Creator Mode, story-view retries, sender message editing, report reasons and moderation status. They also exposed missing boundaries around message content, report/notification actors and story viewer privacy. All synthetic rows were rolled back; a follow-up query found zero test users.

The forward reconciliation migration adds required columns, comment likes, uniqueness and foreign-key constraints, restores field-protection triggers, adds restrictive privacy/actor policies, repairs legacy moderation status handling, adds missing discovery functions and restores owner storage operations. Legacy commerce rows are retained while obsolete client privileges are revoked. It does not reset the database or delete user records.

Creator Mode uses the existing reviewed `20260918080113_creator_mode.sql` migration. The live tables were confirmed absent before preparation.

## Validation

- Existing fresh-schema checks: 37 PostgreSQL/RLS assertions passed.
- Creator Mode checks: 54 PostgreSQL/RLS assertions passed.
- Reproduction of the legacy schema, including its audience-overwriting triggers: 26 contract/security checks passed after reconciliation, with fixture rollback verified.
- Live deployed database: the same 26 checks passed on 2026-10-17, with zero audit users remaining.
- Production smoke SQL uses `BEGIN` and ends with `ROLLBACK`; never remove that boundary.

The test for read receipts was corrected to use the actual `message_id` key; an earlier assertion incorrectly referenced `other_id` and was a test defect, not an application defect.

## Apply and verify

The one-time `supabase/manual/Nia-backend-fixes.sql` upgrade has already been applied. Do not rerun it against this project: Creator Mode now exists. The subsequent `20261017065457_preserve_explicit_content_audience.sql` migration is also deployed. Run `scripts/db/check-live-contracts.sql` unchanged to repeat verification; all 26 results must say PASS. Never remove its rollback boundary.

The repository and remote migration history already differ because older changes were applied outside the tracked chain. Do not reset production or blindly replay all historical migrations. The manual bundle does not repair historical migration bookkeeping; reconcile that separately from a verified schema snapshot.

## Remaining release requirements

The downloaded 1.2.0 APK already uses the confirmed project URL and active public key; these backend-only fixes do not require recompiling it. It remains a preview signed with the template debug certificate. Database deployment and transactional multi-user contract tests are complete. Real email confirmation/login, physical-device acceptance, production signing and remaining native feature gaps are still open. Database tests impersonate authenticated roles inside a rolled-back transaction; they do not validate Auth token issuance or native networking.

Supabase's security advisor also flags [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) as disabled. Eleven intentional authenticated SECURITY DEFINER entry points require ongoing authorization review; [advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). The unused `test_profiles` table is RLS-protected with no policies, which denies client access; no data was removed.
