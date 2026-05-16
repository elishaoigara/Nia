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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
      style={
        isFollowing
          ? {
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }
          : {
              background: 'var(--grad-brand)',
              color: '#fff',
              border: 'none',
            }
      }
    >
      {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
      {loading ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}