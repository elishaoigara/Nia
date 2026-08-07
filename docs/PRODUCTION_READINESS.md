# Production readiness checklist

The repository now contains the application-level controls required for a production deployment. The following items depend on real infrastructure, provider accounts, traffic, and organizational policy and must be completed by the deployment owner.

## Required before launch

- [ ] Enable the workflow in `docs/ci.yml.example` as `.github/workflows/ci.yml` and require its quality job on protected branches.

- [ ] Apply the Supabase migration to staging, run smoke tests, then promote the reviewed migration to production.
- [ ] Generate Supabase TypeScript types from the deployed schema and compare them with `types/domain.ts` in CI.
- [ ] Configure all production environment variables in the deployment platform and rotate any credentials previously used outside a secret manager.
- [ ] Use Daraja production credentials, a production shortcode, and a high-entropy `MPESA_CALLBACK_TOKEN`.
- [ ] Verify M-Pesa callback delivery, duplicate callbacks, delayed callbacks, cancellation, and reconciliation against Safaricom transaction records.
- [ ] Add distributed rate limiting and abuse controls for AI, authentication, messaging, upload, and payment endpoints (for example, a managed Redis-backed limiter or an API gateway policy).
- [ ] Configure error reporting, structured log aggregation, uptime checks, and alerts for authentication, database, AI-provider, and payment failures.
- [ ] Enable Supabase point-in-time recovery, define retention, and test a restore.
- [ ] Configure a custom domain, TLS, DNS, transactional email, and Supabase Auth redirect allowlists.
- [ ] Run accessibility, browser, low-end Android, and metered-network acceptance testing with representative users.
- [ ] Add end-to-end tests for sign-up/onboarding, posting, messaging, story upload, and payment callback flows.
- [ ] Complete privacy, terms, data-retention, account-deletion, content-moderation, reporting, and payment/refund policies.

## Recommended shortly after launch

- [ ] Move media processing to an asynchronous pipeline that validates file signatures, scans uploads, creates thumbnails, and transcodes video.
- [ ] Add database-level feed pagination/cursors as traffic grows; the current ranked candidate pool is intentionally bounded.
- [ ] Add reconciliation jobs for pending M-Pesa transactions and expired stories.
- [ ] Add product analytics with explicit consent and a documented data-minimization policy.
- [ ] Establish SLOs, incident response ownership, deployment rollback procedures, and a release cadence.
- [ ] Split the largest client modules (Flicks, stories, and messaging) further as those areas begin receiving feature work.

These are operational or scale improvements, not new product features. They should be tracked as launch engineering work with named owners and acceptance criteria.
