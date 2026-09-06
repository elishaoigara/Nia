'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUnreadCounts(userId: string | null) {
  const supabase = createClient()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) {
      setUnreadMessages(0)
      setUnreadNotifications(0)
      return
    }

    const [{ data: messages }, { count: notifications }] = await Promise.all([
      supabase.rpc('unread_message_count'),
      supabase.from('notifications').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('is_read', false),
    ])

    setUnreadMessages(messages ?? 0)
    setUnreadNotifications(notifications ?? 0)
  }, [supabase, userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const interval = window.setInterval(() => { if (!cancelled) void refresh() }, 30000)
    const timer = window.setTimeout(() => {
      if (!cancelled) void refresh()
    }, 0)

    const channel = supabase.channel(`unread-badges-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}`,
      }, () => { if (!cancelled) void refresh() })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
      }, () => { if (!cancelled) void refresh() })
      .subscribe()

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [refresh, supabase, userId])

  return { unreadMessages, unreadNotifications, refresh }
}
