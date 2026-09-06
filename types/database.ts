// Generated from the complete migration chain. Run npm run db:types.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = { public: { Tables: {
"account_settings": {
Row: {
"user_id": string
"account_status": string
"status_until": string | null
}
Insert: {
"user_id": string
"account_status"?: string
"status_until"?: string | null
}
Update: {
"user_id"?: string
"account_status"?: string
"status_until"?: string | null
}
Relationships: [
{ foreignKeyName: "account_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"blocks": {
Row: {
"blocker_id": string
"blocked_id": string
"created_at": string
}
Insert: {
"blocker_id": string
"blocked_id": string
"created_at"?: string
}
Update: {
"blocker_id"?: string
"blocked_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "blocks_blocker_id_fkey"; columns: ["blocker_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "blocks_blocked_id_fkey"; columns: ["blocked_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"bookmarks": {
Row: {
"post_id": string
"user_id": string
"created_at": string
}
Insert: {
"post_id": string
"user_id": string
"created_at"?: string
}
Update: {
"post_id"?: string
"user_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "bookmarks_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "bookmarks_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_events": {
Row: {
"id": string
"circle_id": string
"created_by": string
"title": string
"location": string
"starts_at": string
"details": string | null
"created_at": string
}
Insert: {
"id"?: string
"circle_id": string
"created_by": string
"title": string
"location": string
"starts_at": string
"details"?: string | null
"created_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"created_by"?: string
"title"?: string
"location"?: string
"starts_at"?: string
"details"?: string | null
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_events_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_events_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_join_requests": {
Row: {
"id": string
"circle_id": string
"user_id": string
"status": string
"created_at": string
"updated_at": string
}
Insert: {
"id"?: string
"circle_id": string
"user_id": string
"status"?: string
"created_at"?: string
"updated_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"user_id"?: string
"status"?: string
"created_at"?: string
"updated_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_join_requests_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_join_requests_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_members": {
Row: {
"circle_id": string
"user_id": string
"created_at": string
"role": string
}
Insert: {
"circle_id": string
"user_id": string
"created_at"?: string
"role"?: string
}
Update: {
"circle_id"?: string
"user_id"?: string
"created_at"?: string
"role"?: string
}
Relationships: [
{ foreignKeyName: "circle_members_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_opportunities": {
Row: {
"id": string
"circle_id": string
"created_by": string
"title": string
"description": string
"source_url": string
"location": string
"eligibility": string
"compensation": string | null
"removed_at": string | null
"deadline": string
"created_at": string
}
Insert: {
"id"?: string
"circle_id": string
"created_by": string
"title": string
"description": string
"source_url": string
"location": string
"eligibility": string
"compensation"?: string | null
"removed_at"?: string | null
"deadline": string
"created_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"created_by"?: string
"title"?: string
"description"?: string
"source_url"?: string
"location"?: string
"eligibility"?: string
"compensation"?: string | null
"removed_at"?: string | null
"deadline"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_opportunities_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_opportunities_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_prompts": {
Row: {
"id": string
"circle_id": string
"created_by": string
"prompt": string
"is_active": boolean
"created_at": string
"updated_at": string
}
Insert: {
"id"?: string
"circle_id": string
"created_by": string
"prompt": string
"is_active"?: boolean
"created_at"?: string
"updated_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"created_by"?: string
"prompt"?: string
"is_active"?: boolean
"created_at"?: string
"updated_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_prompts_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_prompts_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_reports": {
Row: {
"id": string
"circle_id": string
"reporter_id": string
"reason": string
"status": string
"created_at": string
}
Insert: {
"id"?: string
"circle_id": string
"reporter_id": string
"reason": string
"status"?: string
"created_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"reporter_id"?: string
"reason"?: string
"status"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_reports_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_resources": {
Row: {
"id": string
"circle_id": string
"created_by": string
"title": string
"url": string
"resource_type": string
"description": string | null
"created_at": string
}
Insert: {
"id"?: string
"circle_id": string
"created_by": string
"title": string
"url": string
"resource_type"?: string
"description"?: string | null
"created_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"created_by"?: string
"title"?: string
"url"?: string
"resource_type"?: string
"description"?: string | null
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_resources_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_resources_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circle_responses": {
Row: {
"id": string
"circle_id": string
"prompt_id": string | null
"user_id": string
"response_type": string
"content": string
"created_at": string
}
Insert: {
"id"?: string
"circle_id": string
"prompt_id"?: string | null
"user_id": string
"response_type": string
"content": string
"created_at"?: string
}
Update: {
"id"?: string
"circle_id"?: string
"prompt_id"?: string | null
"user_id"?: string
"response_type"?: string
"content"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "circle_responses_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_responses_prompt_id_fkey"; columns: ["prompt_id"]; isOneToOne: false; referencedRelation: "circle_prompts"; referencedColumns: ["id"] },
{ foreignKeyName: "circle_responses_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"circles": {
Row: {
"id": string
"created_by": string
"name": string
"slug": string
"description": string | null
"university": string | null
"country": string | null
"category": string | null
"is_private": boolean
"created_at": string
"updated_at": string
"removed_at": string | null
"welcome": string | null
"rules": string | null
}
Insert: {
"id"?: string
"created_by"?: string
"name": string
"slug": string
"description"?: string | null
"university"?: string | null
"country"?: string | null
"category"?: string | null
"is_private"?: boolean
"created_at"?: string
"updated_at"?: string
"removed_at"?: string | null
"welcome"?: string | null
"rules"?: string | null
}
Update: {
"id"?: string
"created_by"?: string
"name"?: string
"slug"?: string
"description"?: string | null
"university"?: string | null
"country"?: string | null
"category"?: string | null
"is_private"?: boolean
"created_at"?: string
"updated_at"?: string
"removed_at"?: string | null
"welcome"?: string | null
"rules"?: string | null
}
Relationships: [
{ foreignKeyName: "circles_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"close_friends": {
Row: {
"user_id": string
"friend_id": string
}
Insert: {
"user_id": string
"friend_id": string
}
Update: {
"user_id"?: string
"friend_id"?: string
}
Relationships: [
{ foreignKeyName: "close_friends_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "close_friends_friend_id_fkey"; columns: ["friend_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"comment_likes": {
Row: {
"comment_id": string
"user_id": string
"created_at": string
}
Insert: {
"comment_id": string
"user_id": string
"created_at"?: string
}
Update: {
"comment_id"?: string
"user_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "comment_likes_comment_id_fkey"; columns: ["comment_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
{ foreignKeyName: "comment_likes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"comments": {
Row: {
"id": string
"post_id": string
"user_id": string
"parent_id": string | null
"content": string | null
"media_url": string | null
"media_type": string | null
"extra_media": Json | null
"created_at": string
"updated_at": string
"removed_at": string | null
}
Insert: {
"id"?: string
"post_id": string
"user_id": string
"parent_id"?: string | null
"content"?: string | null
"media_url"?: string | null
"media_type"?: string | null
"extra_media"?: Json | null
"created_at"?: string
"updated_at"?: string
"removed_at"?: string | null
}
Update: {
"id"?: string
"post_id"?: string
"user_id"?: string
"parent_id"?: string | null
"content"?: string | null
"media_url"?: string | null
"media_type"?: string | null
"extra_media"?: Json | null
"created_at"?: string
"updated_at"?: string
"removed_at"?: string | null
}
Relationships: [
{ foreignKeyName: "comments_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "comments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "comments_parent_id_fkey"; columns: ["parent_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
]
}
"engagement_events": {
Row: {
"id": string
"user_id": string | null
"event_name": string
"contribution_mode": string | null
"metadata": Json
"created_at": string
}
Insert: {
"id"?: string
"user_id"?: string | null
"event_name": string
"contribution_mode"?: string | null
"metadata"?: Json
"created_at"?: string
}
Update: {
"id"?: string
"user_id"?: string | null
"event_name"?: string
"contribution_mode"?: string | null
"metadata"?: Json
"created_at"?: string
}
Relationships: [
]
}
"event_rsvps": {
Row: {
"event_id": string
"user_id": string
}
Insert: {
"event_id": string
"user_id": string
}
Update: {
"event_id"?: string
"user_id"?: string
}
Relationships: [
{ foreignKeyName: "event_rsvps_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "circle_events"; referencedColumns: ["id"] },
{ foreignKeyName: "event_rsvps_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"follow_requests": {
Row: {
"requester_id": string
"target_id": string
"status": string
"created_at": string
}
Insert: {
"requester_id": string
"target_id": string
"status"?: string
"created_at"?: string
}
Update: {
"requester_id"?: string
"target_id"?: string
"status"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "follow_requests_requester_id_fkey"; columns: ["requester_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "follow_requests_target_id_fkey"; columns: ["target_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"follows": {
Row: {
"follower_id": string
"following_id": string
"created_at": string
}
Insert: {
"follower_id": string
"following_id": string
"created_at"?: string
}
Update: {
"follower_id"?: string
"following_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "follows_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "follows_following_id_fkey"; columns: ["following_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"hashtags": {
Row: {
"id": number
"tag": string
"post_id": string
"user_id": string
"country": string | null
"created_at": string
}
Insert: {
"id"?: number
"tag": string
"post_id": string
"user_id": string
"country"?: string | null
"created_at"?: string
}
Update: {
"id"?: number
"tag"?: string
"post_id"?: string
"user_id"?: string
"country"?: string | null
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "hashtags_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "hashtags_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"likes": {
Row: {
"post_id": string
"user_id": string
"created_at": string
}
Insert: {
"post_id": string
"user_id": string
"created_at"?: string
}
Update: {
"post_id"?: string
"user_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "likes_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "likes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"message_read_states": {
Row: {
"message_id": string
"user_id": string
"read_at": string
}
Insert: {
"message_id": string
"user_id": string
"read_at"?: string
}
Update: {
"message_id"?: string
"user_id"?: string
"read_at"?: string
}
Relationships: [
{ foreignKeyName: "message_read_states_message_id_fkey"; columns: ["message_id"]; isOneToOne: false; referencedRelation: "messages"; referencedColumns: ["id"] },
{ foreignKeyName: "message_read_states_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"message_reports": {
Row: {
"id": string
"reporter_id": string
"reported_user_id": string
"message_id": string | null
"reason": string
"status": string
"created_at": string
"details": string | null
}
Insert: {
"id"?: string
"reporter_id": string
"reported_user_id": string
"message_id"?: string | null
"reason": string
"status"?: string
"created_at"?: string
"details"?: string | null
}
Update: {
"id"?: string
"reporter_id"?: string
"reported_user_id"?: string
"message_id"?: string | null
"reason"?: string
"status"?: string
"created_at"?: string
"details"?: string | null
}
Relationships: [
{ foreignKeyName: "message_reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "message_reports_reported_user_id_fkey"; columns: ["reported_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "message_reports_message_id_fkey"; columns: ["message_id"]; isOneToOne: false; referencedRelation: "messages"; referencedColumns: ["id"] },
]
}
"message_requests": {
Row: {
"user_id": string
"other_id": string
"status": string
"created_at": string
"updated_at": string
}
Insert: {
"user_id": string
"other_id": string
"status"?: string
"created_at"?: string
"updated_at"?: string
}
Update: {
"user_id"?: string
"other_id"?: string
"status"?: string
"created_at"?: string
"updated_at"?: string
}
Relationships: [
{ foreignKeyName: "message_requests_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "message_requests_other_id_fkey"; columns: ["other_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"messages": {
Row: {
"id": string
"sender_id": string
"recipient_id": string
"content": string | null
"media_url": string | null
"media_type": string | null
"file_name": string | null
"view_once": boolean
"viewed_at": string | null
"reply_to": string | null
"is_read": boolean
"reactions": Json
"edited_at": string | null
"deleted_at": string | null
"created_at": string
"story_id": string | null
}
Insert: {
"id"?: string
"sender_id": string
"recipient_id": string
"content"?: string | null
"media_url"?: string | null
"media_type"?: string | null
"file_name"?: string | null
"view_once"?: boolean
"viewed_at"?: string | null
"reply_to"?: string | null
"is_read"?: boolean
"reactions"?: Json
"edited_at"?: string | null
"deleted_at"?: string | null
"created_at"?: string
"story_id"?: string | null
}
Update: {
"id"?: string
"sender_id"?: string
"recipient_id"?: string
"content"?: string | null
"media_url"?: string | null
"media_type"?: string | null
"file_name"?: string | null
"view_once"?: boolean
"viewed_at"?: string | null
"reply_to"?: string | null
"is_read"?: boolean
"reactions"?: Json
"edited_at"?: string | null
"deleted_at"?: string | null
"created_at"?: string
"story_id"?: string | null
}
Relationships: [
{ foreignKeyName: "messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "messages_recipient_id_fkey"; columns: ["recipient_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "messages_reply_to_fkey"; columns: ["reply_to"]; isOneToOne: false; referencedRelation: "messages"; referencedColumns: ["id"] },
{ foreignKeyName: "messages_story_id_fkey"; columns: ["story_id"]; isOneToOne: false; referencedRelation: "stories"; referencedColumns: ["id"] },
]
}
"moderation_actions": {
Row: {
"id": string
"moderator_id": string | null
"report_id": string | null
"target_user_id": string | null
"action": string
"notes": string | null
"created_at": string
"source": string | null
"evidence": Json | null
}
Insert: {
"id"?: string
"moderator_id"?: string | null
"report_id"?: string | null
"target_user_id"?: string | null
"action": string
"notes"?: string | null
"created_at"?: string
"source"?: string | null
"evidence"?: Json | null
}
Update: {
"id"?: string
"moderator_id"?: string | null
"report_id"?: string | null
"target_user_id"?: string | null
"action"?: string
"notes"?: string | null
"created_at"?: string
"source"?: string | null
"evidence"?: Json | null
}
Relationships: [
{ foreignKeyName: "moderation_actions_moderator_id_fkey"; columns: ["moderator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "moderation_actions_target_user_id_fkey"; columns: ["target_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"moderation_appeals": {
Row: {
"id": string
"user_id": string | null
"action_id": string | null
"reason": string
"reviewed_by": string | null
"status": string
"created_at": string
}
Insert: {
"id"?: string
"user_id"?: string | null
"action_id"?: string | null
"reason": string
"reviewed_by"?: string | null
"status"?: string
"created_at"?: string
}
Update: {
"id"?: string
"user_id"?: string | null
"action_id"?: string | null
"reason"?: string
"reviewed_by"?: string | null
"status"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "moderation_appeals_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "moderation_appeals_action_id_fkey"; columns: ["action_id"]; isOneToOne: false; referencedRelation: "moderation_actions"; referencedColumns: ["id"] },
{ foreignKeyName: "moderation_appeals_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"moderator_roles": {
Row: {
"user_id": string
"role": string
"created_at": string
}
Insert: {
"user_id": string
"role"?: string
"created_at"?: string
}
Update: {
"user_id"?: string
"role"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "moderator_roles_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"mutes": {
Row: {
"muter_id": string
"muted_id": string
"created_at": string
}
Insert: {
"muter_id": string
"muted_id": string
"created_at"?: string
}
Update: {
"muter_id"?: string
"muted_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "mutes_muter_id_fkey"; columns: ["muter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "mutes_muted_id_fkey"; columns: ["muted_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"notifications": {
Row: {
"id": string
"user_id": string
"actor_id": string | null
"type": string
"entity_id": string | null
"message": string
"is_read": boolean
"created_at": string
"deliver_after": string
}
Insert: {
"id"?: string
"user_id": string
"actor_id"?: string | null
"type": string
"entity_id"?: string | null
"message": string
"is_read"?: boolean
"created_at"?: string
"deliver_after"?: string
}
Update: {
"id"?: string
"user_id"?: string
"actor_id"?: string | null
"type"?: string
"entity_id"?: string | null
"message"?: string
"is_read"?: boolean
"created_at"?: string
"deliver_after"?: string
}
Relationships: [
{ foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "notifications_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"opportunity_reports": {
Row: {
"id": string
"opportunity_id": string | null
"reporter_id": string | null
"status": string
"reason": string
"created_at": string
}
Insert: {
"id"?: string
"opportunity_id"?: string | null
"reporter_id"?: string | null
"status"?: string
"reason": string
"created_at"?: string
}
Update: {
"id"?: string
"opportunity_id"?: string | null
"reporter_id"?: string | null
"status"?: string
"reason"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "opportunity_reports_opportunity_id_fkey"; columns: ["opportunity_id"]; isOneToOne: false; referencedRelation: "circle_opportunities"; referencedColumns: ["id"] },
{ foreignKeyName: "opportunity_reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"opportunity_saves": {
Row: {
"opportunity_id": string
"user_id": string
}
Insert: {
"opportunity_id": string
"user_id": string
}
Update: {
"opportunity_id"?: string
"user_id"?: string
}
Relationships: [
{ foreignKeyName: "opportunity_saves_opportunity_id_fkey"; columns: ["opportunity_id"]; isOneToOne: false; referencedRelation: "circle_opportunities"; referencedColumns: ["id"] },
{ foreignKeyName: "opportunity_saves_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"poll_votes": {
Row: {
"poll_id": string
"post_id": string | null
"user_id": string
"option_id": string
"created_at": string
}
Insert: {
"poll_id": string
"post_id"?: string | null
"user_id": string
"option_id": string
"created_at"?: string
}
Update: {
"poll_id"?: string
"post_id"?: string | null
"user_id"?: string
"option_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "poll_votes_poll_id_fkey"; columns: ["poll_id"]; isOneToOne: false; referencedRelation: "polls"; referencedColumns: ["id"] },
{ foreignKeyName: "poll_votes_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "poll_votes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"polls": {
Row: {
"id": string
"post_id": string
"question": string
"options": Json
"ends_at": string
"created_at": string
}
Insert: {
"id"?: string
"post_id": string
"question": string
"options": Json
"ends_at": string
"created_at"?: string
}
Update: {
"id"?: string
"post_id"?: string
"question"?: string
"options"?: Json
"ends_at"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "polls_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
]
}
"post_views": {
Row: {
"id": number
"post_id": string
"user_id": string
"created_at": string
}
Insert: {
"id"?: number
"post_id": string
"user_id": string
"created_at"?: string
}
Update: {
"id"?: number
"post_id"?: string
"user_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "post_views_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "post_views_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"posts": {
Row: {
"id": string
"user_id": string
"circle_id": string | null
"content": string | null
"media_url": string | null
"media_type": string | null
"extra_media": Json | null
"thumbnail_url": string | null
"video_duration": number | null
"language": string | null
"category": string | null
"created_at": string
"updated_at": string
"contribution_mode": string
"audience": string
"removed_at": string | null
"nia_request_id": string | null
"legacy_members_only": boolean
}
Insert: {
"id"?: string
"user_id": string
"circle_id"?: string | null
"content"?: string | null
"media_url"?: string | null
"media_type"?: string | null
"extra_media"?: Json | null
"thumbnail_url"?: string | null
"video_duration"?: number | null
"language"?: string | null
"category"?: string | null
"created_at"?: string
"updated_at"?: string
"contribution_mode"?: string
"audience"?: string
"removed_at"?: string | null
"nia_request_id"?: string | null
"legacy_members_only"?: boolean
}
Update: {
"id"?: string
"user_id"?: string
"circle_id"?: string | null
"content"?: string | null
"media_url"?: string | null
"media_type"?: string | null
"extra_media"?: Json | null
"thumbnail_url"?: string | null
"video_duration"?: number | null
"language"?: string | null
"category"?: string | null
"created_at"?: string
"updated_at"?: string
"contribution_mode"?: string
"audience"?: string
"removed_at"?: string | null
"nia_request_id"?: string | null
"legacy_members_only"?: boolean
}
Relationships: [
{ foreignKeyName: "posts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "posts_circle_id_fkey"; columns: ["circle_id"]; isOneToOne: false; referencedRelation: "circles"; referencedColumns: ["id"] },
]
}
"profiles": {
Row: {
"id": string
"username": string
"full_name": string | null
"avatar_url": string | null
"banner_url": string | null
"headline": string | null
"bio": string | null
"website": string | null
"country": string | null
"city": string | null
"university": string | null
"language": string | null
"languages": (string)[] | null
"interests": (string)[] | null
"last_seen_at": string | null
"created_at": string
"updated_at": string
"goals": (string)[]
"is_private": boolean
"open_to": string | null
"ask_me_about": string | null
}
Insert: {
"id": string
"username": string
"full_name"?: string | null
"avatar_url"?: string | null
"banner_url"?: string | null
"headline"?: string | null
"bio"?: string | null
"website"?: string | null
"country"?: string | null
"city"?: string | null
"university"?: string | null
"language"?: string | null
"languages"?: (string)[] | null
"interests"?: (string)[] | null
"last_seen_at"?: string | null
"created_at"?: string
"updated_at"?: string
"goals"?: (string)[]
"is_private"?: boolean
"open_to"?: string | null
"ask_me_about"?: string | null
}
Update: {
"id"?: string
"username"?: string
"full_name"?: string | null
"avatar_url"?: string | null
"banner_url"?: string | null
"headline"?: string | null
"bio"?: string | null
"website"?: string | null
"country"?: string | null
"city"?: string | null
"university"?: string | null
"language"?: string | null
"languages"?: (string)[] | null
"interests"?: (string)[] | null
"last_seen_at"?: string | null
"created_at"?: string
"updated_at"?: string
"goals"?: (string)[]
"is_private"?: boolean
"open_to"?: string | null
"ask_me_about"?: string | null
}
Relationships: [
]
}
"reactions": {
Row: {
"post_id": string
"user_id": string
"emoji": string
"created_at": string
}
Insert: {
"post_id": string
"user_id": string
"emoji": string
"created_at"?: string
}
Update: {
"post_id"?: string
"user_id"?: string
"emoji"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "reactions_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "reactions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"reports": {
Row: {
"id": string
"reporter_id": string
"reported_user_id": string | null
"entity_type": string
"entity_id": string | null
"reason": string
"details": string | null
"status": string
"priority": string
"assigned_to": string | null
"created_at": string
}
Insert: {
"id"?: string
"reporter_id": string
"reported_user_id"?: string | null
"entity_type": string
"entity_id"?: string | null
"reason": string
"details"?: string | null
"status"?: string
"priority"?: string
"assigned_to"?: string | null
"created_at"?: string
}
Update: {
"id"?: string
"reporter_id"?: string
"reported_user_id"?: string | null
"entity_type"?: string
"entity_id"?: string | null
"reason"?: string
"details"?: string | null
"status"?: string
"priority"?: string
"assigned_to"?: string | null
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "reports_reported_user_id_fkey"; columns: ["reported_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
{ foreignKeyName: "reports_assigned_to_fkey"; columns: ["assigned_to"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"reposts": {
Row: {
"post_id": string
"user_id": string
"created_at": string
}
Insert: {
"post_id": string
"user_id": string
"created_at"?: string
}
Update: {
"post_id"?: string
"user_id"?: string
"created_at"?: string
}
Relationships: [
{ foreignKeyName: "reposts_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
{ foreignKeyName: "reposts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"stories": {
Row: {
"id": string
"user_id": string
"media_url": string
"media_type": string
"created_at": string
"expires_at": string
"audience": string
"removed_at": string | null
}
Insert: {
"id"?: string
"user_id": string
"media_url": string
"media_type": string
"created_at"?: string
"expires_at"?: string
"audience"?: string
"removed_at"?: string | null
}
Update: {
"id"?: string
"user_id"?: string
"media_url"?: string
"media_type"?: string
"created_at"?: string
"expires_at"?: string
"audience"?: string
"removed_at"?: string | null
}
Relationships: [
{ foreignKeyName: "stories_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"story_views": {
Row: {
"story_id": string
"viewer_id": string
"viewed_at": string
}
Insert: {
"story_id": string
"viewer_id": string
"viewed_at"?: string
}
Update: {
"story_id"?: string
"viewer_id"?: string
"viewed_at"?: string
}
Relationships: [
{ foreignKeyName: "story_views_story_id_fkey"; columns: ["story_id"]; isOneToOne: false; referencedRelation: "stories"; referencedColumns: ["id"] },
{ foreignKeyName: "story_views_viewer_id_fkey"; columns: ["viewer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"test_profiles": {
Row: {
"user_id": string
}
Insert: {
"user_id": string
}
Update: {
"user_id"?: string
}
Relationships: [
{ foreignKeyName: "test_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
"user_preferences": {
Row: {
"user_id": string
"data_saver": boolean
"autoplay": boolean
"interface_language": string
"content_languages": (string)[]
"dm_policy": string
"show_presence": boolean
"read_receipts": boolean
"notify_replies": boolean
"notify_messages": boolean
"notify_circles": boolean
"digest": boolean
"quiet_start": string | null
"quiet_end": string | null
"timezone": string
"updated_at": string
}
Insert: {
"user_id": string
"data_saver"?: boolean
"autoplay"?: boolean
"interface_language"?: string
"content_languages"?: (string)[]
"dm_policy"?: string
"show_presence"?: boolean
"read_receipts"?: boolean
"notify_replies"?: boolean
"notify_messages"?: boolean
"notify_circles"?: boolean
"digest"?: boolean
"quiet_start"?: string | null
"quiet_end"?: string | null
"timezone"?: string
"updated_at"?: string
}
Update: {
"user_id"?: string
"data_saver"?: boolean
"autoplay"?: boolean
"interface_language"?: string
"content_languages"?: (string)[]
"dm_policy"?: string
"show_presence"?: boolean
"read_receipts"?: boolean
"notify_replies"?: boolean
"notify_messages"?: boolean
"notify_circles"?: boolean
"digest"?: boolean
"quiet_start"?: string | null
"quiet_end"?: string | null
"timezone"?: string
"updated_at"?: string
}
Relationships: [
{ foreignKeyName: "user_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
]
}
}; Views: Record<never, never>; Functions: {
"accept_circle_join_request": { Args: {"request_id": string | null;}; Returns: undefined };
"circle_activity": { Args: {"circle_ids": (string)[] | null;}; Returns: {"circle_id": string;"last_post": string}[] };
"circle_manager": { Args: {"target_circle": string | null;}; Returns: boolean };
"conversation_page": { Args: {"before_time"?: string | null;"before_user"?: string | null;"page_size"?: number | null;}; Returns: {"other_id": string;"content": string;"created_at": string;"is_read": boolean;"sender_id": string;"media_type": string}[] };
"get_recommended_circles": { Args: {"p_user_id": string | null;"p_limit"?: number | null;}; Returns: {"id": string;"name": string;"slug": string;"description": string;"university": string;"category": string;"country": string;"is_private": boolean;"created_at": string;"member_count": number;"relevance_score": number}[] };
"get_trending_hashtags": { Args: {"p_since"?: string | null;"p_limit"?: number | null;}; Returns: {"tag": string;"post_count": number}[] };
"manage_circle_member": { Args: {"target_circle": string | null;"target_user": string | null;"new_role": string | null;}; Returns: undefined };
"mark_conversation_read": { Args: {"other_user": string | null;}; Returns: undefined };
"moderate_report": { Args: {"report_source": string | null;"report_uuid": string | null;"decision": string | null;"explanation": string | null;}; Returns: undefined };
"owned_media": { Args: Record<never, never>; Returns: {"bucket_id": string;"name": string}[] };
"prepare_account_deletion": { Args: Record<never, never>; Returns: undefined };
"profile_card": { Args: {"target_user": string | null;}; Returns: {"id": string;"username": string;"avatar_url": string;"is_private": boolean}[] };
"publish_post": { Args: {"payload": Json | null;"poll"?: Json | null;}; Returns: Database['public']['Tables']["posts"]['Row'] };
"report_evidence": { Args: {"report_source": string | null;"report_uuid": string | null;}; Returns: Json };
"request_follow": { Args: {"target_user": string | null;}; Returns: string };
"respond_follow": { Args: {"requester": string | null;"accept": boolean | null;}; Returns: undefined };
"review_appeal": { Args: {"appeal_id": string | null;"approve": boolean | null;"explanation": string | null;}; Returns: undefined };
"save_preferences": { Args: {"settings": Json | null;"private_account": boolean | null;}; Returns: undefined };
"unread_message_count": { Args: Record<never, never>; Returns: number };
}; Enums: Record<never, never>; CompositeTypes: Record<never, never> } }
