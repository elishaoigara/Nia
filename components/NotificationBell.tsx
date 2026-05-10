'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient()
  const [count, setCount] = useState(0)

  useEffect(() => {
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count }) => setCount(count ?? 0))

    const channel = supabase
      .channel('bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => setCount(c => c + 1))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <Link
      href="/notifications"
      className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90"
      style={{ background: count > 0 ? 'linear-gradient(135deg,rgba(255,107,107,0.1),rgba(168,85,247,0.1))' : 'var(--surface-2)' }}
    >
      <Bell size={20} strokeWidth={1.8} style={{ color: count > 0 ? 'var(--nia-violet)' : 'var(--text-secondary)' }} />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-white text-[10px] font-bold rounded-full px-1 anim-pop"
          style={{ background: 'var(--grad-warm)' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
