import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { Hash } from 'lucide-react'

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>
}) {
  const { tag } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: hashtagRows } = await supabase
    .from('hashtags')
    .select('post_id')
    .eq('tag', tag.toLowerCase())

  const postIds = hashtagRows?.map(h => h.post_id) ?? []

  const { data: posts } = postIds.length > 0
    ? await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, country, city),
          circles:circle_id (id, name, slug),
          likes (user_id),
          comments (id)
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(255,107,107,0.15))' }}
        >
          <Hash size={20} style={{ color: 'var(--nia-violet)' }} />
        </div>
        <div>
          <h1 className="font-extrabold text-2xl">#{tag}</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {posts?.length ?? 0} posts
          </p>
        </div>
      </div>

      {posts?.length === 0 && (
        <div className="card text-center py-20 space-y-3">
          <div className="text-5xl">#️⃣</div>
          <p className="font-bold">No posts yet for #{tag}</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Be the first to use this hashtag!
          </p>
        </div>
      )}

      {posts?.map(post => (
        <PostCard key={post.id} post={post} currentUserId={user.id} />
      ))}
    </main>
  )
}