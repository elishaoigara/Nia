import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FlicksClient from './FlicksClient'
import type { FlickPost } from './FlicksClient'

const SHORT_FLICK_SEC = 60

export default async function ReelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: videos } = await supabase
    .from('posts')
    .select(`
      id, content, media_url, media_type, created_at, language, video_duration, category,
      profiles:user_id (id, username, avatar_url, country),
      likes (user_id),
      comments (id),
      post_views (id)
    `)
    // If/when you add a thumbnail_url column (generate a poster frame at upload time),
    // add it to the select above and it'll be picked up automatically by FlicksClient —
    // no other changes needed.
    .eq('media_type', 'video')
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(60)

  const all = (videos ?? []) as unknown as FlickPost[]

  // <=60s (or unknown duration) -> Flicks, >60s -> Long Flicks
  const shorts = all.filter(v => !v.video_duration || v.video_duration <= SHORT_FLICK_SEC).slice(0, 30)
  const longs = all.filter(v => (v.video_duration ?? 0) > SHORT_FLICK_SEC).slice(0, 30)

  return <FlicksClient shorts={shorts} longs={longs} currentUserId={user.id} />
}