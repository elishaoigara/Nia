import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { Edit, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect('/login')

  // Fetch profile
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
          <p className="text-zinc-500 mt-2">This user doesn't exist or hasn't completed onboarding.</p>
          <Link href="/" className="text-purple-600 hover:underline mt-4 inline-block">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Fetch user's posts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (id, username, avatar_url, university),
      likes (user_id),
      comments (id)
    `)
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const isOwnProfile = currentUser.id === id

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  className="w-full h-full object-cover" 
                  alt={profile.full_name} 
                />
              ) : (
                profile.username?.[0]?.toUpperCase() || '?'
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-purple-600 font-medium">@{profile.username}</p>
              {profile.university && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                  <MapPin size={16} />
                  <span>{profile.university}</span>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <Link
              href="/profile/edit"
              className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              <Edit size={18} />
              Edit
            </Link>
          )}
        </div>

        {profile.bio && (
          <p className="mt-6 text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-500 flex items-center gap-2">
          <Calendar size={16} />
          Joined {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>

      {/* User's Posts */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg px-1 flex items-center gap-2">
          Posts 
          <span className="text-zinc-400 text-base">({posts?.length || 0})</span>
        </h2>

        {posts && posts.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-400">No posts yet</p>
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