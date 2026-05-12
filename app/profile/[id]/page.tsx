import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'
import {
  Edit,
  Calendar,
  MapPin,
  MessageCircle,
  BadgeCheck,
} from 'lucide-react'
import Link from 'next/link'
import FollowButton from '@/components/FollowButton'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function ProfilePage({
  params,
}: ProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) redirect('/login')

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Profile not found
          </h1>
          <Link
            href="/"
            className="text-purple-600 hover:underline mt-4 inline-block"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `*, profiles:user_id (id, username, avatar_url, country, city), likes (user_id), comments (id)`
    )
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
      {/* PROFILE CARD */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 mb-6">
        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="w-16 h-16 object-cover"
                  alt={profile.full_name}
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center text-2xl font-bold text-white">
                  {profile.username?.[0]?.toUpperCase() ??
                    '?'}
                </div>
              )}
            </div>

            <div>
              {/* NAME + VERIFIED BADGE */}
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold">
                  {profile.full_name}
                </h1>

                {profile.is_verified && (
                  <BadgeCheck
                    size={18}
                    className="text-purple-600"
                    fill="rgba(168,85,247,0.15)"
                  />
                )}
              </div>

              <p className="text-purple-600 font-medium text-sm">
                @{profile.username}
              </p>

              {(profile.country ||
                profile.city) && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                  <MapPin size={12} />
                  <span>
                    {profile.city
                      ? `${profile.city}, ${profile.country}`
                      : profile.country}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwnProfile ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/profile/edit"
                  className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-3 py-1.5 rounded-xl text-sm font-medium transition"
                >
                  <Edit size={14} />
                  Edit
                </Link>

                {!profile.is_verified && (
                  <Link
                    href="/profile/verify"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white transition"
                    style={{
                      background:
                        'var(--grad-brand)',
                    }}
                  >
                    <BadgeCheck size={14} />
                    Get Verified
                  </Link>
                )}

                {profile.is_verified && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                    style={{
                      background:
                        'rgba(168,85,247,0.1)',
                      color:
                        'var(--nia-violet)',
                    }}
                  >
                    <BadgeCheck size={14} />
                    Verified ✓
                  </div>
                )}
              </div>
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
                  currentUserId={
                    currentUser.id
                  }
                  targetUserId={id}
                  initialIsFollowing={
                    isFollowing
                  }
                />
              </>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="flex gap-6 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-center">
            <p className="font-bold text-lg">
              {posts?.length ?? 0}
            </p>
            <p className="text-xs text-zinc-400">
              Posts
            </p>
          </div>

          <div className="text-center">
            <p className="font-bold text-lg">
              {followersCount ?? 0}
            </p>
            <p className="text-xs text-zinc-400">
              Followers
            </p>
          </div>

          <div className="text-center">
            <p className="font-bold text-lg">
              {followingCount ?? 0}
            </p>
            <p className="text-xs text-zinc-400">
              Following
            </p>
          </div>
        </div>

        {/* BIO */}
        {profile.bio && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* JOIN DATE */}
        <div className="mt-4 text-xs text-zinc-400 flex items-center gap-1.5">
          <Calendar size={12} />
          Joined{' '}
          {new Date(
            profile.created_at ||
              Date.now()
          ).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* POSTS */}
      <div className="space-y-4">
        <h2 className="font-semibold px-1">
          Posts{' '}
          <span className="text-zinc-400 font-normal">
            ({posts?.length ?? 0})
          </span>
        </h2>

        {posts && posts.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-12 text-center text-zinc-400">
            No posts yet
          </div>
        )}

        {posts?.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUser.id}
          />
        ))}
      </div>
    </main>
  )
}