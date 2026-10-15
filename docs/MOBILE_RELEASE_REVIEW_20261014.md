# Nia review — 2026-10-14

Updated live backend findings and deployment blocker: [2026-10-15 review](LIVE_BACKEND_REVIEW_20261015.md).

## Baseline and integration

Web `main`: `5b1b0f3e9c0c8e1e3f3e5cefc717ca0e0a97069b`.
Mobile `main`: `d505bb70a638abba1526a467643f115acdb0610d`.
The mobile main branch was missing its auth hook and APK workflow. Three unmerged repair PRs existed. This release builds on PR #1 (`3220acfa…`, SDK 54, native Stories/Creator Mode, auth recovery and private storage) and incorporates the correct feed joins and direct Actions build approach from PRs #2/#3. Existing branches and production data are preserved.

## Verified defects addressed

| Area | Defect and correction |
|---|---|
| Startup | Missing auth implementation and plugins on main. Restore persistent provider, recovery routes, configuration checks, account-scoped navigation and profile retry. |
| Feed | Invalid likes/reposts IDs on main. Use canonical composite-key joins, query-error states, keyset pagination, server video filter and mutes. |
| Media | Wrong bucket/blob upload on main, video rendered as image. Use ArrayBuffer, correct private buckets, signed storage references, native video, visibility/background cleanup and retry. |
| Posting | Retrying an uncertain response could duplicate a post. Reuse a request UUID with the web's atomic `publish_post` RPC. |
| Messaging | Outdated columns on main, capped inbox/history and no read receipt RPC. Use recipient_id, conversation pagination, exact participant predicates, older pages and privacy-aware reads. |
| Comments | Repeated taps could duplicate comments and errors could look empty. Add submit lock, retry UUID, error states and pagination. |
| Profiles | Unbounded post queries, stale profile loads and incorrect private follows. Reuse paginated feed, ignore stale responses, use request_follow and approval RPCs. |
| Safety | No native report/block controls. Connect to existing reports/blocks policies; owner-only delete filters. |
| Discovery | Search only examined the first 50 users; topic buttons did nothing. Search server-side with debounce and add navigable topic feeds. |
| Build | No APK workflow on main. Add native Gradle release bundling, signature verification, checksum and artifact upload. |

## Evidence

Web baseline: zero-warning ESLint, TypeScript, 43 unit tests, fresh migration/RLS tests, generated type comparison and production build pass. Six Playwright public/signup/recovery tests pass across desktop and mobile viewports with simulated email responses. These do not test real email delivery.

Mobile: strict TypeScript, 11 contract/creator regression tests, Expo dependency compatibility, 18/18 Expo Doctor checks and Android Metro/Hermes export pass locally. The tests exercise real PostgREST query generation with simulated HTTP responses, media reference handling, auth callback parsing and refusal to bundle secret keys.

## Deployment limits

Nia's configured project `mjdjqpieuzkwozbyuywd` was not present in either connected Supabase account. A local reachability attempt returned a proxy 502; that alone does not establish that the backend is down. The Actions workflow repeats a read-only Auth check from the build runner. No live data was modified. Authenticated device and cross-client acceptance is still required.

Compatible dependency updates removed the critical shell-quote advisory and updated supported SDK packages. Some SDK 54 transitive build-tool advisories remain, including upstream packages with no patched version in the available registry. Track `npm audit`; migrate Expo/RN in a separate tested release rather than accepting npm's incompatible downgrade suggestion.

## Release gates still open

- Physical-device startup, session restoration, keyboard/media lifecycle and low-bandwidth testing.
- Nia Supabase migration/redirect configuration and two-account RLS tests on the deployed project.
- Production signing and store review requirements.
- Background push delivery, native Circles/polls/settings and full web/mobile parity.
- Media processing, rate limiting/abuse response, observability, backup restore and load testing.

## Web security follow-up — 2026-10-15

Updated Next.js and its ESLint configuration from 16.3.0 to the compatible 16.3.8 security patch, Vitest to 4.1.11 and the lockfile with compatible transitive patches. [Next.js release notes](https://github.com/vercel/next.js/releases/tag/v16.3.8) document the framework fixes. Production dependency auditing now runs in CI and fails on high/critical advisories.

The full dependency audit now reports 5 high findings, all stemming from the unresolved `braces` advisory through the development-only Next ESLint plugin; no critical or moderate findings remain. The registry proposes downgrading Next ESLint to 14 as its remediation, which is incompatible with this Next 16 project. Keep this exception visible until the upstream dependency is fixed.

## APK delivery evidence

[Actions run 38607965347](https://github.com/elishaoigara/Nia-app/actions/runs/38607965347) successfully compiled and signature-verified the mobile preview from commit `2906967273f94f55867c7d9822337744b95b5090`. The downloaded APK is 43,701,707 bytes, SHA-256 `63436c7c57bbca7c2c918824276ca17fb52f17785fd25f75233df3c56fb915b7`.

The separate backend reachability step failed with `fetch failed`, and the artifact records that failure. Live sign-in and posting have not been verified. The APK uses a preview certificate and requires live backend and native-device acceptance before a production release.
