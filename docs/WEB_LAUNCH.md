# Nia web launch — niaapp.app

This branch prepares the web experience. It does not purchase the domain, change DNS, update Vercel/Supabase settings, apply production migrations, or certify the live service ready. No production user data was changed.

## What changed

- Visitors see a public welcome page at `/`; signed-in members keep their feed.
- Public help, privacy, terms, and community guidelines are available before signup and linked from account screens.
- Canonical metadata, a public-only sitemap, and robots rules use `https://niaapp.app`. Preview deployments remain excluded from indexing. Auth and private routes remain protected; robots is not an access-control mechanism.
- Manifest and metadata routes no longer redirect to login. Browser installation is supported by the manifest; offline functionality and native app distribution are not added.
- Auth callbacks stay on the initiating host so cookies do not get stranded on a different domain. Password recovery exchanges the code before entering the password form, including accounts without profiles.
- Token-hash confirmation and recovery support email links opened on another device after installing the supplied templates.
- Signup supports both confirmation-required and immediate-session configurations; resend confirmation is available from signup success and login. Failed network requests release the forms for retry.
- Google login is hidden until `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. This does not configure Google or add X login.
- A Circle recommendation failure no longer blocks onboarding after saving a profile.

## 1. Domain and Vercel

1. Complete purchase of **niaapp.app** if it is not yet owned. The supplied screenshot shows a domain search/purchase dialog, which does not establish that purchase is complete. Resolve the billing-address warning if it blocks purchase.
2. In the existing Vercel **nia** project, add `niaapp.app` and `www.niaapp.app`. Set the apex `niaapp.app` as the primary host; redirect `www` to it. Follow the DNS records Vercel shows for this project and wait for **Valid Configuration** and HTTPS.
3. Keep the old `nia-rho.vercel.app` deployment working during the transition. Avoid changing callback hosts halfway through a login. Test legacy links before considering an old-host redirect; existing sessions are host-scoped and users may need to sign in again on the new domain.
4. Set the following variables for Production, then **redeploy**. `NEXT_PUBLIC_*` values are included at build time.

| Variable | Production value / purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://niaapp.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Nia project URL — keep the current database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public anon key (or publishable key), never a service key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key required for account deletion |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | A mailbox you have created, tested, and will monitor |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` until Google login has passed acceptance; then `true` |
| `ANTHROPIC_API_KEY` | Server-only key for AI captions and translation |
| `NEXT_PUBLIC_TENOR_API_KEY` | Optional GIF search |

Use separate staging credentials for Preview and localhost URLs locally. Do not put a production service-role key in an E2E environment. Run `npm run launch:check` with production variables loaded in the process. This only checks configuration syntax, not whether credentials or email delivery work.

## 2. Supabase authentication and email

The live site's public bundle inspected on 22 September 2026 points to project `mjdjqpieuzkwozbyuywd`. The connected Supabase account exposed only a different project, `isvywjdntudirfopmbkz`. Confirm the project in Vercel before making changes; live Nia schema and auth settings were not inspected through that connection.

In **Nia's** Supabase project:

- Site URL: `https://niaapp.app`.
- Redirect allowlist: `https://niaapp.app/auth/callback`, `https://niaapp.app/auth/callback?next=/reset-password`, and `https://niaapp.app/reset-password` for older reset links. If Google callback requests include a `next` query, allow the same callback path with a query using `https://niaapp.app/auth/callback?*` and test it. `?` is a single-character wildcard in Supabase's glob matcher; this pattern permits the query suffix without allowing unrelated paths.
- Retain existing approved legacy callback URLs during transition. Add localhost/staging callbacks only to their intended environments. Avoid an unrestricted `https://**` allowlist.
- Configure a **custom SMTP provider** and a verified sender, e.g. `Nia <hello@niaapp.app>` after creating/verifying that sender. Domain ownership alone does not create a mailbox. Add the exact SPF/DKIM records your email provider supplies, and configure DMARC for the sending domain.
- Enable email confirmations and test delivery to an email address outside the Supabase team. The default SMTP service is restricted and unsuitable for a public launch. Review email rate limits for anticipated signups.
- After deploying the new routes, paste `supabase/templates/confirm-signup.html` into **Confirm signup** and `supabase/templates/reset-password.html` into **Reset password**. These use `SiteURL` deliberately to land on the production host and `TokenHash` to work without the original browser's PKCE verifier. Use a separate project's templates/Site URL for staging.
- Disable email-provider link tracking for these auth emails. Test delivery, expired/reused links, and links opened on another browser/device.
- For Google: configure the provider credentials in Supabase and the callback URL Supabase gives you in Google Cloud. Test before exposing the button. X remains a separate integration.

