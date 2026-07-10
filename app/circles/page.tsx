import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CreatePost from '@/components/CreatePost'
import CircleJoinButton from '@/components/CircleJoinButton'
import CircleRequestsPanel from '@/components/CircleRequestsPanel'
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '@/components/CircleCard'
import { Users, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }

export default async function CirclePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: circle } = await supabase.from('circles').select('*, circle_members (user_id)').eq('slug', slug).single()
  if (!circle) notFound()

  const isMember = circle.circle_members?.some((m: any) => m.user_id === user.id)
  const isLocked = circle.is_private && !isMember

  // Only need to know about a pending request when the circle is actually
  // gated — no point spending a query on it otherwise.
  let requestStatus: 'pending' | null = null
  if (isLocked) {
    const { data: reqRow } = await supabase
      .from('circle_join_requests')
      .select('status')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (reqRow?.status === 'pending') requestStatus = 'pending'
  }

  const { data: posts } = isLocked ? { data: [] } : await supabase.from('posts')
    .select('*, profiles:user_id (id, username, avatar_url, university), likes (user_id), comments (id)')
    .eq('circle_id', circle.id).order('created_at', { ascending: false })

  // Any current member can see (and act on) pending requests for a private
  // circle — no point querying this for public circles, or for someone who
  // isn't a member yet.
  let pendingRequests: any[] = []
  if (isMember && circle.is_private) {
    const { data: reqs } = await supabase
      .from('circle_join_requests')
      .select('id, user_id, profiles:user_id (id, username, avatar_url, university)')
      .eq('circle_id', circle.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    pendingRequests = reqs ?? []
  }

  const cat = circle.category?.toLowerCase() ?? 'default'
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
  const emoji = CATEGORY_EMOJI[cat] ?? CATEGORY_EMOJI.default

  return (
    <main className="w-full max-w-xl px-4 py-6 space-y-5">
      {/* Back */}
      <Link href="/circles" className="inline-flex items-center gap-2 text-sm font-semibold transition-all active:scale-95" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> All Circles
      </Link>

      {/* Circle header — banner now carries the circle's own category color
          instead of a flat generic gradient, same colors CircleCard uses. */}
      <div className="card overflow-hidden">
        <div className="h-16 w-full flex items-end px-5 pb-2" style={{ background: color, opacity: 0.92 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
        </div>
        <div className="px-5 pb-5 pt-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-2xl">{circle.name}</h1>
                {circle.is_private && <Lock size={16} style={{ color: 'var(--text-tertiary)' }} />}
              </div>
              {circle.category && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block" style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }}>
                  {circle.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 mt-1" style={{ color: 'var(--text-tertiary)' }}>
              <Users size={15} />
              <span className="text-sm font-semibold">{circle.circle_members?.length ?? 0}</span>
            </div>
          </div>
          {circle.description && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{circle.description}</p>}

          <CircleJoinButton
            circleId={circle.id}
            currentUserId={user.id}
            isPrivate={circle.is_private}
            initialIsMember={isMember}
            initialRequestStatus={requestStatus}
            accentColor={color}
          />
        </div>
      </div>

      {isLocked ? (
        <div className="card text-center py-14 space-y-2">
          <Lock size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto' }} />
          <p className="font-bold text-base" style={{ marginTop: 8 }}>This circle is private</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {requestStatus === 'pending'
              ? "Your request is pending — you'll see posts once a member accepts."
              : 'Request to join to see what people are posting here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Pending join requests — only ever non-empty for members of a private circle */}
          {isMember && circle.is_private && <CircleRequestsPanel circleId={circle.id} requests={pendingRequests} />}

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
        </>
      )}
    </main>
  )
}