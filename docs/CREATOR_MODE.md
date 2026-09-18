# Creator Mode — first release

Optional creator tools extend a normal social profile; they do not change feed ranking, verification or account privacy.

## Included

- Edit Profile → Creator: opt in, choose an optional category, add a 160-character introduction, add up to three named HTTPS links, and mark yourself open to collaborations.
- The profile displays creator details and a compact Featured work section. The collaboration link opens existing Nia messaging, whose current message-request and blocking rules still apply.
- Creator tools (`/creator`) lets the owner select, order or remove up to three existing profile posts/Flicks. Circle posts remain in their Circles. The selection is saved atomically; posts retain their audience restrictions and deleted/removed posts are not publicly surfaced.
- Private insights show recorded views, likes/reactions, comments and saves from other users in the last 30 days across the creator’s non-removed profile posts/Flicks. They exclude Circle posts and self-interactions.
- Current follower total and recent current followers are shown separately. Recent followers is **not** net growth: unfollows are not retained. Views mean first recorded view per person/post, currently recorded by Flicks; they are not video plays or profile visits. Unlikes and unsaves are not historical events.
- Turning Creator Mode off hides the public creator section and featured work, retaining settings for later.

A structured collaboration inbox, post drafts, scheduling, historical growth charts and per-post analytics remain later releases.

## Database rollout

Apply `supabase/migrations/20260918080113_creator_mode.sql` after the existing migration chain in a staging environment before enabling this frontend. It is additive and does not backfill existing users into Creator Mode. Deploy the frontend only after applying the migration. Until then, creator sections show an unavailable/retry state; the rest of the profile continues to work.

No live database changes are part of this branch. For rollback, revert the frontend; retaining the additive tables preserves creator settings. Disabling Creator Mode is the per-user way to hide the new profile content.

The migration creates `creator_profiles`, `creator_featured_posts` and two public invoker RPCs. Both tables have explicit grants and row-level policies. Public profile visibility inherits existing profile/post policies, including private profiles, blocks and moderation. Writes require the authenticated owner and an active account. Three fixed slots enforce the featured-work limit even through direct API writes.

Bookmark rows retain their owner-only policy. A private, fixed-search-path definer function returns aggregates for `auth.uid()` only, without a target-user parameter or viewer identities. The public `creator_insights` wrapper is security invoker. Anonymous callers have no access. Inspect advisors after applying to staging.

## Checks

Run `npm run check`. Database checks include dedicated creator regressions for ownership, validation, feature limits, atomic replacement, blocks/private profiles, disabling, moderation, suspended accounts, aggregate correctness and anonymous denial. Unit tests cover safe links, invalid inputs and refusing to display missing analytics as zero.

Local validation passed: production build, lint, TypeScript, 24 unit tests, generated database types, and 83 PostgreSQL/RLS assertions (54 specific to Creator Mode). Chromium checks with mocked APIs passed at phone and desktop sizes, covering enable/disable, failed-save draft preservation, feature limits/order/removal, public links and mobile overflow. Screenshots were reviewed; this does not replace a staging integration check with real Auth and Storage.

Before merging, smoke-test on desktop and a narrow phone viewport: enable/save/disable Creator Mode, feature/reorder/unfeature posts, try an invalid link, verify a follower-only post with a non-follower account, and compare insights with known test events. No real messages or content need to be created for UI checks; staging fixtures are sufficient.
