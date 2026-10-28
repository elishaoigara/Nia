'use client'

import { mediaUrl } from '@/lib/media-url'
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

export default function CircleRequestsPanel({ requests }: { requests: RequestRow[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const visible = requests.filter(r => !hidden.has(r.id))
  if (visible.length === 0) return null

  async function respond(req: RequestRow, accept: boolean) {
    setBusyId(req.id)
    setErrorId(null)
    let ok = true

    if (accept) {
      // Runs as a security-definer function: it verifies the caller is
      // already a member of this circle, then inserts the requester into
      // circle_members and marks the request accepted — all atomically.
      // A plain insert here would fail RLS (a member can't insert a row
      // for someone else's user_id), so it has to go through the RPC.
      const { error } = await supabase.rpc('accept_circle_join_request', { request_id: req.id })
      if (error) { console.error('Accept failed:', error); ok = false }
    } else {
      const { error } = await supabase.from('circle_join_requests').update({ status: 'declined' }).eq('id', req.id)
      if (error) { console.error('Decline failed:', error); ok = false }
    }

    if (ok) {
      setHidden(prev => new Set([...prev, req.id]))
    } else {
      setErrorId(req.id)
    }
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
          const failed = errorId === req.id
          return (
            <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                      ? <img src={mediaUrl(p.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    aria-label="Decline join request"
                    onClick={() => respond(req, false)}
                    disabled={busy}
                    className="tap-sm"
                    style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                  </button>
                  <button
                    aria-label="Accept join request"
                    onClick={() => respond(req, true)}
                    disabled={busy}
                    className="tap-sm"
                    style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--nia-violet)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                  </button>
                </div>
              </div>
              {failed && (
                <p style={{ fontSize: 11.5, color: 'var(--nia-coral)', margin: '0 0 0 44px', fontWeight: 600 }}>
                  Something went wrong — try again.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}