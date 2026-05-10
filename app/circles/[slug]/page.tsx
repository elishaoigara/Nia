import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CreatePost from '@/components/CreatePost'
import { Users } from 'lucide-react'

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: circle } = await supabase
    .from('circles')
    .select('*, circle_members (user_id)')
    .eq('slug', slug)
    .single()

  if (!circle) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (id, username, avatar_url, university),
      circles:circle_id (id, name, slug),
      likes (user_id),
      comments (id)
    `)
    .eq('circle_id', circle.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const isMember = circle.circle_members?.some(
    (m: any) => m.user_id === user.id
  )
  const memberCount = circle.circle_members?.length ?? 0

  const CATEGORY_COLORS: Record<string, string> = {
    tech: 'bg-blue-50 text-blue-600',
    arts: 'bg-pink-50 text-pink-600',
    business: 'bg-amber-50 text-amber-600',
    sports: 'bg-green-50 text-green-600',
    general: 'bg-purple-50 text-purple-600',
  }
  const colorClass = CATEGORY_COLORS[circle.category] ?? CATEGORY_COLORS.general

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{circle.name}</h1>
            {circle.university && (
              <p className="text-sm text-zinc-400 mt-0.5">{circle.university}</p>
            )}
          </div>
          {circle.category && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${colorClass}`}>
              {circle.category}
            </span>
          )}
        </div>

        {circle.description && (
          <p className="text-sm text-zinc-500 leading-relaxed">{circle.description}</p>
        )}

        <div className="flex items-center gap-1.5 text-sm text-zinc-400 pt-1">
          <Users size={14} />
          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>
      </div>

      {isMember ? (
        <CreatePost userId={user.id} circleId={circle.id} />
      ) : (
        <div className="text-center py-5 text-sm text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          Join this circle to post here
        </div>
      )}

      {posts && posts.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">Be the first to post in this circle</p>
        </div>
      )}

      {posts?.map(post => (
        <PostCard key={post.id} post={post} currentUserId={user.id} />
      ))}
    </main>
  )
}