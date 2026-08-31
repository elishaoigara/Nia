'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ShieldCheck, UserX, VolumeX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SafetyProfile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export default function SafetyPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<SafetyProfile[]>([])
  const [mutedIds, setMutedIds] = useState<string[]>([])
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadSafetyLists = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const [mutesResponse, blocksResponse] = await Promise.all([
      supabase.from('mutes').select('muted_id').eq('muter_id', user.id),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    ])
    if (mutesResponse.error || blocksResponse.error) {
      setError('Your safety lists could not be loaded. Please try again.')
      setLoading(false)
      return
    }

    const nextMutedIds = (mutesResponse.data ?? []).map(row => row.muted_id)
    const nextBlockedIds = (blocksResponse.data ?? []).map(row => row.blocked_id)
    const ids = [...new Set([...nextMutedIds, ...nextBlockedIds])]
    setMutedIds(nextMutedIds)
    setBlockedIds(nextBlockedIds)

    if (ids.length > 0) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', ids)
      if (profileError) setError('Some account details could not be loaded.')
      setProfiles((data ?? []) as SafetyProfile[])
    } else {
      setProfiles([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSafetyLists() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSafetyLists])

  async function removeFromList(kind: 'mute' | 'block', profileId: string) {
    setSavingId(`${kind}:${profileId}`)
    setError('')
    const table = kind === 'mute' ? 'mutes' : 'blocks'
    const targetColumn = kind === 'mute' ? 'muted_id' : 'blocked_id'
    const { error: deleteError } = await supabase.from(table).delete().eq(targetColumn, profileId)
    if (deleteError) {
      setError(`This account could not be un${kind}d. Please try again.`)
    } else if (kind === 'mute') {
      setMutedIds(current => current.filter(id => id !== profileId))
    } else {
      setBlockedIds(current => current.filter(id => id !== profileId))
    }
    setSavingId(null)
  }

  function profileFor(id: string) {
    return profiles.find(profile => profile.id === id)
  }

  const sections = [
    { kind: 'mute' as const, title: 'Muted accounts', description: 'Their posts are hidden from your feed.', ids: mutedIds, icon: VolumeX },
    { kind: 'block' as const, title: 'Blocked accounts', description: 'They cannot send you new messages.', ids: blockedIds, icon: UserX },
  ]

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      <header className="flex items-start gap-3">
        <Link href="/settings" className="settings-back" aria-label="Back to settings"><ArrowLeft size={18} /></Link>
        <div>
          <p className="home-eyebrow">Your boundaries</p>
          <h1 className="text-2xl font-extrabold">Safety & support</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Control who appears in your space and report posts, comments, profiles, or conversations from their menus.</p>
        </div>
      </header>

      <section className="card flex items-start gap-3">
        <ShieldCheck size={22} style={{ color: 'var(--nia-violet)', flexShrink: 0 }} />
        <div>
          <h2 className="font-extrabold">Need help with content?</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Open the three-dot menu on a post, comment, or profile to report a concern. Profile and post menus also let you mute or block an account. Reports go to Nia’s moderation queue.</p>
        </div>
      </section>

      {error && <p role="alert" className="card text-sm font-semibold" style={{ color: 'var(--nia-coral)' }}>{error}</p>}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin" style={{ color: 'var(--nia-violet)' }} /></div>
      ) : sections.map(({ kind, title, description, ids, icon: Icon }) => (
        <section key={kind} className="space-y-3" aria-labelledby={`safety-${kind}`}>
          <div>
            <h2 id={`safety-${kind}`} className="flex items-center gap-2 font-extrabold"><Icon size={17} style={{ color: 'var(--nia-violet)' }} />{title}</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
          </div>
          {ids.length === 0 ? (
            <div className="card text-sm" style={{ color: 'var(--text-tertiary)' }}>No {title.toLowerCase()}.</div>
          ) : (
            <div className="settings-card">
              {ids.map(id => {
                const profile = profileFor(id)
                return (
                  <div key={id} className="settings-row">
                    <div className="settings-account-avatar">
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.username?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="settings-row-copy">
                      <p>{profile?.full_name || `@${profile?.username ?? 'account'}`}</p>
                      <span>@{profile?.username ?? id.slice(0, 8)}</span>
                    </div>
                    <button type="button" className="settings-outline-button" disabled={savingId === `${kind}:${id}`} onClick={() => removeFromList(kind, id)}>
                      {savingId === `${kind}:${id}` ? 'Saving…' : kind === 'mute' ? 'Unmute' : 'Unblock'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </main>
  )
}
