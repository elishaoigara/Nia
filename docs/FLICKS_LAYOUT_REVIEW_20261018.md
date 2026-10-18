# Flicks and responsive layout review

## Changes

- Flicks uses a measured, scroll-snapping viewport between the header and footer. Touch swipes, keyboard arrows, and explicit previous/next controls navigate the feed. Longer videos are included in the swipe feed and remain available in the Watch grid.
- Dark violet styling, clearer format/discovery tabs, consistent touch controls, and separate caption/action areas replace the overlapping absolute-positioned header layout. Video uses contain sizing to preserve the full picture.
- Playback pauses when a Flick leaves the active page, a dialog covers it, or the document is hidden. Data-saver and autoplay preferences are preserved.
- Watch and shared video controls use accessible seek sliders and 44px buttons below the picture. Comments appear above the Watch dialog and pause its player.
- Post headers wrap at narrow widths, handles truncate, metadata wraps, and lengthy captions expand on demand. Inbox rows use bounded previews, compact timestamps, and wrapping request actions.
- Native companion changes are in Nia-app PR #4: measured paged Flicks feed, contained videos, custom playback/mute controls, bounded captions, and responsive post media. APK version 1.3.0 (version code 4).

## Verification

- Web lint and TypeScript checks pass.
- 43 unit tests and 117 database assertions pass (37 core, 54 creator, 26 legacy contract checks).
- Optimized Next.js production build passes from a clean generated cache.
- Layout harness: 13 passing browser tests at 320x640, 390x844, 844x390, and 1440x1000. Three touch-only cases are intentionally skipped on non-touch projects.
- Browser checks cover real fixture-video playback, pause after navigation, snap navigation, keyboard controls, comments layering and playback pause, seeking, long captions, and horizontal overflow in Flicks, feed, messages, settings, and notifications. Screenshots were visually reviewed.
- The harness mounts the real components with synthetic Supabase responses; it does not authenticate against production or certify every live account/media combination. VP9 fixtures support open-source Chromium. One worker avoids video decoder starvation on constrained runners.
- Native TypeScript, 11 unit tests, Expo dependency checks, and GitHub Actions APK build pass. Run: https://github.com/elishaoigara/Nia-app/actions/runs/39061588987. The APK uses the existing preview debug certificate; no physical-device acceptance test has been performed.

## Release status

Changes are on the existing review branches (web PR #6, native PR #4). They are not merged into main by this change. Production rollout and real-device checks remain separate release steps.

Run layout checks with `npm run e2e:layout` after installing Chromium with `npx playwright install chromium`; ffmpeg is required to generate the test clip. GitHub Actions runs these checks with the existing public-route browser smoke tests.
