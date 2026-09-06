# Production readiness checklist

The repository contains production-hardening changes; launch readiness still depends on live-schema reconciliation and staging acceptance. See [the September release guide](SUPABASE_RELEASE_20260905.md) and [changes 1–47](CHANGES_1_TO_47.md). The following items depend on real infrastructure, provider accounts, traffic, and organizational policy and must be completed by the deployment owner.

## Required before launch

- [ ] Require the `check` job from `.github/workflows/check.yml` on protected branches.

- [ ] Apply the Supabase migration to staging, run smoke tests, then promote the reviewed migration to production.
- [ ] Compare the deployed schema with `types/database.ts`. CI runs `db:types:check` against the complete checked-in migration chain; live drift requires separate review.
- [ ] Configure all production environment variables in the deployment platform and rotate any credentials previously used outside a secret manager.
- [ ] Add distributed rate limiting and abuse controls for AI, authentication, messaging, and upload endpoints (for example, a managed Redis-backed limiter or an API gateway policy).
- [ ] Configure error reporting, structured log aggregation, uptime checks, and alerts for authentication, database, and AI-provider failures.
- [ ] Enable Supabase point-in-time recovery, define retention, and test a restore.
- [ ] Configure a custom domain, TLS, DNS, transactional email, and Supabase Auth redirect allowlists.
- [ ] Run accessibility, browser, low-end Android, and metered-network acceptance testing with representative users.
- [ ] Add end-to-end tests for sign-up/onboarding, posting, messaging, and story upload flows.
- [ ] Complete privacy, terms, data-retention, account-deletion, content-moderation, and reporting policies.

## Recommended shortly after launch

- [ ] Move media processing to an asynchronous pipeline that validates file signatures, scans uploads, creates thumbnails, and transcodes video.
- [ ] Add database-level feed pagination/cursors as traffic grows; the current ranked candidate pool is intentionally bounded.
- [ ] Add scheduled cleanup for expired stories.
- [ ] Add product analytics with explicit consent and a documented data-minimization policy.
- [ ] Establish SLOs, incident response ownership, deployment rollback procedures, and a release cadence.
- [ ] Split the largest client modules (Flicks, stories, and messaging) further as those areas begin receiving feature work.

These are operational or scale improvements, not new product features. They should be tracked as launch engineering work with named owners and acceptance criteria.
