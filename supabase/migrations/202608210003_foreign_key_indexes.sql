-- Foreign-key covering indexes reported by the Supabase performance advisor.
-- These indexes improve joins, authorization checks, deletes, and moderation lookups.
-- Run after reviewing query volume in staging.

create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);
create index if not exists circle_join_requests_user_id_idx on public.circle_join_requests (user_id);
create index if not exists circle_members_user_id_idx on public.circle_members (user_id);
create index if not exists circles_created_by_idx on public.circles (created_by);
create index if not exists close_friends_friend_id_idx on public.close_friends (friend_id);
create index if not exists comments_parent_id_idx on public.comments (parent_id);
create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists follow_requests_target_id_idx on public.follow_requests (target_id);
create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists hashtags_post_id_idx on public.hashtags (post_id);
create index if not exists hashtags_user_id_idx on public.hashtags (user_id);
create index if not exists likes_user_id_idx on public.likes (user_id);
create index if not exists marketplace_listings_user_id_idx on public.marketplace_listings (user_id);
create index if not exists message_reports_message_id_idx on public.message_reports (message_id);
create index if not exists message_reports_reported_user_id_idx on public.message_reports (reported_user_id);
create index if not exists message_reports_reporter_id_idx on public.message_reports (reporter_id);
create index if not exists message_requests_other_id_idx on public.message_requests (other_id);
create index if not exists messages_reply_to_idx on public.messages (reply_to);
create index if not exists moderation_actions_moderator_id_idx on public.moderation_actions (moderator_id);
create index if not exists moderation_actions_report_id_idx on public.moderation_actions (report_id);
create index if not exists moderation_actions_target_user_id_idx on public.moderation_actions (target_user_id);
create index if not exists moderation_appeals_reviewed_by_idx on public.moderation_appeals (reviewed_by);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists poll_votes_user_id_idx on public.poll_votes (user_id);
create index if not exists posts_circle_id_idx on public.posts (circle_id);
create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists reactions_user_id_idx on public.reactions (user_id);
create index if not exists reports_assigned_to_idx on public.reports (assigned_to);
create index if not exists reposts_user_id_idx on public.reposts (user_id);
create index if not exists story_views_viewer_id_idx on public.story_views (viewer_id);
