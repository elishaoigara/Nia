'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { currentUserId: string; targetUserId: string; initialIsFollowing: boolean; onFollowChange?: (following: boolean) => void }
export default function FollowButton({ currentUserId, targetUserId, initialIsFollowing, onFollowChange }: Props) {
  const [status, setStatus] = useState(initialIsFollowing ? 'following' : 'none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    createClient().from('follow_requests').select('status').eq('requester_id', currentUserId).eq('target_id', targetUserId).eq('status', 'pending').maybeSingle().then(({ data }) => {
      if (active && data) setStatus('pending')
    })
    return () => { active = false }
  }, [currentUserId, targetUserId])
  async function toggle() {
    if (busy || currentUserId === targetUserId) return
    setBusy(true); setError('')
    const supabase = createClient()
    try {
      if (status === 'following') {
        const { error } = await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetUserId })
        if (error) throw error
        setStatus('none'); onFollowChange?.(false)
      } else if (status === 'pending') {
        const { error } = await supabase.from('follow_requests').delete().match({ requester_id: currentUserId, target_id: targetUserId })
        if (error) throw error
        setStatus('none')
      } else {
        const { data, error } = await supabase.rpc('request_follow', { target_user: targetUserId })
        if (error) throw error
        setStatus(data); onFollowChange?.(data === 'following')
      }
    } catch { setError('Could not update follow. Please retry.') }
    finally { setBusy(false) }
  }
  return <span><button className="btn-follow" disabled={busy || currentUserId === targetUserId} onClick={e => { e.stopPropagation(); void toggle() }} aria-label={status === 'pending' ? 'Cancel follow request' : status === 'following' ? 'Unfollow account' : 'Follow account'}>{busy ? 'Saving…' : status === 'pending' ? 'Requested · Cancel' : status === 'following' ? 'Following' : 'Follow'}</button>{error && <span role="alert" className="text-xs">{error}</span>}</span>
}
