import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { Edit, MapPin, MessageSquare, Calendar } from 'lucide-react'
import Link from 'next/link'

interface ProfilePageProps { params: Promise<{ id: string }> }

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect('/login')

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (profileError || !profile) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-10 text-center space-y-3 max-w-sm">
        <div className="text-4xl">😕</div>
        <h1 className="font-extrabold text-2xl">Not found</h1>
        <p style={{ color: 'var(--text-tertiary)' }}>This profile doesn't exist.</p>
        <Link href="/" className="btn-primary inline-flex">← Home</Link>
      </div>
    </div>
  )

  const { data: posts } = await supabase.from('posts').select('*, profiles:user_id (id, username, avatar_url, university), likes (user_id), comments (id)').eq('user_id', id).order('created_at', { ascending: false })

  const isOwnProfile = currentUser.id === id

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Profile card */}
      <div className="card overflow-hidden">
        {/* Cover gradient */}
        <div className="h-24 w-full" style={{ background: 'var(--grad-brand)', opacity: 0.8 }} />

        <div className="px-5 pb-5">
          {/* Avatar + actions */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="avatar-ring" style={{ padding: '3px' }}>
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-2xl" style={{ background: 'var(--grad-brand)' }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                  : profile.username?.[0]?.toUpperCase() ?? '?'
                }
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {isOwnProfile ? (
                <Link href="/profile/edit" className="btn-ghost flex items-center gap-1.5 py-2 px-3 text-sm">
                  <Edit size={14} /> Edit
                </Link>
              ) : (
                <Link href={`/messages/${id}`} className="btn-primary flex items-center gap-1.5 py-2 px-3 text-sm" style={{ borderRadius: '12px', padding: '8px 14px', fontSize: '13px' }}>
                  <MessageSquare size={14} /> Message
                </Link>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-1">
            <h1 className="font-extrabold text-2xl">{profile.full_name}</h1>
            <p className="font-semibold text-sm" style={{ color: 'var(--nia-violet)' }}>@{profile.username}</p>
            {profile.university && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <MapPin size={13} />
                <span>{profile.university}</span>
              </div>
            )}
            {profile.bio && (
              <p className="text-sm leading-relaxed pt-2" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-center">
              <div className="font-extrabold text-lg">{posts?.length ?? 0}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Posts</div>
            </div>
            <div className="text-center flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginLeft: 'auto' }}>
              <Calendar size={12} />
              Joined {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-lg px-1">Posts</h2>
        {posts && posts.length === 0 && (
          <div className="card text-center py-12 space-y-2">
            <div className="text-4xl">📭</div>
            <p className="font-bold">No posts yet</p>
          </div>
        )}
        {posts?.map(post => <PostCard key={post.id} post={post} currentUserId={currentUser.id} />)}
      </div>
    </main>
  )
}
