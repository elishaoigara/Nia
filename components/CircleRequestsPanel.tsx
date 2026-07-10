'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Loader2 } from 'lucide-react'

interface RequestRow {
  id: string
  user_id: string
  profiles: { id: string; username: string; avatar_url: string | null; university?: string | null } | null
}

// Any current member can moderate — circles has no creator_id/admin role
// today, so "whoever's already in the circle can vet who joins" is the
// deliberately simple v1 rather than building out a roles system.
export default function CircleRequestsPanel({ circleId, requests }: { circleId: string; requests: RequestRow[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)

  const visible = requests.filter(r => !hidden.has(r.id))
  if (visible.length === 0) return null

  async function respond(req: RequestRow, accept: boolean) {
    setBusyId(req.id)
    if (accept) {
      await supabase.from('circle_members').insert({ circle_id: circleId, user_id: req.user_id })
      await supabase.from('circle_join_requests').update({ status: 'accepted' }).eq('id', req.id)
    } else {
      await supabase.from('circle_join_requests').update({ status: 'declined' }).eq('id', req.id)
    }
    setHidden(prev => new Set([...prev, req.id]))
    setBusyId(null)
    router.refresh()
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Join requests ({visible.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(req => {
          const p = req.profiles
          const busy = busyId === req.id
          return (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                href={`/profile/${p?.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, textDecoration: 'none' }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: 'var(--grad-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
                  fontSize: 13, flexShrink: 0,
                }}>
                  {p?.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : p?.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p?.username ?? 'Someone'}
                  </p>
                  {p?.university && (
                    <p style={{ fontSize: 11.5, margin: 0, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.university}
                    </p>
                  )}
                </div>
              </Link>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => respond(req, false)}
                  disabled={busy}
                  className="tap-sm"
                  style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                </button>
                <button
                  onClick={() => respond(req, true)}
                  disabled={busy}
                  className="tap-sm"
                  style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--nia-violet)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}