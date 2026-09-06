'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
interface NotificationBellProps {
  unreadCount: number
}

export default function NotificationBell({ unreadCount }: NotificationBellProps) {
  const count = unreadCount
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