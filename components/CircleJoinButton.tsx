'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function CircleJoinButton({
  circleId,
  currentUserId,
  isPrivate,
  initialIsMember,
  initialRequestStatus = null,
  accentColor = 'var(--nia-violet)',
}: {
  circleId: string
  currentUserId: string
  isPrivate: boolean
  initialIsMember: boolean
  initialRequestStatus?: 'pending' | null
  accentColor?: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [isMember, setIsMember] = useState(initialIsMember)
  const [requestStatus, setRequestStatus] = useState<'pending' | null>(initialRequestStatus)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)

    if (isMember) {
      await supabase.from('circle_members').delete().match({ circle_id: circleId, user_id: currentUserId })
      setIsMember(false)
    } else if (isPrivate) {
      if (requestStatus === 'pending') {
        await supabase.from('circle_join_requests').delete().match({ circle_id: circleId, user_id: currentUserId })
        setRequestStatus(null)
      } else {
        await supabase.from('circle_join_requests')
          .upsert({ circle_id: circleId, user_id: currentUserId, status: 'pending' }, { onConflict: 'circle_id,user_id' })
        setRequestStatus('pending')
      }
    } else {
      await supabase.from('circle_members').insert({ circle_id: circleId, user_id: currentUserId })
      setIsMember(true)
    }

    setLoading(false)
    router.refresh()
  }

  const isNeutral = isMember || requestStatus === 'pending'
  const label = isMember ? 'Leave' : isPrivate ? (requestStatus === 'pending' ? 'Requested — cancel?' : 'Request to join') : 'Join circle'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="tap-sm"
      style={{
        padding: '9px 18px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13.5,
        cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1,
        background: isNeutral ? 'var(--surface-2)' : accentColor,
        color: isNeutral ? 'var(--text-secondary)' : '#fff',
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {label}
    </button>
  )
}