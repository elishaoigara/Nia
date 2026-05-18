import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FlicksClient from './FlicksClient'
import type { FlickPost } from './FlicksClient'

export default async function ReelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: videos } = await supabase
    .from('posts')
    .select(`
      id, content, media_url, media_type, created_at, language,
      profiles:user_id (id, username, avatar_url, country),
      likes (user_id),
      comments (id)
    `)
    .eq('media_type', 'video')
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30)

  return <FlicksClient videos={(videos ?? []) as unknown as FlickPost[]} currentUserId={user.id} />
}