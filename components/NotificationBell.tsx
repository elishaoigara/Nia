'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const supabase = createClient()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    // Centralized fetcher for absolute synchronizations
    const fetchUnreadCount = async () => {
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      setCount(unreadCount ?? 0)
    }

    fetchUnreadCount()

    // Real-time listener capturing both new insertions and status mark updates
    const channel = supabase
      .channel(`bell-${userId}`)
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
        () => setCount(prev => prev + 1)
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
        () => fetchUnreadCount() // Syncs baseline perfectly if user reads data on /notifications
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const hasUnread = count > 0

  return (
    <Link
      href="/notifications"
      className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 tap-sm active:scale-90 select-none bg-(--surface-2)"
      style={hasUnread ? { background: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(168,85,247,0.1))' } : {}}
      aria-label={`${count} unread notifications`}
    >
      <Bell 
        size={20} 
        strokeWidth={hasUnread ? 2.5 : 1.8} 
        style={{ color: hasUnread ? 'var(--nia-violet)' : 'var(--text-secondary)' }} 
      />
      
      {hasUnread && (
        <span
          className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center text-white text-[10px] font-black rounded-full px-1 anim-pop bg-(--grad-warm) shadow-sm"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}