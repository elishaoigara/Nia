import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Heart, MessageCircle, Users, Bell, UserPlus, Repeat2, Smile } from 'lucide-react'
import Link from 'next/link'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  like:        { icon: Heart,          color: '#ef4444',                    bg: 'rgba(239,68,68,0.1)' },
  comment:     { icon: MessageCircle,  color: 'var(--nia-violet)',           bg: 'rgba(168,85,247,0.1)' },
  circle_join: { icon: Users,          color: 'var(--nia-mint)',             bg: 'rgba(107,203,119,0.1)' },
  follow:      { icon: UserPlus,       color: 'var(--nia-sky)',              bg: 'rgba(78,205,196,0.1)' },
  repost:      { icon: Repeat2,        color: 'var(--nia-mint)',             bg: 'rgba(107,203,119,0.1)' },
  reaction:    { icon: Smile,          color: '#f59e0b',                    bg: 'rgba(245,158,11,0.1)' },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, actor:actor_id (id, username, avatar_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60)

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Group by date
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  function dateGroup(created_at: string) {
    const d = new Date(created_at).toDateString()
    if (d === today) return 'Today'
    if (d === yesterday) return 'Yesterday'
    return new Date(created_at).toLocaleDateString('en', { month: 'long', day: 'numeric' })
  }

  const grouped: Record<string, any[]> = {}
  for (const n of notifications ?? []) {
    const g = dateGroup(n.created_at)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(n)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))' }}
        >
          <Bell size={20} style={{ color: 'var(--nia-violet)' }} />
        </div>
        <div>
          <h1 className="font-extrabold text-2xl">Notifications</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>What's been happening</p>
        </div>
      </div>

      {!notifications || notifications.length === 0 ? (
        <div className="card text-center py-20 space-y-3">
          <div className="text-5xl">🔔</div>
          <p className="font-bold text-lg">All quiet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>We'll notify you when something happens</p>
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-bold px-1" style={{ color: 'var(--text-tertiary)' }}>{group}</p>
            {items.map((n: any) => {
              const meta = ICONS[n.type] ?? { icon: Bell, color: 'var(--text-secondary)', bg: 'var(--surface-2)' }
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  className="card flex items-start gap-3 p-4 transition-all"
                  style={!n.is_read ? {
                    borderLeft: '3px solid var(--nia-violet)',
                    background: 'linear-gradient(135deg,rgba(168,85,247,0.04),transparent)',
                  } : {}}
                >
                  {/* Type icon */}
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                    <Icon
                      size={16}
                      style={{ color: meta.color }}
                      fill={n.type === 'like' || n.type === 'reaction' ? meta.color : 'none'}
                    />
                  </div>

                  {/* Actor avatar */}
                  <Link href={`/profile/${n.actor?.id}`} className="shrink-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs" style={{ background: 'var(--grad-brand)' }}>
                      {n.actor?.avatar_url
                        ? <img src={n.actor.avatar_url} className="w-full h-full object-cover" alt="" />
                        : n.actor?.username?.[0]?.toUpperCase()
                      }
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <Link href={`/profile/${n.actor?.id}`} className="font-bold hover:underline">
                        @{n.actor?.username}
                      </Link>
                      {' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{n.message}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(n.created_at)}</p>
                  </div>

                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--nia-violet)' }} />
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </main>
  )
}