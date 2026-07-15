import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CreatePost from '@/components/CreatePost'
import CircleJoinButton from '@/components/CircleJoinButton'
import CircleRequestsPanel from '@/components/CircleRequestsPanel'
import { Users, ArrowLeft, Lock, Globe, School, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string }>
}

const CATEGORY_COLORS: Record<string, string> = {
  tech: 'var(--nia-sky)', art: 'var(--nia-pink)', sports: 'var(--nia-mint)',
  music: 'var(--nia-amber)', science: 'var(--nia-violet)', default: 'var(--nia-coral)',
}

export default async function CirclePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { sort } = await searchParams
  const sortMode = sort === 'top' ? 'top' : 'recent'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: circle } = await supabase
    .from('circles')
    .select('*, circle_members (user_id, profiles:user_id (id, username, avatar_url))')
    .eq('slug', slug)
    .single()
  if (!circle) notFound()

  const { data: posts } = await supabase.from('posts')
    .select('*, profiles:user_id (id, username, avatar_url, university), likes (user_id), comments (id)')
    .eq('circle_id', circle.id)
    .order('created_at', { ascending: false })

  const members = circle.circle_members ?? []
  const isMember = members.some((m: any) => m.user_id === user.id)

  let requestStatus: 'pending' | null = null
  if (circle.is_private && !isMember) {
    const { data: req } = await supabase
      .from('circle_join_requests')
      .select('status')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (req?.status === 'pending') requestStatus = 'pending'
  }

  // Only members who are already in the circle can see/act on join requests —
  // matches the "members read circle join requests" RLS policy, so this
  // query just returns empty for non-members rather than erroring.
  let pendingRequests: any[] = []
  if (circle.is_private && isMember) {
    const { data } = await supabase
      .from('circle_join_requests')
      .select('id, user_id, profiles:user_id (id, username, avatar_url, university)')
      .eq('circle_id', circle.id)
      .eq('status', 'pending')
    pendingRequests = data ?? []
  }

  const sortedPosts = posts ? [...posts].sort((a: any, b: any) => {
    if (sortMode === 'top') return (b.likes?.length ?? 0) - (a.likes?.length ?? 0)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }) : []

  const color = CATEGORY_COLORS[circle.category?.toLowerCase() ?? 'default'] ?? CATEGORY_COLORS.default
  const previewMembers = members.slice(0, 6)
  const extraMemberCount = Math.max(0, members.length - previewMembers.length)
  const createdDate = circle.created_at
    ? new Date(circle.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <main className="w-full max-w-xl px-4 py-6 space-y-5">
      {/* Back */}
      <Link href="/circles" className="inline-flex items-center gap-2 text-sm font-semibold transition-all active:scale-95" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> All Circles
      </Link>

      {/* Circle header */}
      <div className="card overflow-hidden">
        <div className="h-16 w-full" style={{ background: `linear-gradient(135deg, ${color}, var(--grad-cool))` }} />
        <div className="px-5 pb-5 pt-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-2xl">{circle.name}</h1>
                <span
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                  style={{ background: 'var(--surface-1)', color: 'var(--text-tertiary)' }}
                >
                  {circle.is_private ? <Lock size={10} /> : <Globe size={10} />}
                  {circle.is_private ? 'Private' : 'Public'}
                </span>
              </div>
              {circle.category && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full mt-2 inline-block"
                  style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }}
                >
                  {circle.category}
                </span>
              )}
            </div>
          </div>

          {circle.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{circle.description}</p>
          )}

          {/* About row: campus + created date */}
          {(circle.university || createdDate) && (
            <div className="flex items-center gap-4 flex-wrap text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {circle.university && (
                <span className="flex items-center gap-1.5"><School size={13} /> {circle.university}</span>
              )}
              {createdDate && (
                <span className="flex items-center gap-1.5"><Calendar size={13} /> Since {createdDate}</span>
              )}
            </div>
          )}

          {/* Member avatar stack */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center">
              {previewMembers.map((m: any, i: number) => {
                const p = m.profiles
                return (
                  <div
                    key={m.user_id}
                    title={p?.username ?? ''}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
                      marginLeft: i === 0 ? 0 : -8, border: '2px solid var(--surface-0)',
                      background: 'var(--grad-brand)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
                    }}
                  >
                    {p?.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (p?.username?.[0]?.toUpperCase() ?? '?')}
                  </div>
                )
              })}
              <div className="flex items-center gap-1.5 ml-3" style={{ color: 'var(--text-secondary)' }}>
                <Users size={14} />
                <span className="text-sm font-semibold">
                  {members.length}{extraMemberCount > 0 ? ` (+${extraMemberCount} more)` : ''}
                </span>
              </div>
            </div>

            <CircleJoinButton
              circleId={circle.id}
              currentUserId={user.id}
              isPrivate={!!circle.is_private}
              initialIsMember={isMember}
              initialRequestStatus={requestStatus}
              accentColor={color}
            />
          </div>
        </div>
      </div>

      {/* Pending join requests — only visible to existing members of a private circle */}
      {pendingRequests.length > 0 && (
        <CircleRequestsPanel circleId={circle.id} requests={pendingRequests} />
      )}

      {/* Post creator — only for members */}
      {isMember && <CreatePost userId={user.id} circleId={circle.id} />}

      {/* Sort tabs */}
      {sortedPosts.length > 0 && (
        <div className="flex items-center gap-2">
          <Link
            href={`/circles/${slug}?sort=recent`}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={sortMode === 'recent'
              ? { background: color, color: '#fff' }
              : { background: 'var(--surface-1)', color: 'var(--text-secondary)' }}
          >
            Recent
          </Link>
          <Link
            href={`/circles/${slug}?sort=top`}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={sortMode === 'top'
              ? { background: color, color: '#fff' }
              : { background: 'var(--surface-1)', color: 'var(--text-secondary)' }}
          >
            Top
          </Link>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {sortedPosts.length === 0 && (
          <div className="card text-center py-12 space-y-2">
            <div className="text-4xl">📭</div>
            <p className="font-bold">No posts yet</p>
            {!isMember && <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Join this circle to post!</p>}
          </div>
        )}
        {sortedPosts.map((post: any) => <PostCard key={post.id} post={post} currentUserId={user.id} />)}
      </div>
    </main>
  )
}