## 3. Policy, support, and operational decisions

The new policy pages are **draft starting text for owner review**, based on the checked-in implementation. They are not a determination of legal compliance. Before inviting users, confirm the actual operator identity/contact, age eligibility, lawful processing grounds, retention periods for logs/backups, applicable user rights, international transfers, and the moderation/appeals process. Amend the pages to match your decisions and actual provider configuration. Have a monitored support mailbox available before release.

Verify a moderator account and a process for reviewing reports. Confirm backups and restore procedures. Existing production-readiness items in `docs/PRODUCTION_READINESS.md`, including live schema drift and abuse controls, remain applicable. This change does not enable CAPTCHA, add a distributed rate limiter, or inspect all live RLS policies.

Do not run seed scripts, reset the database, or apply the whole migration chain blindly against production. Reconcile applied migrations and schema first. Repository database checks use disposable local PGlite databases; passing them is not proof that production has those migrations.

## 4. Release acceptance

Automated repository gate: `npm ci && npm run check`. Public browser checks: `npx playwright test e2e/web-launch.spec.ts` (desktop and mobile). These tests do not create production accounts.

Before promotion, test with two dedicated staging accounts:

- Open Home, Help, Terms, Privacy, Guidelines, manifest, robots, and sitemap while signed out; they must not require login.
- Sign up with an outside email; receive/confirm it on both the same and a different browser. Retry with a taken address, expired link, and resend. Ensure no redirect points to localhost.
- Pick a unique handle and interests, finish onboarding, sign out, sign in, and refresh a protected page.
- Reset a password on another device, then sign in with the new password. Confirm old/reused reset links fail cleanly.
- Create a text post, an image post, a Flick, and a story on Android and desktop. Test failure/retry on a slow connection.
- Use two accounts to check private content boundaries, follow requests, messaging, report, mute, and block.
- Export data and test account deletion only with an isolated disposable staging account; never use an existing customer's account for this check.
- Verify support email reception, report handling, error logs, and available storage/email quotas.

Start with a small invited group after these checks. Watch signup completion, email failures, upload errors, moderation reports, and database/storage use before a wider announcement.

## 5. Release and rollback

Review and merge the launch branch when dashboard configuration and acceptance are complete. Verify the Vercel production deployment and domain immediately after promotion. Roll back to the prior Vercel deployment if necessary. This branch has no database migrations to roll back. If rolling back to code without `/auth/confirm`, restore the previous email templates too; newly sent token-hash links require that route. Keep the previous deployment and template copies until the transition is stable.

## Verification for this branch

- ESLint and TypeScript: passed.
- Unit tests: 43 passed, including callback origin handling, token confirmation/recovery, safe return paths, and public-route boundaries.
- Disposable PostgreSQL/RLS assertions: 37 core + 54 Creator Mode passed; generated database types matched.
- Desktop and mobile launch browser suite: all 6 passed. Signup/resend API responses were mocked; this does not verify real email delivery. Welcome-page screenshots were visually inspected at desktop and 390px mobile widths.
- Production build: passed after moving aside a stale `.next` cache that caused an internal Turbopack panic.
- Production environment preflight deliberately reports missing settings in the local unconfigured environment. The actual Vercel environment and live Supabase project still need owner verification.
- No production accounts, content, storage objects, or database policies were modified.

## References

- https://vercel.com/docs/domains/working-with-domains/add-a-domain
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier
