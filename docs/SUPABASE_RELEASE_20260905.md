# Supabase release: 5 September 2026

Supabase remains the production database, Auth, Storage and Realtime provider. PGlite is a development-only PostgreSQL test harness. No production SQL was executed during this implementation.

## Existing Nia project

The supplied dashboard shows project `mjdjqpieuzkwozbyuywd`, region Ireland, and a migration named `offline_draft_idempotency`. That migration is absent from the repository reviewed. This means the live schema is **not yet reconciled** with this change set. Do not reset the project or replay the baseline against it.

1. Take a database backup and a separate Storage backup; verify restoration in an isolated staging project. The supplied dashboard showed no backups.
2. Run `supabase/preflight.sql` in the live SQL editor. Export the missing migration definitions and compare tables, triggers, policies and functions with this repository. In particular check `follow_requests`, `account_settings`, moderation tables, message draft keys and `publish_post` before proceeding. Resolve naming/type conflicts in a new forward migration; do not blindly mark unknown migrations applied.
3. Rehearse the upgrade on a staging copy of the current schema. For an existing project already through the August migrations, the forward release files are `202609050001_production_foundation.sql` through `202609050006_presence_and_appeals.sql`, in order. Prefer tracked Supabase CLI migrations after reconciling history. SQL-editor users must apply each complete file once and reconcile migration tracking before later CLI deployments. The newly inserted August prerequisites file is for clean installs; its definitions are also in the September forward migration.
4. Deploy the application with the upgraded schema in a coordinated maintenance window. The release makes `post-media`, `message-media`, `media` and `flicks` buckets private. Old application versions that use direct public media URLs will stop displaying those objects. Existing identifiers are translated through `/api/media` by the new application. Avatars remain public. Previously downloaded public files cannot be recalled.
5. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the existing app URL/auth callback settings, and **server-only** `SUPABASE_SERVICE_ROLE_KEY` for account deletion. Never give that key a `NEXT_PUBLIC_` prefix. Caption assistance also needs the existing `ANTHROPIC_API_KEY`. Review actual environment names in `.env.example`.
6. Enable private Realtime channel authorization and verify presence/broadcast policies in staging. Test TUS uploads and resumption against actual Supabase Storage. Configure the app's login/callback URLs in Supabase Auth.
7. Test two normal accounts and a moderator: private follow approval; blocked DM rejection; third-party media denial including range requests; voice and poll-only posts; expired/invalid votes; threaded/story replies; Circle moderator approval; opportunity reports and appeals; notification preferences; export and deletion. Test on a slow mobile connection and small screens. A second moderator is required to approve an appeal against the first moderator's decision.

## Validation delivered

`npm run check` runs lint, TypeScript, unit tests, migration/RLS tests, generated-type drift check and production build. `npm run db:types` generates `types/database.ts` from the migrated PostgreSQL catalog. Browser and server clients use that type. This validates the repository schema, not unreviewed live schema drift.

The local database harness supplies minimal Auth/Storage/Realtime platform tables; it does not emulate Supabase's HTTP services, JWT gateway, email delivery, realtime connections, resumable-upload server or administrative account deletion. Actual integration acceptance must happen in staging.

## Behavior and limits

- Existing Circle responses are copied into regular posts, retain their IDs/authorship/date, and remain members-only. The old table is read-only. Responses longer than 500 characters retain their full original text in that archive; the feed copy is an excerpt.
- Indefinite suspensions deny publishing and messaging. Content removal is soft, with a protected audit record. Removed DM text/media are scrubbed; accepted appeals cannot reconstruct deleted messages.
- Account deletion removes owned Circles and their contents as well as the account and owned media. Export first. Storage cleanup, Circle cleanup and Auth deletion are separate service operations; failures can leave partial cleanup and the endpoint explicitly supports retry. Backups have a separate operator retention policy.
- Interface language selection currently translates navigation and common controls into Kiswahili; remaining copy is English. Content-language filtering is separate. Do not market this as a completely translated app yet.
- Digest mode batches **in-app** notifications for the following morning, adjusted for quiet hours. It is not an email/push digest delivery service. Presence requires both participants to opt in.
- Text drafts survive refresh. Selected media stays in memory until published; resumable transport retains upload progress, but after closing a tab the user must select the file again. Successful composer uploads are reused on retry. Post request IDs and DM retry IDs avoid duplicate submission within an open composer.
- View-once messages are unavailable. Long-video expansion, live streaming, payments, paid verification and marketplace features remain deferred. Existing long videos remain readable.
- Synthetic fixture posts are quarantined. Future fixtures require explicit staging guards and operator-enrolled test profiles. Never enroll real members as test authors.

## Rollback

Keep the pre-release backup and the preceding application build. Prefer a forward fix. Do not make protected buckets public as a rollback shortcut. Rolling back the application alone breaks private media delivery and new RPC-driven flows. Rehearse database/Storage restoration and coordinate any rollback before reopening traffic.
