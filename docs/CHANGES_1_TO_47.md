# Changes 1–47

This is the implementation ledger for the requested production-readiness work. “Implemented” here means repository code and migrations; the live Supabase upgrade and staging acceptance remain required. See [the Supabase release guide](SUPABASE_RELEASE_20260905.md) for the rollout and explicit limitations.

| # | Change delivered | Main implementation |
|---|---|---|
| 1 | Enforce media ownership on uploads, replacement and deletion | September foundation Storage policies |
| 2 | Reject sender spoofing, blocked conversations and suspended senders | Message RLS and `private.can_message` |
| 3 | Private buckets with authenticated, RLS-checked delivery | `app/api/media/route.ts`, `lib/media-url.ts` |
| 4 | Private-account follow requests and approval | `FollowButton`, Settings, follow RPCs |
| 5 | Repair clean-install prerequisites; provide live schema preflight | August prerequisites, `supabase/preflight.sql`; live drift reconciliation still outstanding |
| 6 | Generate database types from PostgreSQL and type both clients | `scripts/db/generate-types.mjs`, `types/database.ts` |
| 7 | Publish voice posts and render audio playback | `CreatePost`, `PostCard` |
| 8 | Publish post and poll atomically, including poll-only posts | `publish_post` RPC |
| 9 | Validate options and expiry in the database | Poll definition/vote triggers |
| 10 | Supply missing Story reply column and protect threaded media | `messages.story_id`, existing reply/thread interfaces |
| 11 | Allow profile goals to be cleared | Profile editor saves an empty array |
| 12 | Repair report queue queries and protected evidence retrieval | Moderation page, `report_evidence` |
| 13 | Persist text drafts, retain failed uploads/composer input and support retries | `useDraft`, TUS uploads, composer upload cache, post/DM retry IDs |
| 14 | Audited removal/suspension and reviewed appeals | Moderation RPCs, `ModerationAppeals`, Safety |
| 15 | Restrict seed tools to staging and enrolled test authors | Seed SQL/script guards, `test_profiles` |
| 16 | Replace extended onboarding with one short form | `app/onboarding/page.tsx` |
| 17 | Ask for chosen name, username and interests; offer optional community selection | Onboarding; other profile fields remain optional |
| 18 | Show content earlier | Simplified Home |
| 19 | Make Circles a primary navigation destination | `Navbar` |
| 20 | Consolidate Circle responses into regular posts, preserving membership privacy | Response migration, Circle post stream |
| 21 | Keep purpose selection optional for casual posts | Composer defaults to general reflection |
| 22 | Add owner/moderator controls, welcome and rules | Circle manager RPCs, `CircleCommunity` |
| 23 | Show Circle activity and why it is relevant | `circle_activity`, `CircleDirectory` |
| 24 | Apply discovery filters in SQL before pagination | Circle and people discovery |
| 25 | Normalize interests/language and complete country choices | `lib/interests.ts`, discovery migration, African country list |
| 26 | Use one feed query and stable timestamp/ID cursor | `lib/feed-query.ts`, Home, feed API, `LoadMore` |
| 27 | Page conversations by latest message with a stable cursor | `conversation_page`, inbox |
| 28 | Preserve safe deep links through login and onboarding | `lib/auth-next.ts`, login/callback/onboarding |
| 29 | Use explicit accept/decline and safety action labels | Inbox/DM/Safety interfaces |
| 30 | Improve focus, skip navigation, message-action access, contrast and touch controls | `DialogAccessibility`, layout/CSS, `MessageBubble`; full device accessibility acceptance remains required |
| 31 | Persist data saver and autoplay choices | Preferences provider, Settings, video players |
| 32 | Compress uploads and support resumable transfer | `lib/upload-media.ts`, media/video editor |
| 33 | Separate content-language and interface-language preferences | English/Kiswahili common-control translation; full localization remains future work |
| 34 | Ground caption assistance in selected language and optional country | Caption API and composer |
| 35 | Add opportunities with source, location, eligibility, deadline, saving/sharing and scam reports | `CircleCommunity`, opportunities tables, moderation |
| 36 | Add lightweight events and RSVP | Circle events/RSVP tables and interfaces |
| 37 | Add “open to” and “ask me about” profile context | Profile schema/editor/detail |
| 38 | Persist notification categories, quiet hours and optional in-app digest | Preferences and notification delivery trigger |
| 39 | Make presence and read receipts optional | Private bilateral presence channels; private read-state table |
| 40 | Add account export and explicit deletion | Account API routes, Settings; deletion requires server-only administrative key |
| 41 | Welcome entertainment, friendship and careers alongside practical contributions | Interest choices, onboarding, composer and Home copy |
| 42 | Remove the timed splash from app startup | Root layout |
| 43 | Reduce stacked Home prompts and filters | Feed-first Home with collapsed Stories |
| 44 | Defer long-video expansion and live streaming | New video composer capped at 60 seconds; existing long videos retained |
| 45 | Keep payments, tips, paid verification and marketplace deferred | Existing removal migration retained; no reintroduction |
| 46 | Keep view-once unavailable until backend guarantees exist | New messages always ordinary; legacy view-once denied by RLS |
| 47 | Remove synthetic production content from visible feeds | Deterministic fixture quarantine; guarded future staging seeds |

## Verification

The quality gate is `npm run check`. Database tests execute the complete SQL chain and cross-user authorization assertions with a disposable PostgreSQL-compatible engine. CI runs the same checks. No real user data or production credentials are required for this gate. Passing it does not replace testing actual Supabase Storage/Auth/Realtime and mobile behavior in staging.
