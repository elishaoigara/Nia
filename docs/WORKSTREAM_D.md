# Workstream D: Notifications, Messaging, and Realtime Activity

## Delivered slice

Nia already had realtime subscriptions for notifications, direct messages, message requests, unread badges, and stories. This slice makes the live state visible by adding a **Live** connection indicator to Notifications and Circle structured responses, while the Circle response stream subscribes to scoped `INSERT` events and de-duplicates incoming rows.

The realtime publication migration adds `notifications`, `messages`, `circle_responses`, and `circle_resources` to `supabase_realtime` idempotently. Apply it only after the preceding incremental migrations.

## Migration order

Apply `202608210008_rls_initplan_optimization.sql` after review, then apply `202608210009_realtime_activity.sql`. If the RLS optimization script has not been reviewed in staging, apply the realtime migration independently and defer the RLS script.

## Acceptance criteria

| Scenario | Expected result |
|---|---|
| New notification arrives | Notifications page prepends it without a refresh and shows Live while subscribed. |
| Circle response arrives | Members see the response without a refresh and duplicate rows are not created. |
| Realtime disconnects | The page remains usable through normal submit/fetch flows; the Live indicator disappears. |
| Component unmounts | The channel is removed and no stale subscription remains. |
| Unauthorized data | Existing RLS policies continue to constrain notifications, messages, and Circle content. |

## Manual test sequence

Open Notifications in two authenticated sessions and create a like, comment, follow, or message in the other session. Open the same Circle in two member sessions and post a structured response. Confirm the second session receives it live. Disable network temporarily and confirm ordinary UI remains usable. Re-enable network and verify subscription recovery on reload.
