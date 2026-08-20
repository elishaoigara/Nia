export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface ProfileSummary {
  id: string
  username: string
  full_name?: string | null
  avatar_url: string | null
  country?: string | null
  city?: string | null
  university?: string | null
  bio?: string | null
  interests?: string[] | string | null
  language?: string | null
  last_seen_at?: string | null
}

export interface Profile extends ProfileSummary {
  banner_url?: string | null
  headline?: string | null
  website?: string | null
  languages?: string[] | string | null
  interests?: string[] | string | null
  created_at?: string | null
  tribe?: string | null
  gender?: string | null
  birth_date?: string | null
  verified?: boolean | null
  is_verified?: boolean | null
  verification_status?: string | null
}

export interface CircleMember {
  user_id?: string
  count?: number
  profiles?: ProfileSummary | null
}

export interface Circle {
  id: string
  name: string
  slug: string
  description?: string | null
  university?: string | null
  category?: string | null
  country?: string | null
  is_private?: boolean | null
  created_at?: string | null
  circle_members?: CircleMember[]
  member_count?: number
  relevance_score?: number
}

export interface CircleJoinRequest {
  id: string
  user_id: string
  profiles: ProfileSummary | null
}

export interface MediaItem {
  url: string
  type: 'image' | 'video' | 'gif'
}

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  ends_at: string
}

export interface UserReference {
  user_id: string
}

export interface CommentReference {
  id: string
  profiles?: ProfileSummary | null
}

export interface Post {
  id: string
  user_id: string
  content: string | null
  created_at: string
  media_url: string | null
  media_type: string | null
  extra_media?: MediaItem[] | null
  thumbnail_url?: string | null
  video_duration?: number | null
  category?: string | null
  language: string | null
  circle_id?: string | null
  profiles: ProfileSummary | null
  circles?: Pick<Circle, 'id' | 'name' | 'slug'> | null
  likes?: UserReference[]
  comments?: CommentReference[]
  reposts?: UserReference[]
  bookmarks?: UserReference[]
  polls?: Poll[] | null
  likes_count?: number
  comments_count?: number
  lomi_count?: number
  reposts_count?: number
  viewer_is_following?: boolean
  post_views?: { id: string }[]
  completion_rate?: number
  total_watch_time?: number
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id?: string | null
  content: string | null
  created_at: string
  media_url?: string | null
  media_type?: MediaItem['type'] | null
  extra_media?: MediaItem[] | null
  profiles?: ProfileSummary | null
  likes?: UserReference[]
}

export interface CommentNode extends Comment {
  children: CommentNode[]
}

export interface HashtagRow {
  tag: string
  post_id?: string
}

export interface FollowRow {
  following_id: string
}

export interface BlockRow {
  blocked_id: string
}

export interface MuteRow {
  muted_id: string
}

export interface StoryRow {
  id: string
  user_id: string
}

export interface StoryViewRow {
  story_id: string
  viewer_id?: string
  viewed_at?: string
}

export interface MessageRequestRow {
  other_id: string
  status: string
}

export interface ConversationMessageRow {
  sender_id: string
  recipient_id: string
  created_at: string
  content: string | null
  is_read?: boolean
  profiles: ProfileSummary
}

export interface GifApiResult {
  media_formats?: {
    gif?: { url?: string }
    tinygif?: { url?: string }
  }
}
