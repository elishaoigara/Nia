import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Heart, MessageCircle, Users, UserPlus, Repeat2, Smile } from 'lucide-react'
import Link from 'next/link'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const ICONS: Record<string, { icon: any; color: string }> = {
  like:        { icon: Heart,         color: '#e0245e'              },
  comment:     { icon: MessageCircle, color: 'var(--nia-violet)'    },
  circle_join: { icon: Users,         color: 'var(--nia-mint)'      },
  follow:      { icon: UserPlus,      color: 'var(--nia-sky)'       },
  repost:      { icon: Repeat2,       color: 'var(--nia-mint)'      },
  reaction:    { icon: Smile,         color: '#f59e0b'              },
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

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

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
    <main className="feed-container">
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px' }}>Activity</h1>
      </div>

      {!notifications || notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <p style={{ fontWeight: 700, fontSize: 17 }}>All quiet</p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 6 }}>
            We'll notify you when something happens
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            {/* Date group label */}
            <div style={{
              padding: '12px 16px 6px',
              fontSize: 13, fontWeight: 700,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.2px',
            }}>
              {group}
            </div>

            {items.map((n: any) => {
              const meta = ICONS[n.type] ?? { icon: null, color: 'var(--text-secondary)' }
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--divider)',
                    background: !n.is_read ? 'rgba(168,85,247,0.035)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Actor avatar with icon overlay */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Link href={`/profile/${n.actor?.id}`}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--grad-brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 15,
                      }}>
                        {n.actor?.avatar_url
                          ? <img src={n.actor.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : n.actor?.username?.[0]?.toUpperCase()
                        }
                      </div>
                    </Link>
                    {/* Type icon badge */}
                    {Icon && (
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 20, height: 20, borderRadius: '50%',
                        background: meta.color,
                        border: '2px solid var(--surface-0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={10} color="white" fill={n.type === 'like' ? 'white' : 'none'} />
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, lineHeight: 1.4 }}>
                      <Link
                        href={`/profile/${n.actor?.id}`}
                        style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--text-primary)' }}
                      >
                        {n.actor?.username}
                      </Link>
                      {' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{n.message}</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--nia-violet)', flexShrink: 0,
                    }} />
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
