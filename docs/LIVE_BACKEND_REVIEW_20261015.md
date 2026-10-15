# Nia live backend review — 2026-10-15

## Current deployment status

The Nia project is accessible in elishaoigara's Org and reports ACTIVE_HEALTHY. The public Auth settings endpoint returned HTTP 200 using the exact publishable key embedded in the APK. Email signup is enabled and requires confirmation; social login providers, including X, are disabled. This endpoint check does not verify actual signup, email delivery or authenticated device behavior.

**The database fixes below have been prepared and tested but NOT applied to production.** The Supabase migration action returned `Invalid or expired requestState` for two attempts at the reconciliation migration and one independent attempt at the additive Creator Mode migration. Subsequent migration-history and catalog checks confirmed that none of those changes were applied. Read access and rollback-only SQL tests work.

## Verified schema defects

The live installation differs from the canonical repository schema. Rollback-only checks using synthetic users reproduced failures in poll voting, comment likes, Creator Mode, story-view retries, sender message editing, report reasons and moderation status. They also exposed missing boundaries around message content, report/notification actors and story viewer privacy. All synthetic rows were rolled back; a follow-up query found zero test users.

The forward reconciliation migration adds required columns, comment likes, uniqueness and foreign-key constraints, restores field-protection triggers, adds restrictive privacy/actor policies, repairs legacy moderation status handling, adds missing discovery functions and restores owner storage operations. Legacy commerce rows are retained while obsolete client privileges are revoked. It does not reset the database or delete user records.

Creator Mode uses the existing reviewed `20260918080113_creator_mode.sql` migration. The live tables were confirmed absent before preparation.

## Validation

- Existing fresh-schema checks: 37 PostgreSQL/RLS assertions passed.
- Creator Mode checks: 54 PostgreSQL/RLS assertions passed.
- New reproduction of the legacy schema: 23 contract/security checks passed after reconciliation, with fixture rollback verified.
- Production smoke SQL uses `BEGIN` and ends with `ROLLBACK`; never remove that boundary.

The test for read receipts was corrected to use the actual `message_id` key; an earlier assertion incorrectly referenced `other_id` and was a test defect, not an application defect.

## Apply and verify

The reviewed one-time upgrade is `supabase/manual/Nia-backend-fixes.sql`. It wraps the reconciliation and Creator Mode changes in one transaction. Run it only against Nia project `mjdjqpieuzkwozbyuywd`, with Creator Mode still absent. Then run `scripts/db/check-live-contracts.sql` unchanged and check that all 23 results say PASS. A failure rolls back the upgrade; do not remove guards or discard user records to make it pass.

The repository and remote migration history already differ because older changes were applied outside the tracked chain. Do not reset production or blindly replay all historical migrations. The manual bundle does not repair historical migration bookkeeping; reconcile that separately from a verified schema snapshot.

## Remaining release requirements

The downloaded 1.2.0 APK already uses the confirmed project URL and active public key; these backend-only fixes do not require recompiling it. It remains a preview signed with the template debug certificate. Production deployment, real email confirmation/login, two-account API/device acceptance, production signing and remaining native feature gaps are still open.

Supabase's security advisor also flags [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) as disabled. Eleven intentional authenticated SECURITY DEFINER entry points require ongoing authorization review; [advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). The unused `test_profiles` table is RLS-protected with no policies, which denies client access; no data was removed.
