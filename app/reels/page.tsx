import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReelsClient from './ReelsClient'
import type { ReelPost } from './ReelsClient'

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

  return <ReelsClient videos={(videos ?? []) as unknown as ReelPost[]} currentUserId={user.id} />
}