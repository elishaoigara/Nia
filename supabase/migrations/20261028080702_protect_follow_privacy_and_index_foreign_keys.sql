-- Remove anonymous read access to follow relationships while preserving signed-in access.
revoke select on public.follows from anon;
-- Cover foreign keys reported by the production advisor.
create index if not exists circle_events_created_by_idx on public.circle_events(created_by);
create index if not exists circle_opportunities_created_by_idx on public.circle_opportunities(created_by);
create index if not exists event_rsvps_user_id_idx on public.event_rsvps(user_id);
create index if not exists message_read_states_user_id_idx on public.message_read_states(user_id);
create index if not exists messages_story_id_idx on public.messages(story_id);
create index if not exists moderation_appeals_action_id_idx on public.moderation_appeals(action_id);
create index if not exists mutes_muted_id_idx on public.mutes(muted_id);
create index if not exists opportunity_reports_opportunity_id_idx on public.opportunity_reports(opportunity_id);
create index if not exists opportunity_reports_reporter_id_idx on public.opportunity_reports(reporter_id);
create index if not exists opportunity_saves_user_id_idx on public.opportunity_saves(user_id);
-- Both existing post_id indexes are identical and neither backs a constraint.
drop index if exists public.post_views_post_id_idx;
