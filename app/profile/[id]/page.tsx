import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { Edit, Calendar, MapPin, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import FollowButton from '@/components/FollowButton'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <Link href="/" className="text-purple-600 hover:underline mt-4 inline-block">← Back to Home</Link>
        </div>
      </div>
    )
  }

  const { data: posts } = await supabase
    .from('posts')
    .select(`*, profiles:user_id (id, username, avatar_url, country, city), likes (user_id), comments (id)`)
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', id)

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', id)

  const { data: followData } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', currentUser.id)
    .eq('following_id', id)
    .single()

  const isFollowing = !!followData
  const isOwnProfile = currentUser.id === id

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 mb-6">
        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-16 h-16 object-cover" alt={profile.full_name} />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center text-2xl font-bold text-white">
                  {profile.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile.full_name}</h1>
              <p className="text-purple-600 font-medium text-sm">@{profile.username}</p>
              {(profile.country || profile.city) && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                  <MapPin size={12} />
                  <span>{profile.city ? `${profile.city}, ${profile.country}` : profile.country}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwnProfile ? (
              <Link
                href="/profile/edit"
                className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-3 py-1.5 rounded-xl text-sm font-medium transition"
              >
                <Edit size={14} />
                Edit
              </Link>
            ) : (
              <>
                <Link
                  href={`/messages/${id}`}
                  className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-3 py-1.5 rounded-xl text-sm font-medium transition"
                >
                  <MessageCircle size={14} />
                  Message
                </Link>
                <FollowButton
                  currentUserId={currentUser.id}
                  targetUserId={id}
                  initialIsFollowing={isFollowing}
                />
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-center">
            <p className="font-bold text-lg">{posts?.length ?? 0}</p>
            <p className="text-xs text-zinc-400">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{followersCount ?? 0}</p>
            <p className="text-xs text-zinc-400">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{followingCount ?? 0}</p>
            <p className="text-xs text-zinc-400">Following</p>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{profile.bio}</p>
        )}

        <div className="mt-4 text-xs text-zinc-400 flex items-center gap-1.5">
          <Calendar size={12} />
          Joined {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold px-1">
          Posts <span className="text-zinc-400 font-normal">({posts?.length ?? 0})</span>
        </h2>

        {posts && posts.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-12 text-center text-zinc-400">
            No posts yet
          </div>
        )}

        {posts?.map(post => (
          <PostCard key={post.id} post={post} currentUserId={currentUser.id} />
        ))}
      </div>
    </main>
  )
}