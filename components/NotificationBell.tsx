'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  // Stable client ref — avoids re-subscriptions when parent re-renders
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [count, setCount] = useState(0)

  // FIX (Bug 6): wrap in useCallback so useEffect dependency is stable
  const fetchUnreadCount = useCallback(async () => {
    const { count: unreadCount, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (!error) setCount(unreadCount ?? 0)
  }, [supabase, userId])

  useEffect(() => {
    if (!userId) return

    fetchUnreadCount()

    const channel = supabase
      .channel(`bell-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        // Re-fetch exact count instead of incrementing to avoid
        // double-counting on reconnect/replay
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        // FIX (Bug 5): listening to UPDATE means when the notifications page marks
        // items read in the DB, the bell re-fetches and clears immediately
        () => fetchUnreadCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchUnreadCount])

  const hasUnread = count > 0

  return (
    <Link
      href="/notifications"
      className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 tap-sm active:scale-90 select-none bg-(--surface-2)"
      style={hasUnread ? { background: 'color-mix(in srgb, var(--nia-violet) 10%, transparent)' } : {}}
      aria-label={`${count} unread notification${count !== 1 ? 's' : ''}`}
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
          {/* FIX (Bug 4): was showing "9+" for counts 10-99, hiding the real number.
              The 99+ cap is sufficient — show the real count below that. */}
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}