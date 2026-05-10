'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, UserMinus } from 'lucide-react'

export default function FollowButton({
  currentUserId,
  targetUserId,
  initialIsFollowing,
}: {
  currentUserId: string
  targetUserId: string
  initialIsFollowing: boolean
}) {
  const supabase = createClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  async function toggleFollow() {
    setLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete()
        .match({ follower_id: currentUserId, following_id: targetUserId })
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      })
    }
    setIsFollowing(!isFollowing)
    setLoading(false)
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition disabled:opacity-50 ${
        isFollowing
          ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 hover:text-red-500 text-zinc-600'
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      }`}
    >
      {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
      {loading ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}