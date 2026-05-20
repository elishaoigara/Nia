'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'

interface FollowButtonProps {
  currentUserId: string
  targetUserId: string
  initialIsFollowing: boolean
}

export default function FollowButton({
  currentUserId,
  targetUserId,
  initialIsFollowing,
}: FollowButtonProps) {
  const supabase = createClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  async function toggleFollow() {
    // Self-following prevention check
    if (currentUserId === targetUserId) return

    setLoading(true)
    
    // Save the previous state for error rollbacks
    const previousState = isFollowing
    
    // 1. Optimistic Update: Instantly flip UI state for a super fast native feel
    setIsFollowing(!previousState)

    try {
      if (previousState) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .match({ follower_id: currentUserId, following_id: targetUserId })
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId,
          })
          
        if (error) throw error
      }
    } catch (err) {
      console.error('Follow operation failed:', err)
      // 2. Rollback UI immediately if database operation dropped or network failed
      setIsFollowing(previousState)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading || currentUserId === targetUserId}
      className="tap-sm flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold select-none transition-all duration-150 active:scale-95 disabled:opacity-40 min-h-8.5"
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
              border: '1px solid transparent',
            }
      }
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isFollowing ? (
        <UserMinus size={14} />
      ) : (
        <UserPlus size={14} />
      )}
      
      <span>
        {loading ? (isFollowing ? 'Leaving…' : 'Joining…') : isFollowing ? 'Following' : 'Follow'}
      </span>
    </button>
  )
}