import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CreatePost from '@/components/CreatePost'
import { Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }

export default async function CirclePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: circle } = await supabase.from('circles').select('*, circle_members (user_id)').eq('slug', slug).single()
  if (!circle) notFound()

  const { data: posts } = await supabase.from('posts')
    .select('*, profiles:user_id (id, username, avatar_url, university), likes (user_id), comments (id)')
    .eq('circle_id', circle.id).order('created_at', { ascending: false })

  const isMember = circle.circle_members?.some((m: any) => m.user_id === user.id)

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <Link href="/circles" className="inline-flex items-center gap-2 text-sm font-semibold transition-all active:scale-95" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> All Circles
      </Link>

      {/* Circle header */}
      <div className="card overflow-hidden">
        <div className="h-16 w-full" style={{ background: 'var(--grad-cool)' }} />
        <div className="px-5 pb-5 pt-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-extrabold text-2xl">{circle.name}</h1>
              {circle.category && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block" style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }}>
                  {circle.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1" style={{ color: 'var(--text-tertiary)' }}>
              <Users size={15} />
              <span className="text-sm font-semibold">{circle.circle_members?.length ?? 0}</span>
            </div>
          </div>
          {circle.description && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{circle.description}</p>}
        </div>
      </div>

      {/* Post creator — only for members */}
      {isMember && <CreatePost userId={user.id} circleId={circle.id} />}

      {/* Posts */}
      <div className="space-y-3">
        {posts && posts.length === 0 && (
          <div className="card text-center py-12 space-y-2">
            <div className="text-4xl">📭</div>
            <p className="font-bold">No posts yet</p>
            {!isMember && <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Join this circle to post!</p>}
          </div>
        )}
        {posts?.map(post => <PostCard key={post.id} post={post} currentUserId={user.id} />)}
      </div>
    </main>
  )
}
