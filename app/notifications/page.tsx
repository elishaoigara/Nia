import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Heart, MessageCircle, Users, Bell } from 'lucide-react'
import Link from 'next/link'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const ICONS: Record<string, React.ReactNode> = {
  like: <Heart size={16} className="text-red-500" fill="currentColor" />,
  comment: <MessageCircle size={16} className="text-blue-500" />,
  circle_join: <Users size={16} className="text-purple-500" />,
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:actor_id (id, username, avatar_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-1">Notifications</h1>
        <p className="text-zinc-400">What's been happening</p>
      </div>

      {!notifications || notifications.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Bell size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">We'll let you know when something happens</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                !n.is_read
                  ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900'
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
              }`}
            >
              {/* Actor avatar */}
              <Link href={`/profile/${n.actor?.id}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden">
                  {n.actor?.avatar_url ? (
                    <img src={n.actor.avatar_url} className="w-9 h-9 object-cover" alt="" />
                  ) : (
                    n.actor?.username?.[0]?.toUpperCase() ?? '?'
                  )}
                </div>
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="flex-shrink-0">{ICONS[n.type] ?? <Bell size={16} />}</span>
                  <Link href={`/profile/${n.actor?.id}`} className="font-semibold text-sm hover:underline">
                    @{n.actor?.username}
                  </Link>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{n.message}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>

              {/* Unread dot */}
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
