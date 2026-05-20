import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, ArrowRight } from 'lucide-react'

export default async function MessagesIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch recent conversations: last message per unique partner
  const { data: sent } = await supabase
    .from('messages')
    .select('recipient_id, created_at, content, profiles:recipient_id (id, username, avatar_url, full_name)')
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })

  const { data: received } = await supabase
    .from('messages')
    .select('sender_id, created_at, content, is_read, profiles:sender_id (id, username, avatar_url, full_name)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  // Build a map of partner → most recent message
  const convoMap = new Map<string, { profile: any; lastMsg: string; time: string; unread: boolean }>()

  for (const m of sent ?? []) {
    const pid = m.recipient_id
    if (!convoMap.has(pid)) {
      convoMap.set(pid, {
        profile: (m as any).profiles,
        lastMsg: m.content ?? '📎 Media',
        time: m.created_at,
        unread: false,
      })
    }
  }

  for (const m of received ?? []) {
    const pid = m.sender_id
    const existing = convoMap.get(pid)
    if (!existing || new Date(m.created_at) > new Date(existing.time)) {
      convoMap.set(pid, {
        profile: (m as any).profiles,
        lastMsg: m.content ?? '📎 Media',
        time: m.created_at,
        unread: !(m as any).is_read,
      })
    }
  }

  const convos = Array.from(convoMap.values()).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <main className="w-full max-w-xl px-0 py-2">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--grad-brand)' }}
        >
          <MessageSquare size={17} className="text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-xl leading-tight">Messages</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Your direct conversations</p>
        </div>
      </div>

      {/* Conversation list */}
      {convos.length === 0 ? (
        <div className="text-center py-24 space-y-3 px-6">
          <div className="text-5xl">💬</div>
          <p className="font-bold text-lg">No messages yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Visit someone's profile and tap <strong>Message</strong> to start a conversation.
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white mt-2"
            style={{ background: 'var(--grad-brand)' }}
          >
            Find people <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div>
          {convos.map(({ profile, lastMsg, time, unread }) => {
            if (!profile) return null
            return (
              <Link
                key={profile.id}
                href={`/messages/${profile.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: unread ? 'rgba(168,85,247,0.03)' : 'transparent',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ background: 'var(--grad-brand)' }}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : profile.username?.[0]?.toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {profile.full_name || `@${profile.username}`}
                    </p>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm truncate" style={{ color: unread ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: unread ? 600 : 400 }}>
                      {lastMsg}
                    </p>
                    {unread && (
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--nia-violet)' }} />
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
